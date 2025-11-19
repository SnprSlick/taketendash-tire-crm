/*
  Warnings:

  - You are about to drop the column `accountManagerId` on the `large_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `companyName` on the `large_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `discountRate` on the `large_accounts` table. All the data in the column will be lost.
  - Added the required column `accountManager` to the `large_accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountType` to the `large_accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tier` to the `large_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LargeAccountType" AS ENUM ('COMMERCIAL', 'FLEET', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "LargeAccountTier" AS ENUM ('SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "LargeAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ServiceLevel" AS ENUM ('STANDARD', 'ENHANCED', 'PREMIUM');

-- DropForeignKey
ALTER TABLE "large_accounts" DROP CONSTRAINT "large_accounts_accountManagerId_fkey";

-- DropIndex
DROP INDEX "large_accounts_accountManagerId_idx";

-- AlterTable
ALTER TABLE "large_accounts" DROP COLUMN "accountManagerId",
DROP COLUMN "companyName",
DROP COLUMN "discountRate",
ADD COLUMN     "accountManager" VARCHAR(100) NOT NULL,
ADD COLUMN     "accountType" "LargeAccountType" NOT NULL,
ADD COLUMN     "annualRevenue" DECIMAL(12,2),
ADD COLUMN     "discountTier" INTEGER,
ADD COLUMN     "priorityRanking" INTEGER,
ADD COLUMN     "serviceLevel" "ServiceLevel" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "specialTerms" TEXT,
ADD COLUMN     "status" "LargeAccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "tier" "LargeAccountTier" NOT NULL;

-- CreateIndex
CREATE INDEX "large_accounts_tier_idx" ON "large_accounts"("tier");

-- CreateIndex
CREATE INDEX "large_accounts_status_idx" ON "large_accounts"("status");

-- CreateIndex
CREATE INDEX "large_accounts_accountType_idx" ON "large_accounts"("accountType");
