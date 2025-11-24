-- CreateTable
CREATE TABLE "reconciliation_batches" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reconciliation_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_records" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3),
    "invoiceAmount" DECIMAL(10,2) NOT NULL,
    "creditAmount" DECIMAL(10,2) NOT NULL,
    "commission" DECIMAL(10,2) NOT NULL,
    "difference" DECIMAL(10,2) NOT NULL,
    "category" TEXT,
    "subCategory" TEXT,
    "status" TEXT NOT NULL,
    "matchedInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reconciliation_records_batchId_idx" ON "reconciliation_records"("batchId");

-- CreateIndex
CREATE INDEX "reconciliation_records_invoiceNumber_idx" ON "reconciliation_records"("invoiceNumber");

-- CreateIndex
CREATE INDEX "reconciliation_records_status_idx" ON "reconciliation_records"("status");

-- AddForeignKey
ALTER TABLE "reconciliation_records" ADD CONSTRAINT "reconciliation_records_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "reconciliation_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_records" ADD CONSTRAINT "reconciliation_records_matchedInvoiceId_fkey" FOREIGN KEY ("matchedInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
