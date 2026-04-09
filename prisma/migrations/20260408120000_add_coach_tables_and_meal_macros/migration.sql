-- AlterTable
ALTER TABLE "MealLog" ADD COLUMN "proteinG" DOUBLE PRECISION;
ALTER TABLE "MealLog" ADD COLUMN "carbsG" DOUBLE PRECISION;
ALTER TABLE "MealLog" ADD COLUMN "fatG" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "CoachProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goal" TEXT,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "age" INTEGER,
    "biologicalSex" TEXT,
    "dietaryStyle" TEXT,
    "dietaryRestrictions" TEXT,
    "trainingExperience" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_userId_key" ON "CoachProfile"("userId");

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachMessage_userId_createdAt_idx" ON "CoachMessage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "UserFact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fact" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'coach_save_fact',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFact_userId_category_idx" ON "UserFact"("userId", "category");

-- AddForeignKey
ALTER TABLE "UserFact" ADD CONSTRAINT "UserFact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
