from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Adjudication, Message, ProductListing, Recall, ReminderEmailLog, SellerResponse, ShortList, User, Violation
from schemas import (
    ArchiveUpdate,
    DetectedListingOut,
    EbayScanRequest,
    EbayScanResponse,
    RESPONSE_TEXT_MAX,
    RESPONSE_TYPE_OPTIONS,
    SUPPORTING_URL_MAX,
    RecallSummary,
    SellerResponseCreate,
    SellerResponseListItem,
    SellerResponseOut,
    SellerViolationNoticeOut,
    ViolationCreate,
    ViolationCreateResponse,
    ViolationOut,
    ViolationShortlistSearchRequest,
    ViolationShortlistSearchResponse,
    ViolationStatusUpdate,
    ViolationUpdate,
)
from services import (
    EbayApiError,
    EbayClient,
    EbayConfigError,
    build_recall_query,
    score_listing_match,
    send_violation_notification,
    send_sla_reminder,
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
        "evidenceURL": payload.evidenceURL,
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


def _is_valid_supporting_url(value: str) -> bool:
    cleaned = value.strip()
    return (
        cleaned.startswith("https://")
        and " " not in cleaned
        and len(cleaned) <= SUPPORTING_URL_MAX
    )


def _serialize_price(value: Optional[Decimal]) -> Optional[float]:
    if value is None:
        return None
    return float(value)


def _raise_schema_error(exc: Exception, db: Session) -> None:
    db.rollback()
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "Violation data could not be loaded because the database schema is behind the Sprint 2 app. "
            "Run database/migrations/2026-04-08_sprint2_sync.sql "
            "(or the three individual Sprint 2 migration files) and redeploy against the updated database."
        ),
    ) from exc


def _has_required_value(value: object) -> bool:
    if isinstance(value, str) or value is None:
        return bool(_clean_text(value))
    return value is not None


def _violation_documentation_complete(violation: Violation) -> bool:
    recall = violation.recall
    listing = violation.listing

    seller_identifier = None
    if listing:
        seller_identifier = listing.sellerUserID or listing.sellerEmail or listing.sellerName

    required_values = [
        violation.recallID,
        recall.productName if recall else None,
        listing.marketplaceName if listing else None,
        seller_identifier,
        violation.dateDetected,
        violation.message,
        violation.violationStatus,
    ]
    return all(_has_required_value(value) for value in required_values)


EDITABLE_STATUSES = {
    "unresolved": "Unresolved",
    "under review": "Under Review",
    "pending seller response": "Pending Seller Response",
    "seller responded": "Seller Responded",
    "resolved": "Resolved",
}


def _validate_editable_status(value: str) -> str:
    normalized = _clean_text(value)
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Violation status is required.",
        )

    lowered = normalized.lower()
    canonical = EDITABLE_STATUSES.get(lowered)
    if not canonical:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Violation status must be one of: {', '.join(EDITABLE_STATUSES.values())}.",
        )

    return canonical


def _find_seller_user_by_email(db: Session, seller_email: Optional[str]) -> Optional[User]:
    normalized_email = _clean_text(seller_email)
    if not normalized_email or not _is_valid_email(normalized_email):
        return None

    return (
        db.query(User)
        .filter(User.email == normalized_email.lower(), User.role == "Seller")
        .first()
    )


