-- KithulFlow full PostgreSQL schema.
-- Keep this file aligned with server/prisma/schema.prisma.

CREATE TABLE IF NOT EXISTS "AdminUser" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Employee" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "passwordHash" TEXT NOT NULL,
    "defaultLogin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

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

CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_userId_key" ON "AdminUser"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_userId_key" ON "Employee"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Center_centerId_key" ON "Center"("centerId");
CREATE UNIQUE INDEX IF NOT EXISTS "SystemCan_canCode_key" ON "SystemCan"("canCode");
CREATE INDEX IF NOT EXISTS "CanHistory_canId_idx" ON "CanHistory"("canId");
CREATE INDEX IF NOT EXISTS "IssueNote_status_idx" ON "IssueNote"("status");

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

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'IssueNote_centerId_fkey'
    ) THEN
        ALTER TABLE "IssueNote"
        ADD CONSTRAINT "IssueNote_centerId_fkey"
        FOREIGN KEY ("centerId") REFERENCES "Center"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
