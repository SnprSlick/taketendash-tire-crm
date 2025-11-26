-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TireType" ADD VALUE 'MEDIUM_TRUCK';
ALTER TYPE "TireType" ADD VALUE 'INDUSTRIAL';
ALTER TYPE "TireType" ADD VALUE 'AGRICULTURAL';
ALTER TYPE "TireType" ADD VALUE 'OTR';
ALTER TYPE "TireType" ADD VALUE 'TRAILER';
ALTER TYPE "TireType" ADD VALUE 'ATV_UTV';
ALTER TYPE "TireType" ADD VALUE 'LAWN_GARDEN';
ALTER TYPE "TireType" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "tire_master_products" ADD COLUMN     "isTire" BOOLEAN NOT NULL DEFAULT false;
