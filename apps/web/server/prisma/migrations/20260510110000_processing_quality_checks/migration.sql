ALTER TABLE "IssueNoteItem"
ADD COLUMN IF NOT EXISTS "processingStatus" TEXT NOT NULL DEFAULT 'Pending';

CREATE TABLE IF NOT EXISTS "ProcessingQualityCheck" (
    "id" SERIAL NOT NULL,
    "issueNoteItemId" INTEGER NOT NULL,
    "phValue" DOUBLE PRECISION NOT NULL,
    "brixValue" DOUBLE PRECISION NOT NULL,
    "temperatureC" DOUBLE PRECISION NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "phWarning" BOOLEAN NOT NULL DEFAULT false,
    "brixWarning" BOOLEAN NOT NULL DEFAULT false,
    "temperatureWarning" BOOLEAN NOT NULL DEFAULT false,
    "warningMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProcessingQualityCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProcessingQualityCheck_issueNoteItemId_idx" ON "ProcessingQualityCheck"("issueNoteItemId");
CREATE INDEX IF NOT EXISTS "ProcessingQualityCheck_decision_idx" ON "ProcessingQualityCheck"("decision");
CREATE INDEX IF NOT EXISTS "ProcessingQualityCheck_checkedAt_idx" ON "ProcessingQualityCheck"("checkedAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProcessingQualityCheck_issueNoteItemId_fkey'
    ) THEN
        ALTER TABLE "ProcessingQualityCheck"
        ADD CONSTRAINT "ProcessingQualityCheck_issueNoteItemId_fkey"
        FOREIGN KEY ("issueNoteItemId") REFERENCES "IssueNoteItem"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
