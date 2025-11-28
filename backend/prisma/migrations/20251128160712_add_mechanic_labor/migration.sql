-- CreateTable
CREATE TABLE "mechanic_labor" (
    "id" TEXT NOT NULL,
    "mechanic_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "parts" DECIMAL(10,2) NOT NULL,
    "labor" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "gross_profit" DECIMAL(10,2) NOT NULL,
    "gp_percent" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mechanic_labor_pkey" PRIMARY KEY ("id")
);