def _upsert_listing_from_marketplace_result(
    db: Session,
    listing_data: dict,
    seller_user: Optional[User] = None,
) -> ProductListing:
    external_listing_id = _clean_text(listing_data.get("externalListingId"))
    listing_url = _clean_text(listing_data.get("listingURL"))
    seller_email = _clean_text(listing_data.get("sellerEmail"))

    filters = []
    if external_listing_id:
        filters.append(ProductListing.externalListingId == external_listing_id)
    if listing_url:
        filters.append(ProductListing.listingURL == listing_url)

    listing = db.query(ProductListing).filter(or_(*filters)).first() if filters else None

    if listing:
        listing.listingTitle = _clean_text(listing_data.get("listingTitle")) or listing.listingTitle
        listing.listingDate = listing_data.get("listingDate") or listing.listingDate
        listing.listingURL = listing_url or listing.listingURL
        listing.price = listing_data.get("price") if listing_data.get("price") is not None else listing.price
        listing.currency = _clean_text(listing_data.get("currency")) or listing.currency
        listing.listingDesc = _clean_text(listing_data.get("listingDesc")) or listing.listingDesc
        listing.address = _clean_text(listing_data.get("address")) or listing.address
        listing.marketplaceName = _clean_text(listing_data.get("marketplaceName")) or listing.marketplaceName or "eBay"
        listing.externalListingId = external_listing_id or listing.externalListingId
        listing.sellerName = _clean_text(listing_data.get("sellerName")) or listing.sellerName
        listing.sellerEmail = seller_email.lower() if seller_email else listing.sellerEmail
        listing.imageURL = _clean_text(listing_data.get("imageURL")) or listing.imageURL
        listing.isActive = bool(listing_data.get("isActive", True))
        if seller_user:
            listing.sellerUserID = seller_user.userID
        return listing

    listing = ProductListing(
        listingTitle=_clean_text(listing_data.get("listingTitle")),
        listingDate=listing_data.get("listingDate"),
        listingURL=listing_url,
        price=listing_data.get("price"),
        currency=_clean_text(listing_data.get("currency")),
        listingDesc=_clean_text(listing_data.get("listingDesc")),
        address=_clean_text(listing_data.get("address")),
        marketplaceName=_clean_text(listing_data.get("marketplaceName")) or "eBay",
        externalListingId=external_listing_id,
        sellerName=_clean_text(listing_data.get("sellerName")),
        sellerEmail=seller_email.lower() if seller_email else None,
        imageURL=_clean_text(listing_data.get("imageURL")),
        isActive=bool(listing_data.get("isActive", True)),
        sellerUserID=seller_user.userID if seller_user else None,
    )
    db.add(listing)
    db.flush()
    return listing


def _response_status(violation: Violation) -> str:
    return "Responded" if violation.seller_responses else "No Response"


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

    short_list_id = None
    if recall and recall.shortlist_entry:
        short_list_id = recall.shortlist_entry.shortListID

    return ViolationOut(
        violationID=violation.violationID,
        isViolation=bool(violation.isViolation),
        violationStatus=violation.violationStatus,
        responseStatus=_response_status(violation),
        message=violation.message,
        evidenceURL=violation.evidenceURL,
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
        shortListID=short_list_id,
        productName=recall.productName if recall else None,
        matchConfirmation=bool(violation.isViolation),
        URL=listing.listingURL if listing else None,
        seller=(listing.sellerName or listing.sellerEmail) if listing else None,
        sellerID=(listing.sellerUserID if listing else None) or violation.receivedByID,
        violationDate=violation.dateDetected,
        violationDescription=violation.message,
        status=violation.violationStatus,
        marketplaceSource=listing.marketplaceName if listing else None,
        documentationComplete=_violation_documentation_complete(violation),
        isArchived=bool(violation.isArchived),
    )


def _get_seller_user(db: Session, seller_user_id: int) -> User:
    seller = db.query(User).filter(User.userID == seller_user_id).first()
    if not seller or seller.role != "Seller":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller access requires a valid Seller account.",
        )
    return seller


def _get_notice_for_seller(db: Session, seller_user_id: int, violation_id: int) -> Violation:
    violation = (
        db.query(Violation)
        .join(ProductListing, Violation.listingID == ProductListing.listingID)
        .filter(
            Violation.violationID == violation_id,
            or_(
                Violation.receivedByID == seller_user_id,
                ProductListing.sellerUserID == seller_user_id,
            ),
        )
        .first()
    )
    if not violation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Violation notice not found for this seller.",
        )
    return violation


def _build_seller_notice_out(violation: Violation, seller_user_id: int) -> SellerViolationNoticeOut:
    recall = violation.recall
    listing = violation.listing
    investigator = violation.investigator
    latest_response = (
        sorted(violation.seller_responses, key=lambda r: r.dateResponded, reverse=True)[0]
        if violation.seller_responses
        else None
    )

    investigator_name = None
    if investigator:
        investigator_name = f"{investigator.firstName} {investigator.lastName}"

    return SellerViolationNoticeOut(
        violationID=violation.violationID,
        violationStatus=violation.violationStatus,
        responseStatus=_response_status(violation),
        message=violation.message,
        evidenceURL=violation.evidenceURL,
        dateDetected=violation.dateDetected,
        recallID=violation.recallID,
        recallProductName=recall.productName if recall else None,
        hazard=recall.hazard if recall else None,
        listingID=violation.listingID,
        listingTitle=listing.listingTitle if listing else None,
        listingURL=listing.listingURL if listing else None,
        marketplaceName=listing.marketplaceName if listing else None,
        sellerEmail=listing.sellerEmail if listing else None,
        investigatorName=investigator_name,
        responseID=latest_response.responseID if latest_response else None,
        sellerResponse=latest_response.message.messagecontent if (latest_response and latest_response.message) else None,
        responseEvidenceURL=latest_response.evidenceURL if latest_response else None,
        dateResponded=latest_response.dateResponded if latest_response else None,
    )


