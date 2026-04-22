from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Recall, ShortList, User
from schemas import InvestigatorOut, OKRMetrics, ShortListAssign, ShortListCreate, ShortListOut, ShortListUpdate

router = APIRouter(prefix="/api/shortlist", tags=["ShortList"])

VALID_PRIORITIES = {"Low", "Medium", "High", "Critical"}


def _build_shortlist_out(entry: ShortList) -> ShortListOut:
    recall = entry.recall
    manager = entry.manager
    investigator = entry.assigned_investigator
    return ShortListOut(
        shortListID=entry.shortListID,
        priorityLevel=entry.priorityLevel,
        shortListDate=entry.shortListDate,
        notes=entry.notes,
        managerUserID=entry.managerUserID,
        recallID=entry.recallID,
        productName=recall.productName if recall else None,
        manufacturerName=recall.manufacturerName if recall else None,
        hazard=recall.hazard if recall else None,
        recallDate=recall.recallDate if recall else None,
        remedy=recall.remedy if recall else None,
        managerFirstName=manager.firstName if manager else None,
        managerLastName=manager.lastName if manager else None,
        assignedInvestigatorID=entry.assignedInvestigatorID,
        assignedInvestigatorName=(
            f"{investigator.firstName} {investigator.lastName}" if investigator else None
        ),
    )


# ── Analytics OKR ── (must be before /{shortlist_id} to avoid path conflict)
@router.get("/analytics/okr", response_model=OKRMetrics)
def get_okr_metrics(db: Session = Depends(get_db)):
    total_recalls = db.query(Recall).count()
    total_shortlisted = db.query(ShortList).count()

    # Complete records: priorityLevel not null AND notes not null and not empty
    complete_records = (
        db.query(ShortList)
        .filter(
            ShortList.priorityLevel.isnot(None),
            ShortList.notes.isnot(None),
            ShortList.notes != "",
        )
        .count()
    )

    completeness_pct = (
        round((complete_records / total_shortlisted) * 100, 1)
        if total_shortlisted > 0
        else 0.0
    )

    # Count per priority level
    priority_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    rows = (
        db.query(ShortList.priorityLevel, func.count(ShortList.shortListID))
        .group_by(ShortList.priorityLevel)
        .all()
    )
    for level, cnt in rows:
        if level in priority_counts:
            priority_counts[level] = cnt

    return OKRMetrics(
        total_recalls=total_recalls,
        total_shortlisted=total_shortlisted,
        shortlist_baseline=122,
        shortlist_target=134,
        complete_records=complete_records,
        complete_baseline=42,
        complete_target=50,
        shortlist_by_priority=priority_counts,
        completeness_percentage=completeness_pct,
    )


@router.get("/investigators", response_model=list[InvestigatorOut])
def list_investigators(db: Session = Depends(get_db)):
    users = (
        db.query(User)
        .filter(User.role == "Investigator")
        .order_by(User.firstName, User.lastName)
        .all()
    )
    return [InvestigatorOut(userID=u.userID, firstName=u.firstName, lastName=u.lastName, email=u.email) for u in users]


@router.get("", response_model=list[ShortListOut])
def list_shortlist(
    priority: Optional[str] = Query(None),
    investigatorUserID: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(ShortList)
    if priority:
        query = query.filter(ShortList.priorityLevel == priority)
    if investigatorUserID is not None:
        query = query.filter(ShortList.assignedInvestigatorID == investigatorUserID)
    entries = query.order_by(ShortList.shortListDate.desc()).all()
    return [_build_shortlist_out(e) for e in entries]


@router.post("", response_model=ShortListOut, status_code=status.HTTP_201_CREATED)
def create_shortlist(payload: ShortListCreate, db: Session = Depends(get_db)):
    # 1. Recall must exist
    recall = db.query(Recall).filter(Recall.recallID == payload.recallID).first()
    if not recall:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recall ID is invalid. Recall not found in the database.",
        )

    # 2. Manager must exist and have role Manager
    manager = db.query(User).filter(User.userID == payload.managerUserID).first()
    if not manager or manager.role != "Manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager ID is invalid or user is not a Manager.",
        )

    # 3. Priority level must be valid
    if payload.priorityLevel not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select a severity level (Low, Medium, High, Critical).",
        )

    # 4. Recall must not already be shortlisted
    existing = (
        db.query(ShortList).filter(ShortList.recallID == payload.recallID).first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This recall is already on the priority list.",
        )

    entry = ShortList(
        priorityLevel=payload.priorityLevel,
        shortListDate=date.today(),
        notes=payload.notes,
        managerUserID=payload.managerUserID,
        recallID=payload.recallID,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _build_shortlist_out(entry)


@router.put("/{shortlist_id}", response_model=ShortListOut)
def update_shortlist(
    shortlist_id: int,
    payload: ShortListUpdate,
    db: Session = Depends(get_db),
):
    entry = db.query(ShortList).filter(ShortList.shortListID == shortlist_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ShortList entry not found.",
        )

    if payload.priorityLevel is not None:
        if payload.priorityLevel not in VALID_PRIORITIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please select a severity level (Low, Medium, High, Critical).",
            )
        entry.priorityLevel = payload.priorityLevel

    if payload.notes is not None:
        entry.notes = payload.notes

    db.commit()
    db.refresh(entry)
    return _build_shortlist_out(entry)


@router.patch("/{shortlist_id}/assign", response_model=ShortListOut)
def assign_investigator(
    shortlist_id: int,
    payload: ShortListAssign,
    db: Session = Depends(get_db),
):
    entry = db.query(ShortList).filter(ShortList.shortListID == shortlist_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ShortList entry not found.",
        )

    if payload.investigatorUserID is not None:
        investigator = db.query(User).filter(User.userID == payload.investigatorUserID).first()
        if not investigator or investigator.role != "Investigator":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be an Investigator to be assigned.",
            )
        entry.assignedInvestigatorID = investigator.userID
    else:
        entry.assignedInvestigatorID = None

    db.commit()
    db.refresh(entry)
    return _build_shortlist_out(entry)


@router.delete("/{shortlist_id}")
def delete_shortlist(shortlist_id: int, db: Session = Depends(get_db)):
    entry = db.query(ShortList).filter(ShortList.shortListID == shortlist_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ShortList entry not found.",
        )
    db.delete(entry)
    db.commit()
    return {"message": f"ShortList entry {shortlist_id} deleted successfully."}
