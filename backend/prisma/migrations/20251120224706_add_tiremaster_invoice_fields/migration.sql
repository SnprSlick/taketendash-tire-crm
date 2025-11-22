/*
  Warnings:

  - You are about to drop the column `unit_price` on the `invoice_line_items` table. All the data in the column will be lost.
  - Added the required column `fet` to the `invoice_line_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `labor_cost` to the `invoice_line_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parts_cost` to the `invoice_line_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "invoice_line_items" DROP CONSTRAINT "invoice_line_items_invoice_id_fkey";

-- AlterTable
ALTER TABLE "invoice_line_items" DROP COLUMN "unit_price",
ADD COLUMN     "adjustment" VARCHAR(50),
ADD COLUMN     "fet" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "labor_cost" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "line_number" INTEGER,
ADD COLUMN     "parts_cost" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "fet_total" DECIMAL(10,2),
ADD COLUMN     "gross_profit" DECIMAL(10,2),
ADD COLUMN     "mileage" VARCHAR(50),
ADD COLUMN     "total_cost" DECIMAL(10,2),
ADD COLUMN     "vehicle_info" VARCHAR(255);

-- CreateIndex
CREATE INDEX "invoices_salesperson_idx" ON "invoices"("salesperson");

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
