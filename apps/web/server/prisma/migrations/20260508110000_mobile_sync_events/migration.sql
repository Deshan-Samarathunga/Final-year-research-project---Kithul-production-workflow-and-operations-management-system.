CREATE TABLE IF NOT EXISTS "MobileSyncEvent" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER,
    "status" TEXT NOT NULL,
    "issueNoteCount" INTEGER NOT NULL DEFAULT 0,
    "issueNoteItemCount" INTEGER NOT NULL DEFAULT 0,
    "transferNoteCount" INTEGER NOT NULL DEFAULT 0,
    "transferNoteItemCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "MobileSyncEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MobileSyncEvent_employeeId_idx" ON "MobileSyncEvent"("employeeId");
CREATE INDEX IF NOT EXISTS "MobileSyncEvent_status_idx" ON "MobileSyncEvent"("status");
CREATE INDEX IF NOT EXISTS "MobileSyncEvent_startedAt_idx" ON "MobileSyncEvent"("startedAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MobileSyncEvent_employeeId_fkey'
    ) THEN
        ALTER TABLE "MobileSyncEvent"
        ADD CONSTRAINT "MobileSyncEvent_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
