-- AlterTable
ALTER TABLE "MealLog" ADD COLUMN "interpretationStatus" TEXT NOT NULL DEFAULT 'reviewed';
ALTER TABLE "MealLog" ALTER COLUMN "calories" DROP NOT NULL;

-- Existing meals predate async interpretation and are already user-visible logs.
UPDATE "MealLog" SET "interpretationStatus" = 'reviewed' WHERE "interpretationStatus" IS NULL;

-- CreateIndex
CREATE INDEX "MealLog_userId_interpretationStatus_idx" ON "MealLog"("userId", "interpretationStatus");
