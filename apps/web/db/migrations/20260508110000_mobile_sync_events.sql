-- Mirrored from server/prisma/migrations/20260508110000_mobile_sync_events/migration.sql.

CREATE TABLE "MobileSyncEvent" (
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

CREATE INDEX "MobileSyncEvent_employeeId_idx" ON "MobileSyncEvent"("employeeId");
CREATE INDEX "MobileSyncEvent_status_idx" ON "MobileSyncEvent"("status");
CREATE INDEX "MobileSyncEvent_startedAt_idx" ON "MobileSyncEvent"("startedAt");

ALTER TABLE "MobileSyncEvent"
ADD CONSTRAINT "MobileSyncEvent_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
