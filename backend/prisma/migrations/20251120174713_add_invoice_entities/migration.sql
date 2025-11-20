/*
  Warnings:

  - You are about to alter the column `quantity` on the `sales_data` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,3)`.

*/
-- CreateEnum
CREATE TYPE "TireType" AS ENUM ('PASSENGER', 'LIGHT_TRUCK', 'COMMERCIAL', 'SPECIALTY');

-- CreateEnum
CREATE TYPE "TireSeason" AS ENUM ('ALL_SEASON', 'SUMMER', 'WINTER');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ACTIVE', 'VOIDED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('TIRES', 'SERVICES', 'PARTS', 'FEES', 'OTHER');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ErrorType" AS ENUM ('VALIDATION', 'DUPLICATE', 'MISSING_DATA', 'FORMAT', 'BUSINESS_RULE');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('TIRE_MASTER_SYNC', 'INVOICE_IMPORT');

-- CreateEnum
CREATE TYPE "MappingType" AS ENUM ('EXACT', 'EQUIVALENT', 'SUBSTITUTE');

-- AlterTable
ALTER TABLE "sales_data" ADD COLUMN     "costBasis" DECIMAL(10,2),
ADD COLUMN     "grossProfitMargin" DECIMAL(5,2),
ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "sourceType" "DataSourceType" NOT NULL DEFAULT 'TIRE_MASTER_SYNC',
ALTER COLUMN "tireMasterId" DROP NOT NULL,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,3);

