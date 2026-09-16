-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN     "state" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT true;