def _build_response_list_item(r: SellerResponse) -> SellerResponseListItem:
    msg = r.message
    violation = r.violation
    listing = violation.listing if violation else None
    recall = violation.recall if violation else None
    return SellerResponseListItem(
        responseID=r.responseID,
        violationID=r.violationID,
        responseType=r.responseType,
        evidenceURL=r.evidenceURL,
        dateResponded=r.dateResponded,
        sellerUserID=r.sellerUserID,
        sellerEmail=msg.senttoemailaddress if msg else None,
        responseText=msg.messagecontent if msg else None,
        violationProductName=recall.productName if recall else None,
        violationListingTitle=listing.listingTitle if listing else None,
        violationDateDetected=violation.dateDetected if violation else None,
        violationStatus=violation.violationStatus if violation else None,
    )


@router.get("", response_model=list[ViolationOut])
def list_violations(
    sellerUserID: Optional[int] = None,
    investigatorUserID: Optional[int] = None,
    includeArchived: bool = Query(False),
    db: Session = Depends(get_db),
):
    try:
        query = (
            db.query(Violation)
            .options(
                joinedload(Violation.investigator),
                joinedload(Violation.recipient),
                joinedload(Violation.listing),
                joinedload(Violation.recall).joinedload(Recall.shortlist_entry),
                joinedload(Violation.seller_responses),
            )
        )

        if not includeArchived:
            query = query.filter(Violation.isArchived.is_(False))

        if sellerUserID is not None:
            query = (
                query
                .join(ProductListing, Violation.listingID == ProductListing.listingID)
                .filter(
                    or_(
                        Violation.receivedByID == sellerUserID,
                        ProductListing.sellerUserID == sellerUserID,
                    )
                )
            )

        if investigatorUserID is not None:
            query = query.filter(Violation.investigatorID == investigatorUserID)

        violations = query.order_by(Violation.dateDetected.desc(), Violation.violationID.desc()).all()
        return [_build_violation_out(violation) for violation in violations]
    except (ProgrammingError, OperationalError) as exc:
        _raise_schema_error(exc, db)


@router.get("/responses", response_model=list[SellerResponseListItem])
def list_seller_responses(db: Session = Depends(get_db)):
    try:
        responses = (
            db.query(SellerResponse)
            .options(
                joinedload(SellerResponse.message),
                joinedload(SellerResponse.violation).joinedload(Violation.recall),
                joinedload(SellerResponse.violation).joinedload(Violation.listing),
            )
            .order_by(SellerResponse.dateResponded.desc(), SellerResponse.responseID.desc())
            .all()
        )
        return [_build_response_list_item(r) for r in responses]
    except (ProgrammingError, OperationalError) as exc:
        _raise_schema_error(exc, db)


