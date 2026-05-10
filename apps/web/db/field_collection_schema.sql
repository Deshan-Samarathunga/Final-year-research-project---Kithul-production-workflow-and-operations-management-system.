-- Field collection center and issue note schema.

CREATE TABLE IF NOT EXISTS "Center" (
    "id" SERIAL NOT NULL,
    "centerId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Center_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IssueNote" (
    "id" SERIAL NOT NULL,
    "mobileLocalId" TEXT,
    "issueNoteName" TEXT NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL,
    "centerId" INTEGER,
    "submittedByEmployeeId" INTEGER,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "canCount" INTEGER NOT NULL DEFAULT 0,
    "totalQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IssueNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IssueNoteItem" (
    "id" SERIAL NOT NULL,
    "mobileLocalId" TEXT,
    "issueNoteId" INTEGER NOT NULL,
    "canCode" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "phValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "brixValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "temperatureC" DOUBLE PRECISION,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IssueNoteItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransferNote" (
    "id" SERIAL NOT NULL,
    "mobileLocalId" TEXT,
    "transferNoteNo" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL,
    "centerId" INTEGER,
    "submittedByEmployeeId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "canCount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransferNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransferNoteItem" (
    "id" SERIAL NOT NULL,
    "mobileLocalId" TEXT,
    "transferNoteId" INTEGER NOT NULL,
    "canCode" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransferNoteItem_pkey" PRIMARY KEY ("id")
);

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

CREATE UNIQUE INDEX IF NOT EXISTS "Center_centerId_key" ON "Center"("centerId");
CREATE UNIQUE INDEX IF NOT EXISTS "IssueNote_mobileLocalId_key" ON "IssueNote"("mobileLocalId");
CREATE INDEX IF NOT EXISTS "IssueNote_status_idx" ON "IssueNote"("status");
CREATE INDEX IF NOT EXISTS "IssueNote_submittedByEmployeeId_idx" ON "IssueNote"("submittedByEmployeeId");
CREATE UNIQUE INDEX IF NOT EXISTS "IssueNoteItem_mobileLocalId_key" ON "IssueNoteItem"("mobileLocalId");
CREATE INDEX IF NOT EXISTS "IssueNoteItem_issueNoteId_idx" ON "IssueNoteItem"("issueNoteId");
CREATE UNIQUE INDEX IF NOT EXISTS "TransferNote_mobileLocalId_key" ON "TransferNote"("mobileLocalId");
CREATE INDEX IF NOT EXISTS "TransferNote_status_idx" ON "TransferNote"("status");
CREATE INDEX IF NOT EXISTS "TransferNote_submittedByEmployeeId_idx" ON "TransferNote"("submittedByEmployeeId");
CREATE UNIQUE INDEX IF NOT EXISTS "TransferNoteItem_mobileLocalId_key" ON "TransferNoteItem"("mobileLocalId");
CREATE INDEX IF NOT EXISTS "TransferNoteItem_transferNoteId_idx" ON "TransferNoteItem"("transferNoteId");
CREATE INDEX IF NOT EXISTS "MobileSyncEvent_employeeId_idx" ON "MobileSyncEvent"("employeeId");
CREATE INDEX IF NOT EXISTS "MobileSyncEvent_status_idx" ON "MobileSyncEvent"("status");
CREATE INDEX IF NOT EXISTS "MobileSyncEvent_startedAt_idx" ON "MobileSyncEvent"("startedAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'IssueNote_centerId_fkey'
    ) THEN
        ALTER TABLE "IssueNote"
        ADD CONSTRAINT "IssueNote_centerId_fkey"
        FOREIGN KEY ("centerId") REFERENCES "Center"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'IssueNote_submittedByEmployeeId_fkey'
    ) AND to_regclass('"Employee"') IS NOT NULL THEN
        ALTER TABLE "IssueNote"
        ADD CONSTRAINT "IssueNote_submittedByEmployeeId_fkey"
        FOREIGN KEY ("submittedByEmployeeId") REFERENCES "Employee"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'IssueNoteItem_issueNoteId_fkey'
    ) THEN
        ALTER TABLE "IssueNoteItem"
        ADD CONSTRAINT "IssueNoteItem_issueNoteId_fkey"
        FOREIGN KEY ("issueNoteId") REFERENCES "IssueNote"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TransferNote_centerId_fkey'
    ) THEN
        ALTER TABLE "TransferNote"
        ADD CONSTRAINT "TransferNote_centerId_fkey"
        FOREIGN KEY ("centerId") REFERENCES "Center"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TransferNote_submittedByEmployeeId_fkey'
    ) AND to_regclass('"Employee"') IS NOT NULL THEN
        ALTER TABLE "TransferNote"
        ADD CONSTRAINT "TransferNote_submittedByEmployeeId_fkey"
        FOREIGN KEY ("submittedByEmployeeId") REFERENCES "Employee"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TransferNoteItem_transferNoteId_fkey'
    ) THEN
        ALTER TABLE "TransferNoteItem"
        ADD CONSTRAINT "TransferNoteItem_transferNoteId_fkey"
        FOREIGN KEY ("transferNoteId") REFERENCES "TransferNote"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MobileSyncEvent_employeeId_fkey'
    ) AND to_regclass('"Employee"') IS NOT NULL THEN
        ALTER TABLE "MobileSyncEvent"
        ADD CONSTRAINT "MobileSyncEvent_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
