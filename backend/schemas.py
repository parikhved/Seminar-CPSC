from datetime import date
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


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


# ── Violations ────────────────────────────────────────────────────────────────

class RecallSummary(BaseModel):
    recallID: int
    productName: str
    manufacturerName: Optional[str] = None
    hazard: Optional[str] = None


class EbayScanRequest(BaseModel):
    recallID: int
    query: Optional[str] = None
    limit: int = Field(default=8, ge=1, le=20)
    minScore: float = Field(default=0.45, ge=0, le=1)


class DetectedListingOut(BaseModel):
    externalListingId: Optional[str] = None
    listingTitle: Optional[str] = None
    listingURL: Optional[str] = None
    marketplaceName: str
    sellerName: Optional[str] = None
    sellerEmail: Optional[str] = None
    listingDate: Optional[date] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    listingDesc: Optional[str] = None
    address: Optional[str] = None
    imageURL: Optional[str] = None
    matchScore: float
    matchedTerms: List[str] = Field(default_factory=list)
    isDetectedMatch: bool


class EbayScanResponse(BaseModel):
    recall: RecallSummary
    query: str
    detectedCount: int
    candidates: List[DetectedListingOut] = Field(default_factory=list)


class ViolationShortlistSearchRequest(BaseModel):
    investigatorID: int
    limitPerRecall: int = Field(default=8, ge=1, le=20)
    minScore: float = Field(default=0.45, ge=0, le=1)


class ViolationShortlistSearchResponse(BaseModel):
    newViolationsFound: int
    searchedRecalls: int
    duplicateMatchesSkipped: int
    scannedKeywords: List[str] = Field(default_factory=list)


class ViolationListingPayload(BaseModel):
    externalListingId: str
    listingTitle: str
    listingURL: str
    marketplaceName: str = "eBay"
    sellerName: Optional[str] = None
    sellerEmail: str
    listingDate: Optional[date] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    listingDesc: Optional[str] = None
    address: Optional[str] = None
    imageURL: Optional[str] = None
    isActive: bool = True


class ViolationCreate(BaseModel):
    recallID: int
    investigatorID: int
    violationStatus: str
    message: str
    evidenceURL: str
    investigatorNotes: str
    receivedByID: Optional[int] = None
    listing: ViolationListingPayload


class ViolationUpdate(BaseModel):
    matchConfirmation: bool
    violationDescription: str = Field(default="", max_length=500)
    status: str


class ViolationOut(BaseModel):
    violationID: int
    isViolation: bool
    violationStatus: Optional[str] = None
    message: Optional[str] = None
    evidenceURL: Optional[str] = None
    dateDetected: Optional[date] = None
    investigatorNotes: Optional[str] = None
    investigatorID: Optional[int] = None
    investigatorName: Optional[str] = None
    receivedByID: Optional[int] = None
    receivedByName: Optional[str] = None
    recallID: Optional[int] = None
    recallProductName: Optional[str] = None
    listingID: Optional[int] = None
    externalListingId: Optional[str] = None
    listingTitle: Optional[str] = None
    listingURL: Optional[str] = None
    marketplaceName: Optional[str] = None
    sellerName: Optional[str] = None
    sellerEmail: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    shortListID: Optional[int] = None
    productName: Optional[str] = None
    matchConfirmation: Optional[bool] = None
    URL: Optional[str] = None
    seller: Optional[str] = None
    sellerID: Optional[int] = None
    violationDate: Optional[date] = None
    violationDescription: Optional[str] = None
    status: Optional[str] = None
    marketplaceSource: Optional[str] = None
    documentationComplete: bool = False

    model_config = {"from_attributes": True}


class ViolationCreateResponse(ViolationOut):
    notificationStatus: str
    notificationDetail: str


class SellerResponseCreate(BaseModel):
    sellerUserID: int
    response: str
    evidenceURL: str


class SellerResponseOut(BaseModel):
    responseID: int
    response: Optional[str] = None
    evidenceURL: Optional[str] = None
    dateResponded: Optional[date] = None
    violationID: int
    sellerUserID: int

    model_config = {"from_attributes": True}


class SellerViolationNoticeOut(BaseModel):
    violationID: int
    violationStatus: Optional[str] = None
    message: Optional[str] = None
    evidenceURL: Optional[str] = None
    dateDetected: Optional[date] = None
    recallID: Optional[int] = None
    recallProductName: Optional[str] = None
    hazard: Optional[str] = None
    listingID: Optional[int] = None
    listingTitle: Optional[str] = None
    listingURL: Optional[str] = None
    marketplaceName: Optional[str] = None
    sellerEmail: Optional[str] = None
    investigatorName: Optional[str] = None
    responseID: Optional[int] = None
    sellerResponse: Optional[str] = None
    responseEvidenceURL: Optional[str] = None
    dateResponded: Optional[date] = None


class ViolationWeeklyTrendPoint(BaseModel):
    date: str
    label: str
    count: int


class ViolationDocumentationMetrics(BaseModel):
    complete: int
    incomplete: int
    percentageComplete: float


class ViolationResolutionMetrics(BaseModel):
    resolved: int
    unresolved: int
    percentageResolved: float


class ViolationAnalyticsOverview(BaseModel):
    newViolationsByDay: List[ViolationWeeklyTrendPoint] = Field(default_factory=list)
    newViolationsTotal: int
    documentationCompletion: ViolationDocumentationMetrics
    resolutionRate: ViolationResolutionMetrics
