-- Archive support for shortList + violation, plus reminderEmailLog table
-- Adds soft-delete pattern (isArchived) and SLA reminder audit trail

BEGIN;

-- ============================================================
-- Step 1: Add isArchived to "shortList"
-- ============================================================
ALTER TABLE "shortList"
    ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- Step 2: Add isArchived to violation
-- ============================================================
ALTER TABLE violation
    ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- Step 3: Create reminderEmailLog
-- ============================================================
CREATE TABLE IF NOT EXISTS "reminderEmailLog" (
    "reminderID"     SERIAL PRIMARY KEY,
    "violationID"    INTEGER NOT NULL REFERENCES violation("violationID"),
    "recipientEmail" VARCHAR(120) NOT NULL,
    "sentAt"         TIMESTAMP NOT NULL,
    "status"         VARCHAR(20) NOT NULL DEFAULT 'sent'
);

CREATE INDEX IF NOT EXISTS "reminderEmailLog_violationID_idx"
    ON "reminderEmailLog" ("violationID");

CREATE INDEX IF NOT EXISTS "reminderEmailLog_sentAt_idx"
    ON "reminderEmailLog" ("sentAt");

COMMIT;
