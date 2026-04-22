-- Sprint 3: Seller Response tracking
-- Adds sequences and extends column sizes for message and sellerResponse tables.

-- Sequence for message.messageid (table has no autoincrement by default)
CREATE SEQUENCE IF NOT EXISTS message_messageid_seq START WITH 1 INCREMENT BY 1;
ALTER TABLE message
    ALTER COLUMN messageid SET DEFAULT nextval('message_messageid_seq');

-- Sequence for sellerResponse.responseID (table has no autoincrement by default)
CREATE SEQUENCE IF NOT EXISTS "sellerResponse_responseID_seq" START WITH 1 INCREMENT BY 1;
ALTER TABLE "sellerResponse"
    ALTER COLUMN "responseID" SET DEFAULT nextval('"sellerResponse_responseID_seq"');

-- Extend messagecontent to hold up to 500-char seller response text
ALTER TABLE message
    ALTER COLUMN messagecontent TYPE VARCHAR(500);

-- Make sure evidenceURL on sellerResponse can hold long URLs
ALTER TABLE "sellerResponse"
    ALTER COLUMN "evidenceURL" TYPE VARCHAR(500);
