-- AlterTable
ALTER TABLE "invoice_line_items" ADD COLUMN     "tire_master_product_id" TEXT;

-- AlterTable
ALTER TABLE "tire_master_products" ADD COLUMN     "fet_amount" DECIMAL(10,2),
ADD COLUMN     "labor_price" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "invoice_line_items_tire_master_product_id_idx" ON "invoice_line_items"("tire_master_product_id");

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_tire_master_product_id_fkey" FOREIGN KEY ("tire_master_product_id") REFERENCES "tire_master_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
