-- CPSC Compliance & Analytics Unit — Database Schema
-- Sprint 1: Recall Prioritization System
-- All column names use camelCase as specified in the ERD

-- Drop tables in reverse dependency order (for clean re-runs)
DROP TABLE IF EXISTS adjudication CASCADE;
DROP TABLE IF EXISTS "sellerResponse" CASCADE;
DROP TABLE IF EXISTS violation CASCADE;
DROP TABLE IF EXISTS "productListing" CASCADE;
DROP TABLE IF EXISTS api CASCADE;
DROP TABLE IF EXISTS marketplace CASCADE;
DROP TABLE IF EXISTS "shortList" CASCADE;
DROP TABLE IF EXISTS recall CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- ============================================================
-- user table
-- ============================================================
CREATE TABLE "user" (
    "userID"    SERIAL PRIMARY KEY,
    "firstName" VARCHAR(20)  NOT NULL,
    "lastName"  VARCHAR(20)  NOT NULL,
    "email"     VARCHAR(50)  UNIQUE NOT NULL,
    "password"  VARCHAR(200) NOT NULL,
    "role"      VARCHAR(20)  NOT NULL CHECK ("role" IN ('Manager', 'Investigator', 'Seller')),
    "phoneNum"  VARCHAR(12)
);

-- ============================================================
-- recall table
-- ============================================================
CREATE TABLE recall (
    "recallID"         SERIAL PRIMARY KEY,
    "productName"      VARCHAR(500) NOT NULL,
    "manufacturerName" VARCHAR(50),
    "hazard"           VARCHAR(500),
    "recallDate"       DATE,
    "recallURL"        VARCHAR(100),
    "remedy"           VARCHAR(20),
    "units"            VARCHAR(500),
    "soldAt"           VARCHAR(500)
);

-- ============================================================
-- shortList table
-- ============================================================
CREATE TABLE "shortList" (
    "shortListID"   SERIAL PRIMARY KEY,
    "priorityLevel" VARCHAR(15) NOT NULL CHECK ("priorityLevel" IN ('Low', 'Medium', 'High', 'Critical')),
    "shortListDate" DATE        NOT NULL DEFAULT CURRENT_DATE,
    "notes"         VARCHAR(500),
    "managerUserID" INTEGER     NOT NULL REFERENCES "user"("userID"),
    "recallID"      INTEGER     NOT NULL UNIQUE REFERENCES recall("recallID")
);

-- ============================================================
-- marketplace table
-- ============================================================
CREATE TABLE marketplace (
    "marketplaceID" SERIAL PRIMARY KEY,
    "name"          VARCHAR(30) NOT NULL
);

-- ============================================================
-- api table
-- ============================================================
CREATE TABLE api (
    "listingID"    INTEGER NOT NULL,
    "marketplaceID" INTEGER NOT NULL REFERENCES marketplace("marketplaceID"),
    "API"          VARCHAR(200)
);

-- ============================================================
-- productListing table
-- ============================================================
CREATE TABLE "productListing" (
    "listingID"   SERIAL PRIMARY KEY,
    "modelNum"    VARCHAR(50),
    "listingTitle" VARCHAR(200),
    "listingDate"  DATE,
    "listingURL"   VARCHAR(200),
    "price"        DECIMAL(10, 2),
    "listingDesc"  TEXT,
    "address"      VARCHAR(100),
    "isActive"     BOOLEAN  DEFAULT TRUE,
    "sellerUserID" INTEGER  REFERENCES "user"("userID")
);

-- ============================================================
-- violation table
-- ============================================================
CREATE TABLE violation (
    "violationID"       SERIAL PRIMARY KEY,
    "isViolation"       BOOLEAN,
    "violationStatus"   VARCHAR(200),
    "message"           TEXT,
    "dateDetected"      DATE,
    "investigatorNotes" TEXT,
    "investigatorID"    INTEGER REFERENCES "user"("userID"),
    "receivedByID"      INTEGER REFERENCES "user"("userID"),
    "recallID"          INTEGER REFERENCES recall("recallID"),
    "listingID"         INTEGER REFERENCES "productListing"("listingID")
);

-- ============================================================
-- sellerResponse table
-- ============================================================
CREATE TABLE "sellerResponse" (
    "responseID"   SERIAL PRIMARY KEY,
    "response"     VARCHAR(400),
    "evidenceURL"  VARCHAR(100),
    "dateResponded" DATE,
    "violationID"  INTEGER REFERENCES violation("violationID"),
    "sellerUserID" INTEGER REFERENCES "user"("userID")
);

-- ============================================================
-- adjudication table
-- ============================================================
CREATE TABLE adjudication (
    "adjudicationID"  SERIAL PRIMARY KEY,
    "finalStatus"     VARCHAR(400),
    "notes"           VARCHAR(100),
    "dateAdjudicated" DATE,
    "violationID"     INTEGER REFERENCES violation("violationID"),
    "investigatorID"  INTEGER REFERENCES "user"("userID")
);
