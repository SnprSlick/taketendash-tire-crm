-- CreateEnum
CREATE TYPE "TireQuality" AS ENUM ('PREMIUM', 'STANDARD', 'ECONOMY', 'UNKNOWN');

-- AlterTable
ALTER TABLE "tire_master_products" ADD COLUMN     "quality" "TireQuality" NOT NULL DEFAULT 'UNKNOWN';
