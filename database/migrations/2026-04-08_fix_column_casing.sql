-- Sprint 2 Fix: column casing, FK targets, and missing tables
-- Run this after 2026-04-08_sprint2_sync.sql

BEGIN;

-- ============================================================
-- Step 1: Populate "productListing" from old productlisting data
-- ============================================================
INSERT INTO "productListing" (
    "listingID", "modelNum", "listingTitle", "listingDate", "listingURL",
    "price", "listingDesc", "address", "isActive", "sellerUserID",
    "marketplaceName"
)
SELECT
    listingid,
    modelnum::VARCHAR,
    listingtitle,
    listingdate,
    listingurl,
    price,
    listingdesc,
    address,
    COALESCE(isactive, TRUE),
    selleruserid,
    'eBay'
FROM productlisting
ON CONFLICT ("listingID") DO NOTHING;

-- Advance sequence past the migrated IDs
SELECT setval(
    '"productListing_listingID_seq"',
    GREATEST((SELECT MAX("listingID") FROM "productListing"), 1)
);

-- ============================================================
-- Step 2: Drop old FK constraints on violation
-- ============================================================
ALTER TABLE violation DROP CONSTRAINT IF EXISTS "violation_listingid_fkey";
ALTER TABLE violation DROP CONSTRAINT IF EXISTS "violation_investigatorid_fkey";
ALTER TABLE violation DROP CONSTRAINT IF EXISTS "violation_receivedbyid_fkey";
ALTER TABLE violation DROP CONSTRAINT IF EXISTS "violation_recallid_fkey";

-- ============================================================
-- Step 3: Rename violation columns to camelCase
-- ============================================================
ALTER TABLE violation RENAME COLUMN violationid       TO "violationID";
ALTER TABLE violation RENAME COLUMN isviolation       TO "isViolation";
ALTER TABLE violation RENAME COLUMN violationstatus   TO "violationStatus";
ALTER TABLE violation RENAME COLUMN datedetected      TO "dateDetected";
ALTER TABLE violation RENAME COLUMN investigatornotes TO "investigatorNotes";
ALTER TABLE violation RENAME COLUMN investigatorid    TO "investigatorID";
ALTER TABLE violation RENAME COLUMN receivedbyid      TO "receivedByID";
ALTER TABLE violation RENAME COLUMN recallid          TO "recallID";
ALTER TABLE violation RENAME COLUMN listingid         TO "listingID";

-- Fix column types to match the SQLAlchemy model (TEXT, wider VARCHAR)
ALTER TABLE violation ALTER COLUMN message              TYPE TEXT;
ALTER TABLE violation ALTER COLUMN "investigatorNotes"  TYPE TEXT;
ALTER TABLE violation ALTER COLUMN "violationStatus"    TYPE VARCHAR(200);

-- Add auto-increment sequence for violationID (was plain INTEGER with no default)
CREATE SEQUENCE IF NOT EXISTS "violation_violationID_seq"
    OWNED BY violation."violationID";
SELECT setval(
    '"violation_violationID_seq"',
    GREATEST((SELECT MAX("violationID") FROM violation), 1)
);
ALTER TABLE violation
    ALTER COLUMN "violationID" SET DEFAULT nextval('"violation_violationID_seq"');

-- ============================================================
-- Step 4: Re-add FK constraints pointing at the correct tables
-- ============================================================
ALTER TABLE violation
    ADD CONSTRAINT "violation_listingID_fkey"
    FOREIGN KEY ("listingID") REFERENCES "productListing"("listingID");

ALTER TABLE violation
    ADD CONSTRAINT "violation_investigatorID_fkey"
    FOREIGN KEY ("investigatorID") REFERENCES "user"("userID");

ALTER TABLE violation
    ADD CONSTRAINT "violation_receivedByID_fkey"
    FOREIGN KEY ("receivedByID") REFERENCES "user"("userID");

ALTER TABLE violation
    ADD CONSTRAINT "violation_recallID_fkey"
    FOREIGN KEY ("recallID") REFERENCES recall("recallID");

-- ============================================================
-- Step 5: Create missing tables
-- ============================================================
CREATE TABLE IF NOT EXISTS "sellerResponse" (
    "responseID"    SERIAL PRIMARY KEY,
    "response"      VARCHAR(400),
    "evidenceURL"   VARCHAR(500),
    "dateResponded" DATE,
    "violationID"   INTEGER REFERENCES violation("violationID"),
    "sellerUserID"  INTEGER REFERENCES "user"("userID")
);

CREATE TABLE IF NOT EXISTS adjudication (
    "adjudicationID"  SERIAL PRIMARY KEY,
    "finalStatus"     VARCHAR(400),
    "notes"           VARCHAR(100),
    "dateAdjudicated" DATE,
    "violationID"     INTEGER REFERENCES violation("violationID"),
    "investigatorID"  INTEGER REFERENCES "user"("userID")
);

COMMIT;
