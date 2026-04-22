-- Sprint 3: Investigator assignment on shortList
-- Allows managers to assign a specific investigator to each priority list entry.

ALTER TABLE "shortList"
    ADD COLUMN IF NOT EXISTS "assignedInvestigatorID" INTEGER REFERENCES "user"("userID");