@router.post("/search-shortlist", response_model=ViolationShortlistSearchResponse)
def search_shortlist_for_violations(
    payload: ViolationShortlistSearchRequest,
    db: Session = Depends(get_db),
):
    investigator = db.query(User).filter(User.userID == payload.investigatorID).first()
    if not investigator or investigator.role not in {"Investigator", "Manager"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Shortlist searches require a valid investigator or manager account.",
        )

    shortlist_entries = (
        db.query(ShortList)
        .options(joinedload(ShortList.recall))
        .order_by(ShortList.shortListDate.desc(), ShortList.shortListID.desc())
        .all()
    )

    scanned_keywords: list[str] = []
    new_violations_found = 0
    duplicate_matches_skipped = 0

    try:
        for entry in shortlist_entries:
            recall = entry.recall
            if not recall:
                continue

            query = build_recall_query(recall) or _clean_text(recall.productName)
            if not query:
                continue

            scanned_keywords.append(query)
            listings = ebay_client.search_items(query=query, limit=payload.limitPerRecall)

            for listing_data in listings:
                match_result = score_listing_match(recall, listing_data, threshold=payload.minScore)
                if not match_result["isDetectedMatch"]:
                    continue

                seller_user = _find_seller_user_by_email(db, listing_data.get("sellerEmail"))
                listing = _upsert_listing_from_marketplace_result(db, listing_data, seller_user=seller_user)

                duplicate_violation = (
                    db.query(Violation)
                    .filter(
                        Violation.recallID == recall.recallID,
                        Violation.listingID == listing.listingID,
                    )
                    .first()
                )
                if duplicate_violation:
                    duplicate_matches_skipped += 1
                    continue

                violation = Violation(
                    isViolation=True,
                    violationStatus="Unresolved",
                    message="",
                    evidenceURL=None,
                    dateDetected=date.today(),
                    investigatorNotes=(
                        "Automated eBay Browse API shortlist search detected this potential match. "
                        "Review the listing and update the violation description after confirmation."
                    ),
                    investigatorID=investigator.userID,
                    receivedByID=seller_user.userID if seller_user else None,
                    recallID=recall.recallID,
                    listingID=listing.listingID,
                )
                db.add(violation)
                db.flush()
                new_violations_found += 1

        db.commit()
        return ViolationShortlistSearchResponse(
            newViolationsFound=new_violations_found,
            searchedRecalls=len(scanned_keywords),
            duplicateMatchesSkipped=duplicate_matches_skipped,
            scannedKeywords=scanned_keywords,
        )
    except (ProgrammingError, OperationalError) as exc:
        _raise_schema_error(exc, db)
    except EbayConfigError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except EbayApiError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


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
    try:
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
            seller_user = _find_seller_user_by_email(db, seller_email)

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
            evidenceURL=_clean_text(payload.evidenceURL),
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
            violation_id=violation.violationID,
            recall_name=recall.productName,
            listing_title=listing.listingTitle or "Marketplace listing",
            listing_url=listing.listingURL or "",
            violation_status=violation.violationStatus or "Logged",
            message=violation.message or "",
            evidence_url=violation.evidenceURL or "",
            investigator_notes=violation.investigatorNotes or "",
        )

        return ViolationCreateResponse(
            **_build_violation_out(violation).model_dump(),
            notificationStatus=notification.status,
            notificationDetail=notification.detail,
        )
    except (ProgrammingError, OperationalError) as exc:
        _raise_schema_error(exc, db)


@router.put("/{violation_id}", response_model=ViolationOut)
def update_violation(
    violation_id: int,
    payload: ViolationUpdate,
    db: Session = Depends(get_db),
):
    try:
        violation = (
            db.query(Violation)
            .options(
                joinedload(Violation.investigator),
                joinedload(Violation.recipient),
                joinedload(Violation.listing),
                joinedload(Violation.recall).joinedload(Recall.shortlist_entry),
                joinedload(Violation.seller_responses),
            )
            .filter(Violation.violationID == violation_id)
            .first()
        )
        if not violation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Violation not found.",
            )

        violation.isViolation = payload.matchConfirmation
        violation.message = _clean_text(payload.violationDescription) or ""
        violation.violationStatus = _validate_editable_status(payload.status)
        if violation.dateDetected is None:
            violation.dateDetected = date.today()

        db.commit()
        db.refresh(violation)
        return _build_violation_out(violation)
    except (ProgrammingError, OperationalError) as exc:
        _raise_schema_error(exc, db)


@router.patch("/{violation_id}/status", response_model=ViolationOut)
def update_violation_status(
    violation_id: int,
    payload: ViolationStatusUpdate,
    db: Session = Depends(get_db),
):
    try:
        violation = (
            db.query(Violation)
            .options(
                joinedload(Violation.investigator),
                joinedload(Violation.recipient),
                joinedload(Violation.listing),
                joinedload(Violation.recall).joinedload(Recall.shortlist_entry),
                joinedload(Violation.seller_responses),
            )
            .filter(Violation.violationID == violation_id)
            .first()
        )
        if not violation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Violation not found.",
            )
        new_status = _validate_editable_status(payload.status)
        violation.violationStatus = new_status

        if new_status == "Resolved":
            existing_adj = db.query(Adjudication).filter(
                Adjudication.violationID == violation.violationID
            ).first()
            if not existing_adj:
                adj = Adjudication(
                    finalStatus="Resolved",
                    notes="Marked resolved via adjudication panel.",
                    dateAdjudicated=date.today(),
                    violationID=violation.violationID,
                    investigatorID=violation.investigatorID,
                )
                db.add(adj)

        db.commit()
        db.refresh(violation)
        return _build_violation_out(violation)
    except (ProgrammingError, OperationalError) as exc:
        _raise_schema_error(exc, db)


