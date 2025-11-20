-- AlterEnum
ALTER TYPE "ImportStatus" ADD VALUE 'ROLLED_BACK';

-- CreateTable
CREATE TABLE "import_rollback_operations" (
    "id" TEXT NOT NULL,
    "import_batch_id" TEXT NOT NULL,
    "operation_type" VARCHAR(50) NOT NULL,
    "record_id" VARCHAR(100) NOT NULL,
    "table_name" VARCHAR(100) NOT NULL,
    "operation" VARCHAR(20) NOT NULL,
    "original_data" TEXT,
    "new_data" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_rollback_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_rollback_operations_import_batch_id_idx" ON "import_rollback_operations"("import_batch_id");

-- CreateIndex
CREATE INDEX "import_rollback_operations_operation_type_idx" ON "import_rollback_operations"("operation_type");

-- CreateIndex
CREATE INDEX "import_rollback_operations_table_name_idx" ON "import_rollback_operations"("table_name");

-- CreateIndex
CREATE INDEX "import_rollback_operations_timestamp_idx" ON "import_rollback_operations"("timestamp");

-- AddForeignKey
ALTER TABLE "import_rollback_operations" ADD CONSTRAINT "import_rollback_operations_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
