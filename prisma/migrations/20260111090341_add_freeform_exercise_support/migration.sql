-- AlterTable
ALTER TABLE "WorkoutSet" ADD COLUMN "exerciseType" TEXT NOT NULL DEFAULT 'resistance';
ALTER TABLE "WorkoutSet" ADD COLUMN "durationMinutes" INTEGER;
ALTER TABLE "WorkoutSet" ALTER COLUMN "reps" DROP NOT NULL;
