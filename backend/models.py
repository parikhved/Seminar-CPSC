from sqlalchemy import (
    Boolean, Column, Date, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "user"

    userID    = Column("userID",    Integer,     primary_key=True, index=True)
    firstName = Column("firstName", String(20),  nullable=False)
    lastName  = Column("lastName",  String(20),  nullable=False)
    email     = Column("email",     String(50),  unique=True, nullable=False)
    password  = Column("password",  String(200), nullable=False)
    role      = Column("role",      String(20),  nullable=False)
    phoneNum  = Column("phoneNum",  String(12))

    shortlists  = relationship("ShortList",      back_populates="manager",      foreign_keys="ShortList.managerUserID")
    listings    = relationship("ProductListing", back_populates="seller",       foreign_keys="ProductListing.sellerUserID")


class Recall(Base):
    __tablename__ = "recall"

    recallID         = Column("recallID",         Integer,      primary_key=True, index=True)
    productName      = Column("productName",      String(500),  nullable=False)
    manufacturerName = Column("manufacturerName", String(50))
    hazard           = Column("hazard",           String(500))
    recallDate       = Column("recallDate",       Date)
    recallURL        = Column("recallURL",        String(100))
    remedy           = Column("remedy",           String(20))
    units            = Column("units",            String(500))
    soldAt           = Column("soldAt",           String(500))

    shortlist_entry = relationship("ShortList", back_populates="recall", uselist=False)


class ShortList(Base):
    __tablename__ = "shortList"

    shortListID   = Column("shortListID",   Integer,     primary_key=True, index=True)
    priorityLevel = Column("priorityLevel", String(15),  nullable=False)
    shortListDate = Column("shortListDate", Date,        nullable=False)
    notes         = Column("notes",         String(500))
    managerUserID = Column("managerUserID", Integer,     ForeignKey("user.userID"), nullable=False)
    recallID      = Column("recallID",      Integer,     ForeignKey("recall.recallID"), nullable=False, unique=True)

    manager = relationship("User",   back_populates="shortlists", foreign_keys=[managerUserID])
    recall  = relationship("Recall", back_populates="shortlist_entry")


class Marketplace(Base):
    __tablename__ = "marketplace"

    marketplaceID = Column("marketplaceID", Integer,     primary_key=True, index=True)
    name          = Column("name",          String(30),  nullable=False)


class Api(Base):
    __tablename__ = "api"

    listingID     = Column("listingID",     Integer,  nullable=False)
    marketplaceID = Column("marketplaceID", Integer,  ForeignKey("marketplace.marketplaceID"), nullable=False, primary_key=True)
    API           = Column("API",           String(200))


class ProductListing(Base):
    __tablename__ = "productListing"

    listingID    = Column("listingID",    Integer,         primary_key=True, index=True)
    modelNum     = Column("modelNum",     String(50))
    listingTitle = Column("listingTitle", String(200))
    listingDate  = Column("listingDate",  Date)
    listingURL   = Column("listingURL",   String(200))
    price        = Column("price",        Numeric(10, 2))
    listingDesc  = Column("listingDesc",  Text)
    address      = Column("address",      String(100))
    isActive     = Column("isActive",     Boolean,         default=True)
    sellerUserID = Column("sellerUserID", Integer,         ForeignKey("user.userID"))

    seller = relationship("User", back_populates="listings", foreign_keys=[sellerUserID])


class Violation(Base):
    __tablename__ = "violation"

    violationID       = Column("violationID",       Integer,  primary_key=True, index=True)
    isViolation       = Column("isViolation",       Boolean)
    violationStatus   = Column("violationStatus",   String(200))
    message           = Column("message",           Text)
    dateDetected      = Column("dateDetected",      Date)
    investigatorNotes = Column("investigatorNotes", Text)
    investigatorID    = Column("investigatorID",    Integer,  ForeignKey("user.userID"))
    receivedByID      = Column("receivedByID",      Integer,  ForeignKey("user.userID"))
    recallID          = Column("recallID",          Integer,  ForeignKey("recall.recallID"))
    listingID         = Column("listingID",         Integer,  ForeignKey("productListing.listingID"))


class SellerResponse(Base):
    __tablename__ = "sellerResponse"

    responseID    = Column("responseID",    Integer,      primary_key=True, index=True)
    response      = Column("response",      String(400))
    evidenceURL   = Column("evidenceURL",   String(100))
    dateResponded = Column("dateResponded", Date)
    violationID   = Column("violationID",   Integer,      ForeignKey("violation.violationID"))
    sellerUserID  = Column("sellerUserID",  Integer,      ForeignKey("user.userID"))


class Adjudication(Base):
    __tablename__ = "adjudication"

    adjudicationID  = Column("adjudicationID",  Integer,     primary_key=True, index=True)
    finalStatus     = Column("finalStatus",     String(400))
    notes           = Column("notes",           String(100))
    dateAdjudicated = Column("dateAdjudicated", Date)
    violationID     = Column("violationID",     Integer,     ForeignKey("violation.violationID"))
    investigatorID  = Column("investigatorID",  Integer,     ForeignKey("user.userID"))
