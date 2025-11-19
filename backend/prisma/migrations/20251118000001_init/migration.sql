-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('INDIVIDUAL', 'LARGE_ACCOUNT');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CommunicationMethod" AS ENUM ('EMAIL', 'SMS', 'PHONE', 'ALL');

-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('MANAGER', 'SERVICE_ADVISOR', 'ACCOUNT_MANAGER', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'DISMISSED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'REFUND', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20) NOT NULL,
    "address" VARCHAR(200),
    "city" VARCHAR(50),
    "state" VARCHAR(20),
    "zipCode" VARCHAR(10),
    "accountType" "AccountType" NOT NULL DEFAULT 'INDIVIDUAL',
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "preferredCommunication" "CommunicationMethod" NOT NULL DEFAULT 'EMAIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "make" VARCHAR(30) NOT NULL,
    "model" VARCHAR(30) NOT NULL,
    "year" INTEGER NOT NULL,
    "vin" VARCHAR(17),
    "licensePlate" VARCHAR(10),
    "mileage" INTEGER,
    "tireSize" VARCHAR(20),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "employeeId" VARCHAR(20) NOT NULL,
    "hourlyRate" DECIMAL(10,2),
    "hireDate" DATE NOT NULL,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_records" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "serviceMasterId" VARCHAR(50),
    "serviceDate" DATE NOT NULL,
    "serviceType" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "laborHours" DECIMAL(5,2) NOT NULL,
    "partsCost" DECIMAL(10,2) NOT NULL,
    "laborCost" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "appointmentDate" DATE NOT NULL,
    "appointmentTime" TIME NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "serviceType" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "confirmationSent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_reminders" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "lastServiceId" TEXT,
    "reminderType" VARCHAR(50) NOT NULL,
    "reminderDate" DATE NOT NULL,
    "reminderMessage" TEXT NOT NULL,
    "sentDate" DATE,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "communicationMethod" "CommunicationMethod" NOT NULL DEFAULT 'EMAIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "large_accounts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "accountManagerId" TEXT NOT NULL,
    "companyName" VARCHAR(100) NOT NULL,
    "contractNumber" VARCHAR(50),
    "contractStartDate" DATE,
    "contractEndDate" DATE,
    "creditLimit" DECIMAL(12,2),
    "paymentTerms" VARCHAR(50),
    "discountRate" DECIMAL(5,2),
    "billingContact" VARCHAR(100),
    "billingEmail" VARCHAR(255),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "large_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_data" (
    "id" TEXT NOT NULL,
    "tireMasterId" VARCHAR(50) NOT NULL,
    "serviceRecordId" TEXT,
    "customerId" TEXT,
    "employeeId" TEXT,
    "transactionDate" DATE NOT NULL,
    "transactionType" "TransactionType" NOT NULL DEFAULT 'SALE',
    "category" VARCHAR(50) NOT NULL,
    "itemDescription" VARCHAR(200) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_lastName_firstName_idx" ON "customers"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE INDEX "vehicles_customerId_idx" ON "vehicles"("customerId");

-- CreateIndex
CREATE INDEX "vehicles_customerId_make_model_year_idx" ON "vehicles"("customerId", "make", "model", "year");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeId_key" ON "employees"("employeeId");

-- CreateIndex
CREATE INDEX "employees_role_idx" ON "employees"("role");

-- CreateIndex
CREATE INDEX "service_records_customerId_idx" ON "service_records"("customerId");

-- CreateIndex
CREATE INDEX "service_records_vehicleId_idx" ON "service_records"("vehicleId");

-- CreateIndex
CREATE INDEX "service_records_employeeId_idx" ON "service_records"("employeeId");

-- CreateIndex
CREATE INDEX "service_records_serviceDate_customerId_idx" ON "service_records"("serviceDate", "customerId");

-- CreateIndex
CREATE INDEX "service_records_serviceMasterId_idx" ON "service_records"("serviceMasterId");

-- CreateIndex
CREATE INDEX "appointments_customerId_idx" ON "appointments"("customerId");

-- CreateIndex
CREATE INDEX "appointments_vehicleId_idx" ON "appointments"("vehicleId");

-- CreateIndex
CREATE INDEX "appointments_employeeId_idx" ON "appointments"("employeeId");

-- CreateIndex
CREATE INDEX "appointments_appointmentDate_appointmentTime_idx" ON "appointments"("appointmentDate", "appointmentTime");

-- CreateIndex
CREATE INDEX "appointments_employeeId_appointmentDate_idx" ON "appointments"("employeeId", "appointmentDate");

-- CreateIndex
CREATE INDEX "service_reminders_customerId_idx" ON "service_reminders"("customerId");

-- CreateIndex
CREATE INDEX "service_reminders_vehicleId_idx" ON "service_reminders"("vehicleId");

-- CreateIndex
CREATE INDEX "service_reminders_lastServiceId_idx" ON "service_reminders"("lastServiceId");

-- CreateIndex
CREATE INDEX "service_reminders_reminderDate_status_idx" ON "service_reminders"("reminderDate", "status");

-- CreateIndex
CREATE INDEX "service_reminders_status_idx" ON "service_reminders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "large_accounts_customerId_key" ON "large_accounts"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "large_accounts_contractNumber_key" ON "large_accounts"("contractNumber");

-- CreateIndex
CREATE INDEX "large_accounts_accountManagerId_idx" ON "large_accounts"("accountManagerId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_data_tireMasterId_key" ON "sales_data"("tireMasterId");

-- CreateIndex
CREATE INDEX "sales_data_serviceRecordId_idx" ON "sales_data"("serviceRecordId");

-- CreateIndex
CREATE INDEX "sales_data_customerId_idx" ON "sales_data"("customerId");

-- CreateIndex
CREATE INDEX "sales_data_employeeId_idx" ON "sales_data"("employeeId");

-- CreateIndex
CREATE INDEX "sales_data_transactionDate_category_idx" ON "sales_data"("transactionDate", "category");

-- CreateIndex
CREATE INDEX "sales_data_transactionType_idx" ON "sales_data"("transactionType");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_reminders" ADD CONSTRAINT "service_reminders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_reminders" ADD CONSTRAINT "service_reminders_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_reminders" ADD CONSTRAINT "service_reminders_lastServiceId_fkey" FOREIGN KEY ("lastServiceId") REFERENCES "service_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "large_accounts" ADD CONSTRAINT "large_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "large_accounts" ADD CONSTRAINT "large_accounts_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_data" ADD CONSTRAINT "sales_data_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "service_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_data" ADD CONSTRAINT "sales_data_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_data" ADD CONSTRAINT "sales_data_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;