@router.delete("/{violation_id}")
def delete_violation(violation_id: int, db: Session = Depends(get_db)):
    try:
        violation = db.query(Violation).filter(Violation.violationID == violation_id).first()
        if not violation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Violation not found.",
            )

        if (_clean_text(violation.violationStatus) or "").lower() != "resolved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only resolved violations can be deleted.",
            )

        listing_id = violation.listingID

        # Collect message IDs before deleting anything
        linked_responses = db.query(SellerResponse).filter(SellerResponse.violationID == violation.violationID).all()
        message_ids = [resp.messageid for resp in linked_responses if resp.messageid is not None]

        # Delete seller responses first (they hold the FK to message)
        db.query(SellerResponse).filter(SellerResponse.violationID == violation.violationID).delete()
        # Now safe to delete messages
        for mid in message_ids:
            db.query(Message).filter(Message.messageid == mid).delete()
        db.query(Message).filter(Message.violationID == violation.violationID).delete()
        db.query(Adjudication).filter(Adjudication.violationID == violation.violationID).delete()
        db.delete(violation)
        db.flush()

        if listing_id is not None:
            remaining_violation = (
                db.query(Violation)
                .filter(Violation.listingID == listing_id)
                .first()
            )
            if not remaining_violation:
                listing = db.query(ProductListing).filter(ProductListing.listingID == listing_id).first()
                if listing:
                    db.delete(listing)

        db.commit()
        return {"message": f"Violation {violation_id} deleted successfully."}
    except (ProgrammingError, OperationalError) as exc:
        _raise_schema_error(exc, db)


@router.get("/notices/{seller_user_id}", response_model=list[SellerViolationNoticeOut])
def list_seller_notices(seller_user_id: int, db: Session = Depends(get_db)):
    try:
        _get_seller_user(db, seller_user_id)
        violations = (
            db.query(Violation)
            .join(ProductListing, Violation.listingID == ProductListing.listingID)
            .filter(
                or_(
                    Violation.receivedByID == seller_user_id,
                    ProductListing.sellerUserID == seller_user_id,
                )
            )
            .options(
                joinedload(Violation.recall),
                joinedload(Violation.listing),
                joinedload(Violation.investigator),
                joinedload(Violation.seller_responses).joinedload(SellerResponse.message),
            )
            .order_by(Violation.dateDetected.desc(), Violation.violationID.desc())
            .all()
        )
        return [_build_seller_notice_out(violation, seller_user_id) for violation in violations]
    except (ProgrammingError, OperationalError) as exc:
        _raise_schema_error(exc, db)


@router.get("/notices/{seller_user_id}/{violation_id}", response_model=SellerViolationNoticeOut)
def get_seller_notice(seller_user_id: int, violation_id: int, db: Session = Depends(get_db)):
    try:
        _get_seller_user(db, seller_user_id)
        violation = _get_notice_for_seller(db, seller_user_id, violation_id)
        return _build_seller_notice_out(violation, seller_user_id)
    except (ProgrammingError, OperationalError) as exc:
        _raise_schema_error(exc, db)


