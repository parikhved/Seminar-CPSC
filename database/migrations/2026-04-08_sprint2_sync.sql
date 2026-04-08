ALTER TABLE "productListing"
    ALTER COLUMN "listingURL" TYPE VARCHAR(500);

ALTER TABLE "productListing"
    ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10),
    ADD COLUMN IF NOT EXISTS "marketplaceName" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "externalListingId" VARCHAR(80),
    ADD COLUMN IF NOT EXISTS "sellerName" VARCHAR(120),
    ADD COLUMN IF NOT EXISTS "sellerEmail" VARCHAR(120),
    ADD COLUMN IF NOT EXISTS "imageURL" VARCHAR(500);

UPDATE "productListing"
SET "marketplaceName" = 'eBay'
WHERE "marketplaceName" IS NULL;

ALTER TABLE "productListing"
    ALTER COLUMN "marketplaceName" SET DEFAULT 'eBay',
    ALTER COLUMN "marketplaceName" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_productListing_externalListingId"
ON "productListing" ("externalListingId");

ALTER TABLE violation
    ADD COLUMN IF NOT EXISTS "evidenceURL" VARCHAR(500);

ALTER TABLE "sellerResponse"
    ALTER COLUMN "evidenceURL" TYPE VARCHAR(500);
