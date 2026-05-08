-- System can inventory schema.

CREATE TABLE IF NOT EXISTS "SystemCan" (
    "id" SERIAL NOT NULL,
    "canCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'In warehouse',
    "agentName" TEXT,
    "reference" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SystemCan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CanHistory" (
    "id" SERIAL NOT NULL,
    "canId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "agentName" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CanHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SystemCan_canCode_key" ON "SystemCan"("canCode");
CREATE INDEX IF NOT EXISTS "CanHistory_canId_idx" ON "CanHistory"("canId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CanHistory_canId_fkey'
    ) THEN
        ALTER TABLE "CanHistory"
        ADD CONSTRAINT "CanHistory_canId_fkey"
        FOREIGN KEY ("canId") REFERENCES "SystemCan"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
