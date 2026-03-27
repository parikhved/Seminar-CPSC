from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session

from database import get_db
from models import Recall, ShortList

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/incomplete-recalls")
def incomplete_recalls(db: Session = Depends(get_db)):
    rows = db.query(Recall).filter(
        or_(
            Recall.productName.is_(None),
            func.trim(Recall.productName) == "",
            Recall.manufacturerName.is_(None),
            func.trim(Recall.manufacturerName) == "",
            Recall.hazard.is_(None),
            func.trim(Recall.hazard) == "",
            Recall.recallDate.is_(None),
            Recall.recallURL.is_(None),
            func.trim(Recall.recallURL) == "",
        )
    ).order_by(Recall.recallDate.desc()).all()

    return [
        {
            "recallID": r.recallID,
            "productName": r.productName,
            "manufacturerName": r.manufacturerName,
            "hazard": r.hazard,
            "recallDate": str(r.recallDate) if r.recallDate else None,
            "recallURL": r.recallURL,
        }
        for r in rows
    ]


@router.get("/shortlist-trend")
def shortlist_trend(db: Session = Depends(get_db)):
    rows = (
        db.query(ShortList.shortListDate, func.count(ShortList.shortListID).label("count"))
        .group_by(ShortList.shortListDate)
        .order_by(ShortList.shortListDate)
        .all()
    )
    return [{"date": str(r.shortListDate), "count": r.count} for r in rows]


@router.get("/recalls-by-date")
def recalls_by_date(db: Session = Depends(get_db)):
    sql = text("""
        SELECT TO_CHAR(DATE_TRUNC('month', "recallDate"), 'Mon YYYY') AS month,
               DATE_TRUNC('month', "recallDate") AS month_sort,
               COUNT(*) AS count
        FROM recall
        WHERE "recallDate" IS NOT NULL
        GROUP BY DATE_TRUNC('month', "recallDate")
        ORDER BY month_sort
    """)
    rows = db.execute(sql).fetchall()
    return [{"date": r.month, "count": r.count} for r in rows]


@router.get("/category-week")
def category_week(db: Session = Depends(get_db)):
    sql = text("""
        SELECT
            DATE_TRUNC('week', s."shortListDate")::date AS week,
            CASE
                WHEN r."productName" ILIKE '%toy%'       THEN 'Toy'
                WHEN r."productName" ILIKE '%chess%'     THEN 'Toy'
                WHEN r."productName" ILIKE '%helmet%'    THEN 'Helmet'
                WHEN r."productName" ILIKE '%dresser%'   THEN 'Furniture'
                WHEN r."productName" ILIKE '%swing%'     THEN 'Outdoor Equipment'
                WHEN r."productName" ILIKE '%walker%'    THEN 'Baby Product'
                WHEN r."productName" ILIKE '%scooter%'   THEN 'Vehicle'
                WHEN r."productName" ILIKE '%air fryer%' THEN 'Appliance'
                ELSE 'Other'
            END AS category,
            COUNT(*) AS count
        FROM "shortList" s
        JOIN recall r ON s."recallID" = r."recallID"
        GROUP BY week, category
        ORDER BY week, category
    """)
    rows = db.execute(sql).fetchall()
    return [{"week": str(r.week), "category": r.category, "count": r.count} for r in rows]
