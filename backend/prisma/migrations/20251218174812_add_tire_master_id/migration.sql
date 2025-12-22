/*
  Warnings:

  - A unique constraint covering the columns `[tire_master_id]` on the table `tire_master_products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "tire_master_products" ADD COLUMN     "tire_master_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "tire_master_products_tire_master_id_key" ON "tire_master_products"("tire_master_id");
