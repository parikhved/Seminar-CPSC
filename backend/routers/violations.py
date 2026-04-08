from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models import ProductListing, Recall, User, Violation
from schemas import (
    DetectedListingOut,
    EbayScanRequest,
    EbayScanResponse,
    RecallSummary,
    ViolationCreate,
    ViolationCreateResponse,
    ViolationOut,
)
from services import (
    EbayApiError,
    EbayClient,
    EbayConfigError,
    build_recall_query,
    score_listing_match,
    send_violation_notification,
)

router = APIRouter(prefix="/api/violations", tags=["Violations"])
ebay_client = EbayClient()


def _clean_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _validate_required_fields(payload: ViolationCreate) -> None:
    required_fields = {
        "violationStatus": payload.violationStatus,
        "message": payload.message,
        "investigatorNotes": payload.investigatorNotes,
        "listing.externalListingId": payload.listing.externalListingId,
        "listing.listingTitle": payload.listing.listingTitle,
        "listing.listingURL": payload.listing.listingURL,
        "listing.marketplaceName": payload.listing.marketplaceName,
        "listing.sellerEmail": payload.listing.sellerEmail,
    }

    missing = [
        field_name
        for field_name, field_value in required_fields.items()
        if not _clean_text(field_value)
    ]

    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All required violation fields must be completed before the record can be logged.",
        )


def _is_valid_email(value: str) -> bool:
    if "@" not in value:
        return False
    local_part, _, domain = value.partition("@")
    return bool(local_part and "." in domain)


def _serialize_price(value: Optional[Decimal]) -> Optional[float]:
    if value is None:
        return None
    return float(value)


def _build_violation_out(violation: Violation) -> ViolationOut:
    investigator = violation.investigator
    recipient = violation.recipient
    recall = violation.recall
    listing = violation.listing

    investigator_name = None
    if investigator:
        investigator_name = f"{investigator.firstName} {investigator.lastName}"

    recipient_name = None
    if recipient:
        recipient_name = f"{recipient.firstName} {recipient.lastName}"

    return ViolationOut(
        violationID=violation.violationID,
        isViolation=bool(violation.isViolation),
        violationStatus=violation.violationStatus,
        message=violation.message,
        dateDetected=violation.dateDetected,
        investigatorNotes=violation.investigatorNotes,
        investigatorID=violation.investigatorID,
        investigatorName=investigator_name,
        receivedByID=violation.receivedByID,
        receivedByName=recipient_name,
        recallID=violation.recallID,
        recallProductName=recall.productName if recall else None,
        listingID=violation.listingID,
        externalListingId=listing.externalListingId if listing else None,
        listingTitle=listing.listingTitle if listing else None,
        listingURL=listing.listingURL if listing else None,
        marketplaceName=listing.marketplaceName if listing else None,
        sellerName=listing.sellerName if listing else None,
        sellerEmail=listing.sellerEmail if listing else None,
        price=_serialize_price(listing.price) if listing else None,
        currency=getattr(listing, "currency", None) if listing else None,
    )


@router.get("", response_model=list[ViolationOut])
def list_violations(db: Session = Depends(get_db)):
    violations = (
        db.query(Violation)
        .order_by(Violation.dateDetected.desc(), Violation.violationID.desc())
        .all()
    )
    return [_build_violation_out(violation) for violation in violations]


@router.post("/scan-ebay", response_model=EbayScanResponse)
def scan_ebay_listings(payload: EbayScanRequest, db: Session = Depends(get_db)):
    recall = db.query(Recall).filter(Recall.recallID == payload.recallID).first()
    if not recall:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recall ID not found.",
        )

    query = _clean_text(payload.query) or build_recall_query(recall)
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A recall with a product name and/or manufacturer is required to search eBay.",
        )

    try:
        listings = ebay_client.search_items(query=query, limit=payload.limit)
    except EbayConfigError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except EbayApiError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    candidates = []
    for listing in listings:
        match_result = score_listing_match(recall, listing, threshold=payload.minScore)
        candidates.append(
            DetectedListingOut(
                externalListingId=listing.get("externalListingId"),
                listingTitle=listing.get("listingTitle"),
                listingURL=listing.get("listingURL"),
                marketplaceName=listing.get("marketplaceName") or "eBay",
                sellerName=listing.get("sellerName"),
                listingDate=listing.get("listingDate"),
                price=listing.get("price"),
                currency=listing.get("currency"),
                listingDesc=listing.get("listingDesc"),
                address=listing.get("address"),
                imageURL=listing.get("imageURL"),
                matchScore=match_result["matchScore"],
                matchedTerms=match_result["matchedTerms"],
                isDetectedMatch=match_result["isDetectedMatch"],
            )
        )

    candidates.sort(key=lambda item: item.matchScore, reverse=True)

    return EbayScanResponse(
        recall=RecallSummary(
            recallID=recall.recallID,
            productName=recall.productName,
            manufacturerName=recall.manufacturerName,
            hazard=recall.hazard,
        ),
        query=query,
        detectedCount=sum(1 for candidate in candidates if candidate.isDetectedMatch),
        candidates=candidates,
    )


