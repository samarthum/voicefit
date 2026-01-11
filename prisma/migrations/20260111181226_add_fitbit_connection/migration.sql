-- CreateTable
CREATE TABLE "FitbitConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fitbitUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FitbitConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FitbitConnection_userId_key" ON "FitbitConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FitbitConnection_fitbitUserId_key" ON "FitbitConnection"("fitbitUserId");

-- AddForeignKey
ALTER TABLE "FitbitConnection" ADD CONSTRAINT "FitbitConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
