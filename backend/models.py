from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
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
    detected_violations = relationship(
        "Violation",
        back_populates="investigator",
        foreign_keys="Violation.investigatorID",
    )
    received_violations = relationship(
        "Violation",
        back_populates="recipient",
        foreign_keys="Violation.receivedByID",
    )
    seller_responses = relationship(
        "SellerResponse",
        back_populates="seller",
        foreign_keys="SellerResponse.sellerUserID",
    )
    messages = relationship(
        "Message",
        back_populates="user",
        foreign_keys="Message.userID",
    )


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
    violations = relationship("Violation", back_populates="recall")


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

    listingID          = Column("listingID",          Integer,         primary_key=True, index=True)
    modelNum           = Column("modelNum",           String(50))
    listingTitle       = Column("listingTitle",       String(200))
    listingDate        = Column("listingDate",        Date)
    listingURL         = Column("listingURL",         String(500))
    price              = Column("price",              Numeric(10, 2))
    currency           = Column("currency",           String(10))
    listingDesc        = Column("listingDesc",        Text)
    address            = Column("address",            String(100))
    marketplaceName    = Column("marketplaceName",    String(50),      nullable=False, default="eBay")
    externalListingId  = Column("externalListingId",  String(80),      unique=True)
    sellerName         = Column("sellerName",         String(120))
    sellerEmail        = Column("sellerEmail",        String(120))
    imageURL           = Column("imageURL",           String(500))
    isActive           = Column("isActive",           Boolean,         default=True)
    sellerUserID       = Column("sellerUserID",       Integer,         ForeignKey("user.userID"))

    seller = relationship("User", back_populates="listings", foreign_keys=[sellerUserID])
    violations = relationship("Violation", back_populates="listing")


class Violation(Base):
    __tablename__ = "violation"

    violationID       = Column("violationID",       Integer,  primary_key=True, index=True)
    isViolation       = Column("isViolation",       Boolean)
    violationStatus   = Column("violationStatus",   String(200))
    message           = Column("message",           Text)
    evidenceURL       = Column("evidenceURL",       String(500))
    dateDetected      = Column("dateDetected",      Date)
    investigatorNotes = Column("investigatorNotes", Text)
    investigatorID    = Column("investigatorID",    Integer,  ForeignKey("user.userID"))
    receivedByID      = Column("receivedByID",      Integer,  ForeignKey("user.userID"))
    recallID          = Column("recallID",          Integer,  ForeignKey("recall.recallID"))
    listingID         = Column("listingID",         Integer,  ForeignKey("productListing.listingID"))

    investigator = relationship("User", back_populates="detected_violations", foreign_keys=[investigatorID])
    recipient = relationship("User", back_populates="received_violations", foreign_keys=[receivedByID])
    recall = relationship("Recall", back_populates="violations")
    listing = relationship("ProductListing", back_populates="violations")
    seller_responses = relationship("SellerResponse", back_populates="violation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="violation")


class Message(Base):
    __tablename__ = "message"

    messageid          = Column("messageid",           Integer,     primary_key=True, index=True)
    senttoemailaddress = Column("senttoemailaddress",  String(100), nullable=False)
    responsetype       = Column("responsetype",        String(100))
    messagecontent     = Column("messagecontent",      String(500))
    message_datetime   = Column("datetime",            DateTime,    nullable=False)
    violationID        = Column("violationID",         Integer,     ForeignKey("violation.violationID"), nullable=False)
    responseid         = Column("responseid",          Integer)
    userID             = Column("userID",              Integer,     ForeignKey("user.userID"), nullable=False)

    violation = relationship("Violation", back_populates="messages")
    user      = relationship("User", back_populates="messages", foreign_keys=[userID])
    seller_response = relationship(
        "SellerResponse",
        back_populates="message",
        foreign_keys="SellerResponse.messageid",
        uselist=False,
    )


class SellerResponse(Base):
    __tablename__ = "sellerResponse"

    responseID    = Column("responseID",    Integer,      primary_key=True, index=True)
    responseType  = Column("responseType",  String(100),  nullable=False)
    evidenceURL   = Column("evidenceURL",   String(500))
    dateResponded = Column("dateResponded", Date,         nullable=False)
    violationID   = Column("violationID",   Integer,      ForeignKey("violation.violationID"), nullable=False)
    sellerUserID  = Column("sellerUserID",  Integer,      ForeignKey("user.userID"),           nullable=False)
    messageid     = Column("messageid",     Integer,      ForeignKey("message.messageid"),     nullable=False)

    violation = relationship("Violation", back_populates="seller_responses")
    seller    = relationship("User", back_populates="seller_responses", foreign_keys=[sellerUserID])
    message   = relationship("Message", back_populates="seller_response", foreign_keys=[messageid])


class Adjudication(Base):
    __tablename__ = "adjudication"

    adjudicationID  = Column("adjudicationID",  Integer,     primary_key=True, index=True)
    finalStatus     = Column("finalStatus",     String(400))
    notes           = Column("notes",           String(100))
    dateAdjudicated = Column("dateAdjudicated", Date)
    violationID     = Column("violationID",     Integer,     ForeignKey("violation.violationID"))
    investigatorID  = Column("investigatorID",  Integer,     ForeignKey("user.userID"))
