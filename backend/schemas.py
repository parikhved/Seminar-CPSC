from datetime import date
from typing import Dict, List, Optional
from pydantic import BaseModel


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    userID: int
    firstName: str
    lastName: str
    email: str
    role: str
    token: str


# ── Recall ────────────────────────────────────────────────────────────────────

class RecallOut(BaseModel):
    recallID: int
    productName: str
    manufacturerName: Optional[str] = None
    hazard: Optional[str] = None
    recallDate: Optional[date] = None
    recallURL: Optional[str] = None
    remedy: Optional[str] = None
    units: Optional[str] = None
    soldAt: Optional[str] = None
    isShortlisted: Optional[bool] = False

    model_config = {"from_attributes": True}


class RecallListResponse(BaseModel):
    recalls: List[RecallOut]
    total: int
    page: int
    pages: int


class RecallCreate(BaseModel):
    productName: str
    manufacturerName: str
    hazard: str
    recallDate: date
    recallURL: str
    remedy: str
    units: str
    soldAt: str


# ── ShortList ─────────────────────────────────────────────────────────────────

class ShortListCreate(BaseModel):
    recallID: int
    priorityLevel: str
    notes: Optional[str] = None
    managerUserID: int


class ShortListUpdate(BaseModel):
    priorityLevel: Optional[str] = None
    notes: Optional[str] = None


class ShortListOut(BaseModel):
    shortListID: int
    priorityLevel: str
    shortListDate: date
    notes: Optional[str] = None
    managerUserID: int
    recallID: int

    # Nested recall fields (flattened for convenience)
    productName: Optional[str] = None
    manufacturerName: Optional[str] = None
    hazard: Optional[str] = None
    recallDate: Optional[date] = None
    remedy: Optional[str] = None

    # Manager name
    managerFirstName: Optional[str] = None
    managerLastName: Optional[str] = None

    model_config = {"from_attributes": True}


# ── OKR Analytics ─────────────────────────────────────────────────────────────

class OKRMetrics(BaseModel):
    total_recalls: int
    total_shortlisted: int
    shortlist_baseline: int = 122
    shortlist_target: int = 134
    complete_records: int
    complete_baseline: int = 42
    complete_target: int = 50
    shortlist_by_priority: Dict[str, int]
    completeness_percentage: float