@router.post("/{violation_id}/responses", response_model=SellerResponseOut, status_code=status.HTTP_201_CREATED)
def submit_seller_response(
    violation_id: int,
    payload: SellerResponseCreate,
    db: Session = Depends(get_db),
):
    try:
        _get_seller_user(db, payload.sellerUserID)

        # Validate seller email format
        seller_email = _clean_text(payload.sellerEmail)
        if not seller_email or not _is_valid_email(seller_email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid email address",
            )

        # Validate seller email exists in the seller database
        seller_by_email = _find_seller_user_by_email(db, seller_email)
        if not seller_by_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid email address",
            )

        # Validate response type
        if payload.responseType not in RESPONSE_TYPE_OPTIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Response type must be one of: {', '.join(RESPONSE_TYPE_OPTIONS)}",
            )

        # Validate response text
        response_text = _clean_text(payload.responseText)
        if not response_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Response cannot be empty.",
            )
        if len(payload.responseText) > RESPONSE_TEXT_MAX:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Response exceeds {RESPONSE_TEXT_MAX} character limit",
            )

        # Validate supporting URL
        supporting_url = _clean_text(payload.supportingURL)
        if not supporting_url or not _is_valid_supporting_url(supporting_url):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a proper URL link",
            )

        # Find the violation (accessible to this seller)
        violation = (
            db.query(Violation)
            .join(ProductListing, Violation.listingID == ProductListing.listingID)
            .filter(
                Violation.violationID == violation_id,
                or_(
                    Violation.receivedByID == payload.sellerUserID,
                    ProductListing.sellerUserID == payload.sellerUserID,
                ),
            )
            .first()
        )
        if not violation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Violation not found for this seller.",
            )

        # Create the message record (stores the seller's response text + email)
        msg = Message(
            senttoemailaddress=seller_email.lower(),
            responsetype=payload.responseType,
            messagecontent=response_text[:RESPONSE_TEXT_MAX],
            message_datetime=datetime.now(),
            violationID=violation.violationID,
            userID=payload.sellerUserID,
        )
        db.add(msg)
        db.flush()

        # Create the seller response record
        seller_response = SellerResponse(
            responseType=payload.responseType,
            evidenceURL=supporting_url,
            dateResponded=date.today(),
            violationID=violation.violationID,
            sellerUserID=payload.sellerUserID,
            messageid=msg.messageid,
        )
        db.add(seller_response)
        db.flush()

        # Back-link message to the response
        msg.responseid = seller_response.responseID

        # Mark violation as having a seller response
        violation.violationStatus = "Seller Responded"
        db.commit()
        db.refresh(seller_response)

        return SellerResponseOut(
            responseID=seller_response.responseID,
            responseType=seller_response.responseType,
            evidenceURL=seller_response.evidenceURL,
            dateResponded=seller_response.dateResponded,
            violationID=seller_response.violationID,
            sellerUserID=seller_response.sellerUserID,
            messageid=seller_response.messageid,
            responseText=msg.messagecontent,
            sellerEmail=msg.senttoemailaddress,
        )
    except (ProgrammingError, OperationalError) as exc:
        _raise_schema_error(exc, db)


@router.post("/remind-overdue")
def send_overdue_reminders(db: Session = Depends(get_db)):
    """Send reminder emails for violations with no seller response after 14 days."""
    try:
        cutoff = date.today() - timedelta(days=14)

        overdue_violations = (
            db.query(Violation)
            .outerjoin(SellerResponse, SellerResponse.violationID == Violation.violationID)
            .filter(
                Violation.dateDetected.isnot(None),
                Violation.dateDetected <= cutoff,
                SellerResponse.responseID.is_(None),
            )
            .options(
                joinedload(Violation.listing),
                joinedload(Violation.recall),
            )
            .all()
        )

        sent_count = 0
        skipped_count = 0

        for violation in overdue_violations:
            listing = violation.listing
            recall = violation.recall
            seller_email = listing.sellerEmail if listing else None
            seller_name = listing.sellerName if listing else "Seller"

            if not seller_email:
                skipped_count += 1
                continue

            result = send_sla_reminder(
                recipient_email=seller_email,
                recipient_name=seller_name or "Seller",
                violation_id=violation.violationID,
                recall_name=recall.productName if recall else "Unknown product",
                listing_title=listing.listingTitle if listing else "Marketplace listing",
                days_overdue=(date.today() - violation.dateDetected).days,
            )

            if result.status in {"sent", "skipped"}:
                sent_count += 1
                db.add(
                    ReminderEmailLog(
                        violationID=violation.violationID,
                        recipientEmail=seller_email,
                        sentAt=datetime.now(),
                        status=result.status,
                    )
                )
            else:
                skipped_count += 1

        db.commit()

        return {
            "totalOverdue": len(overdue_violations),
            "remindersSent": sent_count,
            "skipped": skipped_count,
        }
    except (ProgrammingError, OperationalError) as exc:
        _raise_schema_error(exc, db)


@router.patch("/{violation_id}/archive", response_model=ViolationOut)
def archive_violation(
    violation_id: int,
    payload: ArchiveUpdate,
    db: Session = Depends(get_db),
):
    try:
        violation = (
            db.query(Violation)
            .options(
                joinedload(Violation.investigator),
                joinedload(Violation.recipient),
                joinedload(Violation.listing),
                joinedload(Violation.recall).joinedload(Recall.shortlist_entry),
                joinedload(Violation.seller_responses),
            )
            .filter(Violation.violationID == violation_id)
            .first()
        )
        if not violation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Violation not found.",
            )

        next_archived = bool(payload.isArchived)
        if next_archived and (_clean_text(violation.violationStatus) or "").lower() != "resolved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only resolved violations can be archived.",
            )

        violation.isArchived = next_archived
        db.commit()
        db.refresh(violation)
        return _build_violation_out(violation)
    except (ProgrammingError, OperationalError) as exc:
        _raise_schema_error(exc, db)
