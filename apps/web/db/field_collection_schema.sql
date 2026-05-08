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
    "issueNoteName" TEXT NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL,
    "centerId" INTEGER,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "canCount" INTEGER NOT NULL DEFAULT 0,
    "totalQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IssueNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Center_centerId_key" ON "Center"("centerId");
CREATE INDEX IF NOT EXISTS "IssueNote_status_idx" ON "IssueNote"("status");

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
END $$;
