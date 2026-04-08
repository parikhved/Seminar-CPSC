from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Recall, ShortList, Violation
from schemas import (
    ViolationAnalyticsOverview,
    ViolationDocumentationMetrics,
    ViolationResolutionMetrics,
    ViolationWeeklyTrendPoint,
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


def _is_present(value: object) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return True


def _violation_documentation_complete(violation: Violation) -> bool:
    listing = violation.listing
    recall = violation.recall
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
    return all(_is_present(value) for value in required_values)


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


@router.get("/violations-overview", response_model=ViolationAnalyticsOverview)
def violations_overview(db: Session = Depends(get_db)):
    violations = (
        db.query(Violation)
        .options(
            joinedload(Violation.recall),
            joinedload(Violation.listing),
        )
        .order_by(Violation.dateDetected.desc(), Violation.violationID.desc())
        .all()
    )

    today = date.today()
    start_date = today - timedelta(days=6)

    rows = (
        db.query(Violation.dateDetected, func.count(Violation.violationID).label("count"))
        .filter(
            Violation.dateDetected.isnot(None),
            Violation.dateDetected >= start_date,
            Violation.dateDetected <= today,
        )
        .group_by(Violation.dateDetected)
        .order_by(Violation.dateDetected)
        .all()
    )
    counts_by_day = {row.dateDetected: row.count for row in rows}

    new_violations_by_day = []
    running_total = 0
    for offset in range(7):
        current_day = start_date + timedelta(days=offset)
        count = counts_by_day.get(current_day, 0)
        running_total += count
        new_violations_by_day.append(
            ViolationWeeklyTrendPoint(
                date=current_day.isoformat(),
                label=current_day.strftime("%b %d"),
                count=count,
            )
        )

    complete_count = sum(1 for violation in violations if _violation_documentation_complete(violation))
    total_violations = len(violations)
    incomplete_count = max(total_violations - complete_count, 0)

    resolved_count = sum(
        1
        for violation in violations
        if isinstance(violation.violationStatus, str) and violation.violationStatus.strip().lower() == "resolved"
    )
    unresolved_count = max(total_violations - resolved_count, 0)

    documentation_completion = ViolationDocumentationMetrics(
        complete=complete_count,
        incomplete=incomplete_count,
        percentageComplete=round((complete_count / total_violations) * 100, 1) if total_violations else 0.0,
    )
    resolution_rate = ViolationResolutionMetrics(
        resolved=resolved_count,
        unresolved=unresolved_count,
        percentageResolved=round((resolved_count / total_violations) * 100, 1) if total_violations else 0.0,
    )

    return ViolationAnalyticsOverview(
        newViolationsByDay=new_violations_by_day,
        newViolationsTotal=running_total,
        documentationCompletion=documentation_completion,
        resolutionRate=resolution_rate,
    )
