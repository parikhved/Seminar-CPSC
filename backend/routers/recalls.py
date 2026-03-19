import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import Recall, ShortList
from schemas import RecallListResponse, RecallOut

router = APIRouter(prefix="/api/recalls", tags=["Recalls"])


@router.get("", response_model=RecallListResponse)
def list_recalls(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Recall)

    if search:
        term = f"%{search}%"
        query = query.filter(
            Recall.productName.ilike(term)
            | Recall.manufacturerName.ilike(term)
            | Recall.hazard.ilike(term)
        )

    total = query.count()
    pages = max(1, math.ceil(total / limit))
    offset = (page - 1) * limit

    recalls = query.order_by(Recall.recallDate.desc()).offset(offset).limit(limit).all()

    # Determine which recall IDs are already shortlisted
    shortlisted_ids = {
        row.recallID for row in db.query(ShortList.recallID).all()
    }

    results = []
    for r in recalls:
        out = RecallOut(
            recallID=r.recallID,
            productName=r.productName,
            manufacturerName=r.manufacturerName,
            hazard=r.hazard,
            recallDate=r.recallDate,
            recallURL=r.recallURL,
            remedy=r.remedy,
            units=r.units,
            soldAt=r.soldAt,
            isShortlisted=r.recallID in shortlisted_ids,
        )
        results.append(out)

    return RecallListResponse(recalls=results, total=total, page=page, pages=pages)


@router.get("/count")
def get_recall_count(db: Session = Depends(get_db)):
    count = db.query(Recall).count()
    return {"count": count}


@router.get("/{recall_id}", response_model=RecallOut)
def get_recall(recall_id: int, db: Session = Depends(get_db)):
    recall = db.query(Recall).filter(Recall.recallID == recall_id).first()
    if not recall:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recall ID not found",
        )

    shortlisted_ids = {
        row.recallID for row in db.query(ShortList.recallID).all()
    }

    return RecallOut(
        recallID=recall.recallID,
        productName=recall.productName,
        manufacturerName=recall.manufacturerName,
        hazard=recall.hazard,
        recallDate=recall.recallDate,
        recallURL=recall.recallURL,
        remedy=recall.remedy,
        units=recall.units,
        soldAt=recall.soldAt,
        isShortlisted=recall.recallID in shortlisted_ids,
    )