@router.post("", response_model=ViolationCreateResponse, status_code=status.HTTP_201_CREATED)
def create_violation(payload: ViolationCreate, db: Session = Depends(get_db)):
    _validate_required_fields(payload)

    recall = db.query(Recall).filter(Recall.recallID == payload.recallID).first()
    if not recall:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recall ID not found.",
        )

    investigator = db.query(User).filter(User.userID == payload.investigatorID).first()
    if not investigator or investigator.role not in {"Investigator", "Manager"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Investigator ID is invalid or the user does not have investigation access.",
        )

    seller_email = _clean_text(payload.listing.sellerEmail)
    if not seller_email or not _is_valid_email(seller_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid seller email is required before a violation can be logged and notified.",
        )

    seller_user = None
    if payload.receivedByID is not None:
        seller_user = db.query(User).filter(User.userID == payload.receivedByID).first()
        if not seller_user or seller_user.role != "Seller":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="receivedByID must reference a Seller in the system.",
            )
    else:
        seller_user = (
            db.query(User)
            .filter(User.email == seller_email.lower(), User.role == "Seller")
            .first()
        )

    existing_listing = (
        db.query(ProductListing)
        .filter(
            or_(
                ProductListing.externalListingId == payload.listing.externalListingId,
                ProductListing.listingURL == payload.listing.listingURL,
            )
        )
        .first()
    )

    if existing_listing:
        listing = existing_listing
        listing.listingTitle = _clean_text(payload.listing.listingTitle)
        listing.listingDate = payload.listing.listingDate
        listing.listingURL = _clean_text(payload.listing.listingURL)
        listing.price = payload.listing.price
        listing.currency = _clean_text(payload.listing.currency)
        listing.listingDesc = _clean_text(payload.listing.listingDesc)
        listing.address = _clean_text(payload.listing.address)
        listing.marketplaceName = _clean_text(payload.listing.marketplaceName) or "eBay"
        listing.externalListingId = _clean_text(payload.listing.externalListingId)
        listing.sellerName = _clean_text(payload.listing.sellerName)
        listing.sellerEmail = seller_email.lower()
        listing.imageURL = _clean_text(payload.listing.imageURL)
        listing.isActive = payload.listing.isActive
        listing.sellerUserID = seller_user.userID if seller_user else None
    else:
        listing = ProductListing(
            listingTitle=_clean_text(payload.listing.listingTitle),
            listingDate=payload.listing.listingDate,
            listingURL=_clean_text(payload.listing.listingURL),
            price=payload.listing.price,
            currency=_clean_text(payload.listing.currency),
            listingDesc=_clean_text(payload.listing.listingDesc),
            address=_clean_text(payload.listing.address),
            marketplaceName=_clean_text(payload.listing.marketplaceName) or "eBay",
            externalListingId=_clean_text(payload.listing.externalListingId),
            sellerName=_clean_text(payload.listing.sellerName),
            sellerEmail=seller_email.lower(),
            imageURL=_clean_text(payload.listing.imageURL),
            isActive=payload.listing.isActive,
            sellerUserID=seller_user.userID if seller_user else None,
        )
        db.add(listing)
        db.flush()

    duplicate_violation = (
        db.query(Violation)
        .filter(
            Violation.recallID == recall.recallID,
            Violation.listingID == listing.listingID,
            Violation.isViolation.is_(True),
        )
        .first()
    )
    if duplicate_violation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A violation has already been logged for this recalled product and marketplace listing.",
        )

    violation = Violation(
        isViolation=True,
        violationStatus=_clean_text(payload.violationStatus),
        message=_clean_text(payload.message),
        dateDetected=date.today(),
        investigatorNotes=_clean_text(payload.investigatorNotes),
        investigatorID=investigator.userID,
        receivedByID=seller_user.userID if seller_user else None,
        recallID=recall.recallID,
        listingID=listing.listingID,
    )

    db.add(violation)
    db.commit()
    db.refresh(violation)

    notification = send_violation_notification(
        recipient_email=seller_email.lower(),
        recipient_name=_clean_text(payload.listing.sellerName) or "Seller",
        recall_name=recall.productName,
        listing_title=listing.listingTitle or "Marketplace listing",
        listing_url=listing.listingURL or "",
        violation_status=violation.violationStatus or "Logged",
        message=violation.message or "",
        investigator_notes=violation.investigatorNotes or "",
    )

    return ViolationCreateResponse(
        **_build_violation_out(violation).model_dump(),
        notificationStatus=notification.status,
        notificationDetail=notification.detail,
    )