-- CreateTable
CREATE TABLE "invoice_customers" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "customerCode" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "customer_id" TEXT NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "salesperson" VARCHAR(255) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "labor_cost" DECIMAL(10,2),
    "parts_cost" DECIMAL(10,2),
    "environmental_fee" DECIMAL(10,2),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "import_batch_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "product_code" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "line_total" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2) NOT NULL,
    "gross_profit_margin" DECIMAL(5,2) NOT NULL,
    "gross_profit" DECIMAL(10,2) NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_path" VARCHAR(500) NOT NULL,
    "processed_path" VARCHAR(500),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "total_records" INTEGER NOT NULL,
    "successful_records" INTEGER NOT NULL DEFAULT 0,
    "failed_records" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportStatus" NOT NULL DEFAULT 'STARTED',
    "user_id" VARCHAR(100),
    "error_summary" TEXT,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_errors" (
    "id" TEXT NOT NULL,
    "import_batch_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "error_type" "ErrorType" NOT NULL,
    "error_message" TEXT NOT NULL,
    "original_data" TEXT NOT NULL,
    "field_name" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_master_products" (
    "id" TEXT NOT NULL,
    "tireMasterSku" VARCHAR(50) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "pattern" VARCHAR(100) NOT NULL,
    "size" VARCHAR(50) NOT NULL,
    "type" "TireType" NOT NULL,
    "season" "TireSeason" NOT NULL,
    "description" TEXT,
    "weight" DECIMAL(8,2),
    "specifications" JSONB,
    "warrantyInfo" TEXT,
    "features" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_master_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_master_locations" (
    "id" TEXT NOT NULL,
    "tireMasterCode" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(200),
    "city" VARCHAR(50),
    "state" VARCHAR(20),
    "zipCode" VARCHAR(10),
    "phone" VARCHAR(20),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_master_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_master_inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "availableQty" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_master_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_master_price_lists" (
    "id" TEXT NOT NULL,
    "tireMasterCode" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "effectiveDate" DATE,
    "expirationDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_master_price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_master_prices" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "listPrice" DECIMAL(10,2) NOT NULL,
    "cost" DECIMAL(10,2),
    "msrp" DECIMAL(10,2),
    "effectiveDate" DATE,
    "expirationDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_master_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_master_customers" (
    "id" TEXT NOT NULL,
    "tireMasterCode" VARCHAR(50) NOT NULL,
    "companyName" VARCHAR(100),
    "firstName" VARCHAR(50),
    "lastName" VARCHAR(50),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "address" VARCHAR(200),
    "city" VARCHAR(50),
    "state" VARCHAR(20),
    "zipCode" VARCHAR(10),
    "creditLimit" DECIMAL(12,2),
    "paymentTerms" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_master_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_master_sales_orders" (
    "id" TEXT NOT NULL,
    "tireMasterCode" VARCHAR(50) NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderNumber" VARCHAR(50) NOT NULL,
    "orderDate" DATE NOT NULL,
    "requiredDate" DATE,
    "shippedDate" DATE,
    "status" VARCHAR(50) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(10,2),
    "shippingAmount" DECIMAL(10,2),
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_master_sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_master_sales_order_items" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2),
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_master_sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_master_product_mappings" (
    "id" TEXT NOT NULL,
    "tireMasterProductId" TEXT NOT NULL,
    "crmProductId" TEXT,
    "mappingType" "MappingType" NOT NULL,
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_master_product_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_master_sync_history" (
    "id" TEXT NOT NULL,
    "syncId" VARCHAR(100) NOT NULL,
    "syncType" VARCHAR(50) NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_master_sync_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_customers_name_key" ON "invoice_customers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_invoice_date_idx" ON "invoices"("invoice_date");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_import_batch_id_idx" ON "invoices"("import_batch_id");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_line_items_product_code_idx" ON "invoice_line_items"("product_code");

-- CreateIndex
CREATE INDEX "invoice_line_items_category_idx" ON "invoice_line_items"("category");

-- CreateIndex
CREATE INDEX "import_batches_started_at_idx" ON "import_batches"("started_at");

-- CreateIndex
CREATE INDEX "import_batches_status_idx" ON "import_batches"("status");

-- CreateIndex
CREATE INDEX "import_errors_import_batch_id_idx" ON "import_errors"("import_batch_id");

-- CreateIndex
CREATE INDEX "import_errors_error_type_idx" ON "import_errors"("error_type");

-- CreateIndex
CREATE UNIQUE INDEX "tire_master_products_tireMasterSku_key" ON "tire_master_products"("tireMasterSku");

-- CreateIndex
CREATE INDEX "tire_master_products_brand_idx" ON "tire_master_products"("brand");

-- CreateIndex
CREATE INDEX "tire_master_products_size_idx" ON "tire_master_products"("size");

-- CreateIndex
CREATE INDEX "tire_master_products_type_idx" ON "tire_master_products"("type");

-- CreateIndex
CREATE INDEX "tire_master_products_season_idx" ON "tire_master_products"("season");

-- CreateIndex
CREATE INDEX "tire_master_products_isActive_idx" ON "tire_master_products"("isActive");

-- CreateIndex
CREATE INDEX "tire_master_products_lastSyncedAt_idx" ON "tire_master_products"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tire_master_locations_tireMasterCode_key" ON "tire_master_locations"("tireMasterCode");

-- CreateIndex
CREATE INDEX "tire_master_locations_tireMasterCode_idx" ON "tire_master_locations"("tireMasterCode");

-- CreateIndex
CREATE INDEX "tire_master_locations_isActive_idx" ON "tire_master_locations"("isActive");

-- CreateIndex
CREATE INDEX "tire_master_inventory_productId_idx" ON "tire_master_inventory"("productId");

-- CreateIndex
CREATE INDEX "tire_master_inventory_locationId_idx" ON "tire_master_inventory"("locationId");

-- CreateIndex
CREATE INDEX "tire_master_inventory_quantity_idx" ON "tire_master_inventory"("quantity");

-- CreateIndex
CREATE INDEX "tire_master_inventory_lastUpdated_idx" ON "tire_master_inventory"("lastUpdated");

-- CreateIndex
CREATE UNIQUE INDEX "tire_master_inventory_productId_locationId_key" ON "tire_master_inventory"("productId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "tire_master_price_lists_tireMasterCode_key" ON "tire_master_price_lists"("tireMasterCode");

-- CreateIndex
CREATE INDEX "tire_master_price_lists_tireMasterCode_idx" ON "tire_master_price_lists"("tireMasterCode");

-- CreateIndex
CREATE INDEX "tire_master_price_lists_isActive_idx" ON "tire_master_price_lists"("isActive");

-- CreateIndex
CREATE INDEX "tire_master_price_lists_effectiveDate_idx" ON "tire_master_price_lists"("effectiveDate");

-- CreateIndex
CREATE INDEX "tire_master_prices_productId_idx" ON "tire_master_prices"("productId");

-- CreateIndex
CREATE INDEX "tire_master_prices_priceListId_idx" ON "tire_master_prices"("priceListId");

-- CreateIndex
CREATE INDEX "tire_master_prices_effectiveDate_idx" ON "tire_master_prices"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "tire_master_prices_productId_priceListId_key" ON "tire_master_prices"("productId", "priceListId");

-- CreateIndex
CREATE UNIQUE INDEX "tire_master_customers_tireMasterCode_key" ON "tire_master_customers"("tireMasterCode");

-- CreateIndex
CREATE INDEX "tire_master_customers_tireMasterCode_idx" ON "tire_master_customers"("tireMasterCode");

-- CreateIndex
CREATE INDEX "tire_master_customers_companyName_idx" ON "tire_master_customers"("companyName");

-- CreateIndex
CREATE INDEX "tire_master_customers_isActive_idx" ON "tire_master_customers"("isActive");

-- CreateIndex
CREATE INDEX "tire_master_customers_lastSyncedAt_idx" ON "tire_master_customers"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tire_master_sales_orders_tireMasterCode_key" ON "tire_master_sales_orders"("tireMasterCode");

-- CreateIndex
CREATE INDEX "tire_master_sales_orders_tireMasterCode_idx" ON "tire_master_sales_orders"("tireMasterCode");

-- CreateIndex
CREATE INDEX "tire_master_sales_orders_customerId_idx" ON "tire_master_sales_orders"("customerId");

-- CreateIndex
CREATE INDEX "tire_master_sales_orders_orderDate_idx" ON "tire_master_sales_orders"("orderDate");

-- CreateIndex
CREATE INDEX "tire_master_sales_orders_status_idx" ON "tire_master_sales_orders"("status");

-- CreateIndex
CREATE INDEX "tire_master_sales_orders_lastSyncedAt_idx" ON "tire_master_sales_orders"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "tire_master_sales_order_items_salesOrderId_idx" ON "tire_master_sales_order_items"("salesOrderId");

-- CreateIndex
CREATE INDEX "tire_master_sales_order_items_productId_idx" ON "tire_master_sales_order_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "tire_master_sales_order_items_salesOrderId_lineNumber_key" ON "tire_master_sales_order_items"("salesOrderId", "lineNumber");

-- CreateIndex
CREATE INDEX "tire_master_product_mappings_tireMasterProductId_idx" ON "tire_master_product_mappings"("tireMasterProductId");

-- CreateIndex
CREATE INDEX "tire_master_product_mappings_crmProductId_idx" ON "tire_master_product_mappings"("crmProductId");

-- CreateIndex
CREATE INDEX "tire_master_product_mappings_mappingType_idx" ON "tire_master_product_mappings"("mappingType");

-- CreateIndex
CREATE INDEX "tire_master_product_mappings_autoSync_idx" ON "tire_master_product_mappings"("autoSync");

-- CreateIndex
CREATE UNIQUE INDEX "tire_master_product_mappings_tireMasterProductId_crmProduct_key" ON "tire_master_product_mappings"("tireMasterProductId", "crmProductId");

-- CreateIndex
CREATE UNIQUE INDEX "tire_master_sync_history_syncId_key" ON "tire_master_sync_history"("syncId");

-- CreateIndex
CREATE INDEX "tire_master_sync_history_syncId_idx" ON "tire_master_sync_history"("syncId");

-- CreateIndex
CREATE INDEX "tire_master_sync_history_syncType_idx" ON "tire_master_sync_history"("syncType");

-- CreateIndex
CREATE INDEX "tire_master_sync_history_status_idx" ON "tire_master_sync_history"("status");

-- CreateIndex
CREATE INDEX "tire_master_sync_history_startTime_idx" ON "tire_master_sync_history"("startTime");

-- CreateIndex
CREATE INDEX "sales_data_invoiceId_idx" ON "sales_data"("invoiceId");

-- CreateIndex
CREATE INDEX "sales_data_sourceType_idx" ON "sales_data"("sourceType");

-- AddForeignKey
ALTER TABLE "sales_data" ADD CONSTRAINT "sales_data_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "invoice_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_errors" ADD CONSTRAINT "import_errors_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_master_inventory" ADD CONSTRAINT "tire_master_inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "tire_master_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_master_inventory" ADD CONSTRAINT "tire_master_inventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "tire_master_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_master_prices" ADD CONSTRAINT "tire_master_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "tire_master_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_master_prices" ADD CONSTRAINT "tire_master_prices_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "tire_master_price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_master_sales_orders" ADD CONSTRAINT "tire_master_sales_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "tire_master_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_master_sales_order_items" ADD CONSTRAINT "tire_master_sales_order_items_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "tire_master_sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_master_sales_order_items" ADD CONSTRAINT "tire_master_sales_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "tire_master_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_master_product_mappings" ADD CONSTRAINT "tire_master_product_mappings_tireMasterProductId_fkey" FOREIGN KEY ("tireMasterProductId") REFERENCES "tire_master_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
