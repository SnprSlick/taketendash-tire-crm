--
-- PostgreSQL database dump
--

\restrict Jha75EpKlOxbWQe9CQX2cMA9RLRHyt4ClhvJ0aAfj7jgPjqTlL8ZdbvowjpWeeI

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.vehicles DROP CONSTRAINT IF EXISTS "vehicles_customerId_fkey";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "users_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public.tire_master_sales_orders DROP CONSTRAINT IF EXISTS "tire_master_sales_orders_customerId_fkey";
ALTER TABLE IF EXISTS ONLY public.tire_master_sales_order_items DROP CONSTRAINT IF EXISTS "tire_master_sales_order_items_salesOrderId_fkey";
ALTER TABLE IF EXISTS ONLY public.tire_master_sales_order_items DROP CONSTRAINT IF EXISTS "tire_master_sales_order_items_productId_fkey";
ALTER TABLE IF EXISTS ONLY public.tire_master_product_mappings DROP CONSTRAINT IF EXISTS "tire_master_product_mappings_tireMasterProductId_fkey";
ALTER TABLE IF EXISTS ONLY public.tire_master_prices DROP CONSTRAINT IF EXISTS "tire_master_prices_productId_fkey";
ALTER TABLE IF EXISTS ONLY public.tire_master_prices DROP CONSTRAINT IF EXISTS "tire_master_prices_priceListId_fkey";
ALTER TABLE IF EXISTS ONLY public.tire_master_inventory DROP CONSTRAINT IF EXISTS "tire_master_inventory_productId_fkey";
ALTER TABLE IF EXISTS ONLY public.tire_master_inventory DROP CONSTRAINT IF EXISTS "tire_master_inventory_locationId_fkey";
ALTER TABLE IF EXISTS ONLY public.service_reminders DROP CONSTRAINT IF EXISTS "service_reminders_vehicleId_fkey";
ALTER TABLE IF EXISTS ONLY public.service_reminders DROP CONSTRAINT IF EXISTS "service_reminders_lastServiceId_fkey";
ALTER TABLE IF EXISTS ONLY public.service_reminders DROP CONSTRAINT IF EXISTS "service_reminders_customerId_fkey";
ALTER TABLE IF EXISTS ONLY public.service_records DROP CONSTRAINT IF EXISTS "service_records_vehicleId_fkey";
ALTER TABLE IF EXISTS ONLY public.service_records DROP CONSTRAINT IF EXISTS "service_records_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public.service_records DROP CONSTRAINT IF EXISTS "service_records_customerId_fkey";
ALTER TABLE IF EXISTS ONLY public.sales_data DROP CONSTRAINT IF EXISTS "sales_data_serviceRecordId_fkey";
ALTER TABLE IF EXISTS ONLY public.sales_data DROP CONSTRAINT IF EXISTS "sales_data_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public.sales_data DROP CONSTRAINT IF EXISTS "sales_data_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public.sales_data DROP CONSTRAINT IF EXISTS "sales_data_customerId_fkey";
ALTER TABLE IF EXISTS ONLY public.reconciliation_records DROP CONSTRAINT IF EXISTS "reconciliation_records_matchedInvoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public.reconciliation_records DROP CONSTRAINT IF EXISTS "reconciliation_records_batchId_fkey";
ALTER TABLE IF EXISTS ONLY public.large_accounts DROP CONSTRAINT IF EXISTS "large_accounts_customerId_fkey";
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_store_id_fkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_import_batch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_tire_master_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY public.import_rollback_operations DROP CONSTRAINT IF EXISTS import_rollback_operations_import_batch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.import_errors DROP CONSTRAINT IF EXISTS import_errors_import_batch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS "appointments_vehicleId_fkey";
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS "appointments_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS "appointments_customerId_fkey";
ALTER TABLE IF EXISTS ONLY public."_StoreToUser" DROP CONSTRAINT IF EXISTS "_StoreToUser_B_fkey";
ALTER TABLE IF EXISTS ONLY public."_StoreToUser" DROP CONSTRAINT IF EXISTS "_StoreToUser_A_fkey";
ALTER TABLE IF EXISTS ONLY public."_EmployeeToStore" DROP CONSTRAINT IF EXISTS "_EmployeeToStore_B_fkey";
ALTER TABLE IF EXISTS ONLY public."_EmployeeToStore" DROP CONSTRAINT IF EXISTS "_EmployeeToStore_A_fkey";
DROP INDEX IF EXISTS public.vehicles_vin_key;
DROP INDEX IF EXISTS public."vehicles_customerId_make_model_year_idx";
DROP INDEX IF EXISTS public."vehicles_customerId_idx";
DROP INDEX IF EXISTS public.users_username_key;
DROP INDEX IF EXISTS public."users_employeeId_key";
DROP INDEX IF EXISTS public.users_email_key;
DROP INDEX IF EXISTS public."tire_master_sync_history_syncType_idx";
DROP INDEX IF EXISTS public."tire_master_sync_history_syncId_key";
DROP INDEX IF EXISTS public."tire_master_sync_history_syncId_idx";
DROP INDEX IF EXISTS public.tire_master_sync_history_status_idx;
DROP INDEX IF EXISTS public."tire_master_sync_history_startTime_idx";
DROP INDEX IF EXISTS public."tire_master_sales_orders_tireMasterCode_key";
DROP INDEX IF EXISTS public."tire_master_sales_orders_tireMasterCode_idx";
DROP INDEX IF EXISTS public.tire_master_sales_orders_status_idx;
DROP INDEX IF EXISTS public."tire_master_sales_orders_orderDate_idx";
DROP INDEX IF EXISTS public."tire_master_sales_orders_lastSyncedAt_idx";
DROP INDEX IF EXISTS public."tire_master_sales_orders_customerId_idx";
DROP INDEX IF EXISTS public."tire_master_sales_order_items_salesOrderId_lineNumber_key";
DROP INDEX IF EXISTS public."tire_master_sales_order_items_salesOrderId_idx";
DROP INDEX IF EXISTS public."tire_master_sales_order_items_productId_idx";
DROP INDEX IF EXISTS public.tire_master_products_type_idx;
DROP INDEX IF EXISTS public."tire_master_products_tireMasterSku_key";
DROP INDEX IF EXISTS public.tire_master_products_size_idx;
DROP INDEX IF EXISTS public.tire_master_products_season_idx;
DROP INDEX IF EXISTS public."tire_master_products_lastSyncedAt_idx";
DROP INDEX IF EXISTS public."tire_master_products_isActive_idx";
DROP INDEX IF EXISTS public.tire_master_products_brand_idx;
DROP INDEX IF EXISTS public."tire_master_product_mappings_tireMasterProductId_idx";
DROP INDEX IF EXISTS public."tire_master_product_mappings_tireMasterProductId_crmProduct_key";
DROP INDEX IF EXISTS public."tire_master_product_mappings_mappingType_idx";
DROP INDEX IF EXISTS public."tire_master_product_mappings_crmProductId_idx";
DROP INDEX IF EXISTS public."tire_master_product_mappings_autoSync_idx";
DROP INDEX IF EXISTS public."tire_master_prices_productId_priceListId_key";
DROP INDEX IF EXISTS public."tire_master_prices_productId_idx";
DROP INDEX IF EXISTS public."tire_master_prices_priceListId_idx";
DROP INDEX IF EXISTS public."tire_master_prices_effectiveDate_idx";
DROP INDEX IF EXISTS public."tire_master_price_lists_tireMasterCode_key";
DROP INDEX IF EXISTS public."tire_master_price_lists_tireMasterCode_idx";
DROP INDEX IF EXISTS public."tire_master_price_lists_isActive_idx";
DROP INDEX IF EXISTS public."tire_master_price_lists_effectiveDate_idx";
DROP INDEX IF EXISTS public."tire_master_locations_tireMasterCode_key";
DROP INDEX IF EXISTS public."tire_master_locations_tireMasterCode_idx";
DROP INDEX IF EXISTS public."tire_master_locations_isActive_idx";
DROP INDEX IF EXISTS public.tire_master_inventory_quantity_idx;
DROP INDEX IF EXISTS public."tire_master_inventory_productId_locationId_key";
DROP INDEX IF EXISTS public."tire_master_inventory_productId_idx";
DROP INDEX IF EXISTS public."tire_master_inventory_locationId_idx";
DROP INDEX IF EXISTS public."tire_master_inventory_lastUpdated_idx";
DROP INDEX IF EXISTS public."tire_master_customers_tireMasterCode_key";
DROP INDEX IF EXISTS public."tire_master_customers_tireMasterCode_idx";
DROP INDEX IF EXISTS public."tire_master_customers_lastSyncedAt_idx";
DROP INDEX IF EXISTS public."tire_master_customers_isActive_idx";
DROP INDEX IF EXISTS public."tire_master_customers_companyName_idx";
DROP INDEX IF EXISTS public.stores_code_key;
DROP INDEX IF EXISTS public."service_reminders_vehicleId_idx";
DROP INDEX IF EXISTS public.service_reminders_status_idx;
DROP INDEX IF EXISTS public."service_reminders_reminderDate_status_idx";
DROP INDEX IF EXISTS public."service_reminders_lastServiceId_idx";
DROP INDEX IF EXISTS public."service_reminders_customerId_idx";
DROP INDEX IF EXISTS public."service_records_vehicleId_idx";
DROP INDEX IF EXISTS public."service_records_serviceMasterId_idx";
DROP INDEX IF EXISTS public."service_records_serviceDate_customerId_idx";
DROP INDEX IF EXISTS public."service_records_employeeId_idx";
DROP INDEX IF EXISTS public."service_records_customerId_idx";
DROP INDEX IF EXISTS public."sales_data_transactionType_idx";
DROP INDEX IF EXISTS public."sales_data_transactionDate_category_idx";
DROP INDEX IF EXISTS public."sales_data_tireMasterId_key";
DROP INDEX IF EXISTS public."sales_data_sourceType_idx";
DROP INDEX IF EXISTS public."sales_data_serviceRecordId_idx";
DROP INDEX IF EXISTS public."sales_data_invoiceId_idx";
DROP INDEX IF EXISTS public."sales_data_employeeId_idx";
DROP INDEX IF EXISTS public."sales_data_customerId_idx";
DROP INDEX IF EXISTS public.reconciliation_records_status_idx;
DROP INDEX IF EXISTS public."reconciliation_records_invoiceNumber_idx";
DROP INDEX IF EXISTS public."reconciliation_records_batchId_idx";
DROP INDEX IF EXISTS public.large_accounts_tier_idx;
DROP INDEX IF EXISTS public.large_accounts_status_idx;
DROP INDEX IF EXISTS public."large_accounts_customerId_key";
DROP INDEX IF EXISTS public."large_accounts_contractNumber_key";
DROP INDEX IF EXISTS public."large_accounts_accountType_idx";
DROP INDEX IF EXISTS public.invoices_store_id_idx;
DROP INDEX IF EXISTS public.invoices_salesperson_idx;
DROP INDEX IF EXISTS public.invoices_invoice_number_key;
DROP INDEX IF EXISTS public.invoices_invoice_date_idx;
DROP INDEX IF EXISTS public.invoices_import_batch_id_idx;
DROP INDEX IF EXISTS public.invoices_customer_id_idx;
DROP INDEX IF EXISTS public.invoice_line_items_tire_master_product_id_idx;
DROP INDEX IF EXISTS public.invoice_line_items_product_code_idx;
DROP INDEX IF EXISTS public.invoice_line_items_invoice_id_idx;
DROP INDEX IF EXISTS public.invoice_line_items_category_idx;
DROP INDEX IF EXISTS public.invoice_customers_name_key;
DROP INDEX IF EXISTS public.import_rollback_operations_timestamp_idx;
DROP INDEX IF EXISTS public.import_rollback_operations_table_name_idx;
DROP INDEX IF EXISTS public.import_rollback_operations_operation_type_idx;
DROP INDEX IF EXISTS public.import_rollback_operations_import_batch_id_idx;
DROP INDEX IF EXISTS public.import_errors_import_batch_id_idx;
DROP INDEX IF EXISTS public.import_errors_error_type_idx;
DROP INDEX IF EXISTS public.import_batches_status_idx;
DROP INDEX IF EXISTS public.import_batches_started_at_idx;
DROP INDEX IF EXISTS public.employees_role_idx;
DROP INDEX IF EXISTS public."employees_employeeId_key";
DROP INDEX IF EXISTS public.employees_email_key;
DROP INDEX IF EXISTS public.customers_phone_idx;
DROP INDEX IF EXISTS public."customers_lastName_firstName_idx";
DROP INDEX IF EXISTS public.customers_email_key;
DROP INDEX IF EXISTS public."appointments_vehicleId_idx";
DROP INDEX IF EXISTS public."appointments_employeeId_idx";
DROP INDEX IF EXISTS public."appointments_employeeId_appointmentDate_idx";
DROP INDEX IF EXISTS public."appointments_customerId_idx";
DROP INDEX IF EXISTS public."appointments_appointmentDate_appointmentTime_idx";
DROP INDEX IF EXISTS public."_StoreToUser_B_index";
DROP INDEX IF EXISTS public."_StoreToUser_AB_unique";
DROP INDEX IF EXISTS public."_EmployeeToStore_B_index";
DROP INDEX IF EXISTS public."_EmployeeToStore_AB_unique";
ALTER TABLE IF EXISTS ONLY public.vehicles DROP CONSTRAINT IF EXISTS vehicles_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.tire_master_sync_history DROP CONSTRAINT IF EXISTS tire_master_sync_history_pkey;
ALTER TABLE IF EXISTS ONLY public.tire_master_sales_orders DROP CONSTRAINT IF EXISTS tire_master_sales_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.tire_master_sales_order_items DROP CONSTRAINT IF EXISTS tire_master_sales_order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.tire_master_products DROP CONSTRAINT IF EXISTS tire_master_products_pkey;
ALTER TABLE IF EXISTS ONLY public.tire_master_product_mappings DROP CONSTRAINT IF EXISTS tire_master_product_mappings_pkey;
ALTER TABLE IF EXISTS ONLY public.tire_master_prices DROP CONSTRAINT IF EXISTS tire_master_prices_pkey;
ALTER TABLE IF EXISTS ONLY public.tire_master_price_lists DROP CONSTRAINT IF EXISTS tire_master_price_lists_pkey;
ALTER TABLE IF EXISTS ONLY public.tire_master_locations DROP CONSTRAINT IF EXISTS tire_master_locations_pkey;
ALTER TABLE IF EXISTS ONLY public.tire_master_inventory DROP CONSTRAINT IF EXISTS tire_master_inventory_pkey;
ALTER TABLE IF EXISTS ONLY public.tire_master_customers DROP CONSTRAINT IF EXISTS tire_master_customers_pkey;
ALTER TABLE IF EXISTS ONLY public.stores DROP CONSTRAINT IF EXISTS stores_pkey;
ALTER TABLE IF EXISTS ONLY public.service_reminders DROP CONSTRAINT IF EXISTS service_reminders_pkey;
ALTER TABLE IF EXISTS ONLY public.service_records DROP CONSTRAINT IF EXISTS service_records_pkey;
ALTER TABLE IF EXISTS ONLY public.sales_data DROP CONSTRAINT IF EXISTS sales_data_pkey;
ALTER TABLE IF EXISTS ONLY public.reconciliation_records DROP CONSTRAINT IF EXISTS reconciliation_records_pkey;
ALTER TABLE IF EXISTS ONLY public.reconciliation_batches DROP CONSTRAINT IF EXISTS reconciliation_batches_pkey;
ALTER TABLE IF EXISTS ONLY public.mechanic_labor DROP CONSTRAINT IF EXISTS mechanic_labor_pkey;
ALTER TABLE IF EXISTS ONLY public.large_accounts DROP CONSTRAINT IF EXISTS large_accounts_pkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_pkey;
ALTER TABLE IF EXISTS ONLY public.invoice_customers DROP CONSTRAINT IF EXISTS invoice_customers_pkey;
ALTER TABLE IF EXISTS ONLY public.import_rollback_operations DROP CONSTRAINT IF EXISTS import_rollback_operations_pkey;
ALTER TABLE IF EXISTS ONLY public.import_errors DROP CONSTRAINT IF EXISTS import_errors_pkey;
ALTER TABLE IF EXISTS ONLY public.import_batches DROP CONSTRAINT IF EXISTS import_batches_pkey;
ALTER TABLE IF EXISTS ONLY public.employees DROP CONSTRAINT IF EXISTS employees_pkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.vehicles;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.tire_master_sync_history;
DROP TABLE IF EXISTS public.tire_master_sales_orders;
DROP TABLE IF EXISTS public.tire_master_sales_order_items;
DROP TABLE IF EXISTS public.tire_master_products;
DROP TABLE IF EXISTS public.tire_master_product_mappings;
DROP TABLE IF EXISTS public.tire_master_prices;
DROP TABLE IF EXISTS public.tire_master_price_lists;
DROP TABLE IF EXISTS public.tire_master_locations;
DROP TABLE IF EXISTS public.tire_master_inventory;
DROP TABLE IF EXISTS public.tire_master_customers;
DROP TABLE IF EXISTS public.stores;
DROP TABLE IF EXISTS public.service_reminders;
DROP TABLE IF EXISTS public.service_records;
DROP TABLE IF EXISTS public.sales_data;
DROP TABLE IF EXISTS public.reconciliation_records;
DROP TABLE IF EXISTS public.reconciliation_batches;
DROP TABLE IF EXISTS public.mechanic_labor;
DROP TABLE IF EXISTS public.large_accounts;
DROP TABLE IF EXISTS public.invoices;
DROP TABLE IF EXISTS public.invoice_line_items;
DROP TABLE IF EXISTS public.invoice_customers;
DROP TABLE IF EXISTS public.import_rollback_operations;
DROP TABLE IF EXISTS public.import_errors;
DROP TABLE IF EXISTS public.import_batches;
DROP TABLE IF EXISTS public.employees;
DROP TABLE IF EXISTS public.customers;
DROP TABLE IF EXISTS public.appointments;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TABLE IF EXISTS public."_StoreToUser";
DROP TABLE IF EXISTS public."_EmployeeToStore";
DROP TYPE IF EXISTS public."TransactionType";
DROP TYPE IF EXISTS public."TireType";
DROP TYPE IF EXISTS public."TireSeason";
DROP TYPE IF EXISTS public."TireQuality";
DROP TYPE IF EXISTS public."SyncStatus";
DROP TYPE IF EXISTS public."ServiceLevel";
DROP TYPE IF EXISTS public."ReminderStatus";
DROP TYPE IF EXISTS public."ProductCategory";
DROP TYPE IF EXISTS public."PaymentStatus";
DROP TYPE IF EXISTS public."MappingType";
DROP TYPE IF EXISTS public."LargeAccountType";
DROP TYPE IF EXISTS public."LargeAccountTier";
DROP TYPE IF EXISTS public."LargeAccountStatus";
DROP TYPE IF EXISTS public."InvoiceStatus";
DROP TYPE IF EXISTS public."ImportStatus";
DROP TYPE IF EXISTS public."ErrorType";
DROP TYPE IF EXISTS public."EmployeeRole";
DROP TYPE IF EXISTS public."DataSourceType";
DROP TYPE IF EXISTS public."CustomerStatus";
DROP TYPE IF EXISTS public."CommunicationMethod";
DROP TYPE IF EXISTS public."AppointmentStatus";
DROP TYPE IF EXISTS public."AccountType";
--
-- Name: AccountType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AccountType" AS ENUM (
    'INDIVIDUAL',
    'LARGE_ACCOUNT'
);


ALTER TYPE public."AccountType" OWNER TO postgres;

--
-- Name: AppointmentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AppointmentStatus" AS ENUM (
    'SCHEDULED',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
);


ALTER TYPE public."AppointmentStatus" OWNER TO postgres;

--
-- Name: CommunicationMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CommunicationMethod" AS ENUM (
    'EMAIL',
    'SMS',
    'PHONE',
    'ALL'
);


ALTER TYPE public."CommunicationMethod" OWNER TO postgres;

--
-- Name: CustomerStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CustomerStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


ALTER TYPE public."CustomerStatus" OWNER TO postgres;

--
-- Name: DataSourceType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DataSourceType" AS ENUM (
    'TIRE_MASTER_SYNC',
    'INVOICE_IMPORT'
);


ALTER TYPE public."DataSourceType" OWNER TO postgres;

--
-- Name: EmployeeRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EmployeeRole" AS ENUM (
    'MANAGER',
    'SERVICE_ADVISOR',
    'ACCOUNT_MANAGER',
    'TECHNICIAN',
    'EMPL',
    'MECH'
);


ALTER TYPE public."EmployeeRole" OWNER TO postgres;

--
-- Name: ErrorType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ErrorType" AS ENUM (
    'VALIDATION',
    'DUPLICATE',
    'MISSING_DATA',
    'FORMAT',
    'BUSINESS_RULE'
);


ALTER TYPE public."ErrorType" OWNER TO postgres;

--
-- Name: ImportStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ImportStatus" AS ENUM (
    'STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'ROLLED_BACK'
);


ALTER TYPE public."ImportStatus" OWNER TO postgres;

--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'ACTIVE',
    'VOIDED',
    'RETURNED'
);


ALTER TYPE public."InvoiceStatus" OWNER TO postgres;

--
-- Name: LargeAccountStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LargeAccountStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'TERMINATED'
);


ALTER TYPE public."LargeAccountStatus" OWNER TO postgres;

--
-- Name: LargeAccountTier; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LargeAccountTier" AS ENUM (
    'SILVER',
    'GOLD',
    'PLATINUM'
);


ALTER TYPE public."LargeAccountTier" OWNER TO postgres;

--
-- Name: LargeAccountType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LargeAccountType" AS ENUM (
    'COMMERCIAL',
    'FLEET',
    'ENTERPRISE'
);


ALTER TYPE public."LargeAccountType" OWNER TO postgres;

--
-- Name: MappingType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MappingType" AS ENUM (
    'EXACT',
    'EQUIVALENT',
    'SUBSTITUTE'
);


ALTER TYPE public."MappingType" OWNER TO postgres;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'REFUNDED'
);


ALTER TYPE public."PaymentStatus" OWNER TO postgres;

--
-- Name: ProductCategory; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProductCategory" AS ENUM (
    'TIRES',
    'SERVICES',
    'PARTS',
    'FEES',
    'OTHER'
);


ALTER TYPE public."ProductCategory" OWNER TO postgres;

--
-- Name: ReminderStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReminderStatus" AS ENUM (
    'PENDING',
    'SENT',
    'DISMISSED',
    'CONVERTED'
);


ALTER TYPE public."ReminderStatus" OWNER TO postgres;

--
-- Name: ServiceLevel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ServiceLevel" AS ENUM (
    'STANDARD',
    'ENHANCED',
    'PREMIUM'
);


ALTER TYPE public."ServiceLevel" OWNER TO postgres;

--
-- Name: SyncStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SyncStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);


ALTER TYPE public."SyncStatus" OWNER TO postgres;

--
-- Name: TireQuality; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TireQuality" AS ENUM (
    'PREMIUM',
    'STANDARD',
    'ECONOMY',
    'UNKNOWN'
);


ALTER TYPE public."TireQuality" OWNER TO postgres;

--
-- Name: TireSeason; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TireSeason" AS ENUM (
    'ALL_SEASON',
    'SUMMER',
    'WINTER'
);


ALTER TYPE public."TireSeason" OWNER TO postgres;

--
-- Name: TireType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TireType" AS ENUM (
    'PASSENGER',
    'LIGHT_TRUCK',
    'COMMERCIAL',
    'SPECIALTY',
    'MEDIUM_TRUCK',
    'INDUSTRIAL',
    'AGRICULTURAL',
    'OTR',
    'TRAILER',
    'ATV_UTV',
    'LAWN_GARDEN',
    'OTHER'
);


ALTER TYPE public."TireType" OWNER TO postgres;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TransactionType" AS ENUM (
    'SALE',
    'REFUND',
    'ADJUSTMENT'
);


ALTER TYPE public."TransactionType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _EmployeeToStore; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_EmployeeToStore" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_EmployeeToStore" OWNER TO postgres;

--
-- Name: _StoreToUser; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_StoreToUser" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_StoreToUser" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointments (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "vehicleId" text NOT NULL,
    "employeeId" text NOT NULL,
    "appointmentDate" date NOT NULL,
    "appointmentTime" time without time zone NOT NULL,
    duration integer DEFAULT 60 NOT NULL,
    "serviceType" character varying(100) NOT NULL,
    description text,
    status public."AppointmentStatus" DEFAULT 'SCHEDULED'::public."AppointmentStatus" NOT NULL,
    "reminderSent" boolean DEFAULT false NOT NULL,
    "confirmationSent" boolean DEFAULT false NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.appointments OWNER TO postgres;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id text NOT NULL,
    "firstName" character varying(50) NOT NULL,
    "lastName" character varying(50) NOT NULL,
    email character varying(255),
    phone character varying(20) NOT NULL,
    address character varying(200),
    city character varying(50),
    state character varying(20),
    "zipCode" character varying(10),
    "accountType" public."AccountType" DEFAULT 'INDIVIDUAL'::public."AccountType" NOT NULL,
    status public."CustomerStatus" DEFAULT 'ACTIVE'::public."CustomerStatus" NOT NULL,
    "preferredCommunication" public."CommunicationMethod" DEFAULT 'EMAIL'::public."CommunicationMethod" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id text NOT NULL,
    "firstName" character varying(50) NOT NULL,
    "lastName" character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    role public."EmployeeRole" NOT NULL,
    "employeeId" character varying(20) NOT NULL,
    "hourlyRate" numeric(10,2),
    "hireDate" date NOT NULL,
    status public."CustomerStatus" DEFAULT 'ACTIVE'::public."CustomerStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isMechanic" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: import_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_batches (
    id text NOT NULL,
    file_name character varying(255) NOT NULL,
    original_path character varying(500) NOT NULL,
    processed_path character varying(500),
    started_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp(3) without time zone,
    total_records integer NOT NULL,
    successful_records integer DEFAULT 0 NOT NULL,
    failed_records integer DEFAULT 0 NOT NULL,
    status public."ImportStatus" DEFAULT 'STARTED'::public."ImportStatus" NOT NULL,
    user_id character varying(100),
    error_summary text
);


ALTER TABLE public.import_batches OWNER TO postgres;

--
-- Name: import_errors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_errors (
    id text NOT NULL,
    import_batch_id text NOT NULL,
    row_number integer NOT NULL,
    error_type public."ErrorType" NOT NULL,
    error_message text NOT NULL,
    original_data text NOT NULL,
    field_name character varying(100),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.import_errors OWNER TO postgres;

--
-- Name: import_rollback_operations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_rollback_operations (
    id text NOT NULL,
    import_batch_id text NOT NULL,
    operation_type character varying(50) NOT NULL,
    record_id character varying(100) NOT NULL,
    table_name character varying(100) NOT NULL,
    operation character varying(20) NOT NULL,
    original_data text,
    new_data text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.import_rollback_operations OWNER TO postgres;

--
-- Name: invoice_customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_customers (
    id text NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    address text,
    "customerCode" character varying(100),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.invoice_customers OWNER TO postgres;

--
-- Name: invoice_line_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_line_items (
    id text NOT NULL,
    invoice_id text NOT NULL,
    product_code character varying(100) NOT NULL,
    description text NOT NULL,
    quantity numeric(10,3) NOT NULL,
    line_total numeric(10,2) NOT NULL,
    cost_price numeric(10,2) NOT NULL,
    gross_profit_margin numeric(5,2) NOT NULL,
    gross_profit numeric(10,2) NOT NULL,
    category public."ProductCategory" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    adjustment character varying(50),
    fet numeric(10,2) NOT NULL,
    labor_cost numeric(10,2) NOT NULL,
    line_number integer,
    parts_cost numeric(10,2) NOT NULL,
    tire_master_product_id text
);


ALTER TABLE public.invoice_line_items OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    invoice_number character varying(50) NOT NULL,
    customer_id text NOT NULL,
    invoice_date timestamp(3) without time zone NOT NULL,
    salesperson character varying(255) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    labor_cost numeric(10,2),
    parts_cost numeric(10,2),
    environmental_fee numeric(10,2),
    status public."InvoiceStatus" DEFAULT 'ACTIVE'::public."InvoiceStatus" NOT NULL,
    import_batch_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    fet_total numeric(10,2),
    gross_profit numeric(10,2),
    mileage character varying(50),
    total_cost numeric(10,2),
    vehicle_info character varying(255),
    store_id text
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: large_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.large_accounts (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "contractNumber" character varying(50),
    "contractStartDate" date,
    "contractEndDate" date,
    "creditLimit" numeric(12,2),
    "paymentTerms" character varying(50),
    "billingContact" character varying(100),
    "billingEmail" character varying(255),
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "accountManager" character varying(100) NOT NULL,
    "accountType" public."LargeAccountType" NOT NULL,
    "annualRevenue" numeric(12,2),
    "discountTier" integer,
    "priorityRanking" integer,
    "serviceLevel" public."ServiceLevel" DEFAULT 'STANDARD'::public."ServiceLevel" NOT NULL,
    "specialTerms" text,
    status public."LargeAccountStatus" DEFAULT 'ACTIVE'::public."LargeAccountStatus" NOT NULL,
    tier public."LargeAccountTier" NOT NULL
);


ALTER TABLE public.large_accounts OWNER TO postgres;

--
-- Name: mechanic_labor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mechanic_labor (
    id text NOT NULL,
    mechanic_name text NOT NULL,
    category text NOT NULL,
    invoice_number text NOT NULL,
    product_code text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    parts numeric(10,2) NOT NULL,
    labor numeric(10,2) NOT NULL,
    total_cost numeric(10,2) NOT NULL,
    gross_profit numeric(10,2) NOT NULL,
    gp_percent numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.mechanic_labor OWNER TO postgres;

--
-- Name: reconciliation_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reconciliation_batches (
    id text NOT NULL,
    filename text NOT NULL,
    "uploadDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text NOT NULL,
    "totalRecords" integer DEFAULT 0 NOT NULL,
    "matchedCount" integer DEFAULT 0 NOT NULL,
    "unmatchedCount" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.reconciliation_batches OWNER TO postgres;

--
-- Name: reconciliation_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reconciliation_records (
    id text NOT NULL,
    "batchId" text NOT NULL,
    "invoiceNumber" text NOT NULL,
    "invoiceDate" timestamp(3) without time zone,
    "invoiceAmount" numeric(10,2) NOT NULL,
    "creditAmount" numeric(10,2) NOT NULL,
    commission numeric(10,2) NOT NULL,
    difference numeric(10,2) NOT NULL,
    category text,
    "subCategory" text,
    status text NOT NULL,
    "matchedInvoiceId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "accountName" text,
    "discrepancyReason" text
);


ALTER TABLE public.reconciliation_records OWNER TO postgres;

--
-- Name: sales_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_data (
    id text NOT NULL,
    "tireMasterId" character varying(50),
    "serviceRecordId" text,
    "customerId" text,
    "employeeId" text,
    "transactionDate" date NOT NULL,
    "transactionType" public."TransactionType" DEFAULT 'SALE'::public."TransactionType" NOT NULL,
    category character varying(50) NOT NULL,
    "itemDescription" character varying(200) NOT NULL,
    quantity numeric(10,3) NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "taxAmount" numeric(10,2),
    "syncedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "costBasis" numeric(10,2),
    "grossProfitMargin" numeric(5,2),
    "invoiceId" text,
    "sourceType" public."DataSourceType" DEFAULT 'TIRE_MASTER_SYNC'::public."DataSourceType" NOT NULL
);


ALTER TABLE public.sales_data OWNER TO postgres;

--
-- Name: service_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_records (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "vehicleId" text NOT NULL,
    "employeeId" text NOT NULL,
    "serviceMasterId" character varying(50),
    "serviceDate" date NOT NULL,
    "serviceType" character varying(100) NOT NULL,
    description text NOT NULL,
    "laborHours" numeric(5,2) NOT NULL,
    "partsCost" numeric(10,2) NOT NULL,
    "laborCost" numeric(10,2) NOT NULL,
    "taxAmount" numeric(10,2),
    "paymentStatus" public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.service_records OWNER TO postgres;

--
-- Name: service_reminders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_reminders (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "vehicleId" text NOT NULL,
    "lastServiceId" text,
    "reminderType" character varying(50) NOT NULL,
    "reminderDate" date NOT NULL,
    "reminderMessage" text NOT NULL,
    "sentDate" date,
    status public."ReminderStatus" DEFAULT 'PENDING'::public."ReminderStatus" NOT NULL,
    "communicationMethod" public."CommunicationMethod" DEFAULT 'EMAIL'::public."CommunicationMethod" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.service_reminders OWNER TO postgres;

--
-- Name: stores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stores (
    id text NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.stores OWNER TO postgres;

--
-- Name: tire_master_customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tire_master_customers (
    id text NOT NULL,
    "tireMasterCode" character varying(50) NOT NULL,
    "companyName" character varying(100),
    "firstName" character varying(50),
    "lastName" character varying(50),
    email character varying(255),
    phone character varying(20),
    address character varying(200),
    city character varying(50),
    state character varying(20),
    "zipCode" character varying(10),
    "creditLimit" numeric(12,2),
    "paymentTerms" character varying(50),
    "isActive" boolean DEFAULT true NOT NULL,
    "lastSyncedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tire_master_customers OWNER TO postgres;

--
-- Name: tire_master_inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tire_master_inventory (
    id text NOT NULL,
    "productId" text NOT NULL,
    "locationId" text NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    "reservedQty" integer DEFAULT 0 NOT NULL,
    "availableQty" integer DEFAULT 0 NOT NULL,
    "lastUpdated" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tire_master_inventory OWNER TO postgres;

--
-- Name: tire_master_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tire_master_locations (
    id text NOT NULL,
    "tireMasterCode" character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    address character varying(200),
    city character varying(50),
    state character varying(20),
    "zipCode" character varying(10),
    phone character varying(20),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tire_master_locations OWNER TO postgres;

--
-- Name: tire_master_price_lists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tire_master_price_lists (
    id text NOT NULL,
    "tireMasterCode" character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    "effectiveDate" date,
    "expirationDate" date,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tire_master_price_lists OWNER TO postgres;

--
-- Name: tire_master_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tire_master_prices (
    id text NOT NULL,
    "productId" text NOT NULL,
    "priceListId" text NOT NULL,
    "listPrice" numeric(10,2) NOT NULL,
    cost numeric(10,2),
    msrp numeric(10,2),
    "effectiveDate" date,
    "expirationDate" date,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tire_master_prices OWNER TO postgres;

--
-- Name: tire_master_product_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tire_master_product_mappings (
    id text NOT NULL,
    "tireMasterProductId" text NOT NULL,
    "crmProductId" text,
    "mappingType" public."MappingType" NOT NULL,
    "autoSync" boolean DEFAULT true NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tire_master_product_mappings OWNER TO postgres;

--
-- Name: tire_master_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tire_master_products (
    id text NOT NULL,
    "tireMasterSku" character varying(50) NOT NULL,
    brand character varying(100) NOT NULL,
    pattern character varying(100) NOT NULL,
    size character varying(50) NOT NULL,
    type public."TireType" NOT NULL,
    season public."TireSeason" NOT NULL,
    description text,
    weight numeric(8,2),
    specifications jsonb,
    "warrantyInfo" text,
    features text[],
    "isActive" boolean DEFAULT true NOT NULL,
    "lastSyncedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    fet_amount numeric(10,2),
    labor_price numeric(10,2),
    manufacturer_code character varying(50),
    "isTire" boolean DEFAULT false NOT NULL,
    quality public."TireQuality" DEFAULT 'UNKNOWN'::public."TireQuality" NOT NULL
);


ALTER TABLE public.tire_master_products OWNER TO postgres;

--
-- Name: tire_master_sales_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tire_master_sales_order_items (
    id text NOT NULL,
    "salesOrderId" text NOT NULL,
    "productId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    quantity integer NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    discount numeric(10,2),
    "totalAmount" numeric(12,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tire_master_sales_order_items OWNER TO postgres;

--
-- Name: tire_master_sales_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tire_master_sales_orders (
    id text NOT NULL,
    "tireMasterCode" character varying(50) NOT NULL,
    "customerId" text NOT NULL,
    "orderNumber" character varying(50) NOT NULL,
    "orderDate" date NOT NULL,
    "requiredDate" date,
    "shippedDate" date,
    status character varying(50) NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    "taxAmount" numeric(10,2),
    "shippingAmount" numeric(10,2),
    "totalAmount" numeric(12,2) NOT NULL,
    notes text,
    "lastSyncedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tire_master_sales_orders OWNER TO postgres;

--
-- Name: tire_master_sync_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tire_master_sync_history (
    id text NOT NULL,
    "syncId" character varying(100) NOT NULL,
    "syncType" character varying(50) NOT NULL,
    status public."SyncStatus" NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone,
    "recordsProcessed" integer DEFAULT 0 NOT NULL,
    "recordsCreated" integer DEFAULT 0 NOT NULL,
    "recordsUpdated" integer DEFAULT 0 NOT NULL,
    "recordsFailed" integer DEFAULT 0 NOT NULL,
    errors text[],
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.tire_master_sync_history OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    email text,
    "firstName" text,
    "lastName" text,
    role text DEFAULT 'USER'::text NOT NULL,
    scopes text[],
    "isApproved" boolean DEFAULT false NOT NULL,
    "mustChangePassword" boolean DEFAULT true NOT NULL,
    "employeeId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicles (
    id text NOT NULL,
    "customerId" text NOT NULL,
    make character varying(30) NOT NULL,
    model character varying(30) NOT NULL,
    year integer NOT NULL,
    vin character varying(17),
    "licensePlate" character varying(10),
    mileage integer,
    "tireSize" character varying(20),
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vehicles OWNER TO postgres;

--
-- Data for Name: _EmployeeToStore; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_EmployeeToStore" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _StoreToUser; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_StoreToUser" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
fbc31a66-ea64-4e59-9f45-321dac2a6570	3f9a87bc4a966aed1d985b9501fe60c499c61d3048dc73d97e05af7ae8348a4b	2025-12-01 21:16:20.031754+00	20251118000001_init	\N	\N	2025-12-01 21:16:19.966348+00	1
0eaf0a1a-6afa-4635-bea8-04afbed52f25	e4625c1e3eeff6e782b233de4aa0d8b140f3e59e1d625a2789994ea4f4c163b0	2025-12-01 21:16:20.218769+00	20251128160712_add_mechanic_labor	\N	\N	2025-12-01 21:16:20.215416+00	1
b32b720c-2c58-4737-854f-1feb46c9ee28	2d4e9c9552f253ac34c63e41095f0fe81224d0d44bdd2be7b3b3edbcd02ba8a9	2025-12-01 21:16:20.0423+00	20251119160606_update_large_account_schema	\N	\N	2025-12-01 21:16:20.032689+00	1
f48e5609-a23b-4e62-b591-cf877e865db7	e6cde193b182ed2a7d8f77bdef4d990bcfc2aeb54d607f3e024aec533b580c41	2025-12-01 21:16:20.163927+00	20251120174713_add_invoice_entities	\N	\N	2025-12-01 21:16:20.043321+00	1
a5c3ed08-e7be-4d65-b99a-35688ef982b1	2597032361f7ef6fc94f6c9bd4c2b08e614c53578c299f122df787d72c719c40	2025-12-01 21:16:20.17552+00	20251120184705_add_rollback_operations	\N	\N	2025-12-01 21:16:20.166033+00	1
f9e36eb9-5b12-4ce2-a6e1-eab9949a2c72	7e0249511c03b337c430dfe568f380170d48836f1fe49d858f268939c5bacec8	2025-12-01 21:16:20.220908+00	20251128162948_increase_mechanic_gp_precision	\N	\N	2025-12-01 21:16:20.219524+00	1
7ba88eaf-4ec8-4fce-a111-35cd4f5bcabd	8a3babfde6d3d3213ae68cbb7281fb60a2fe693445b8b130df491ed612fde0ab	2025-12-01 21:16:20.180842+00	20251120224706_add_tiremaster_invoice_fields	\N	\N	2025-12-01 21:16:20.176424+00	1
c7328aa8-ead5-43ae-b9e6-6c63fcc07610	f70a007b502daaa9aeac2ff6e4b54d189603e98795af0983cd1698390c471049	2025-12-01 21:16:20.191611+00	20251124194329_add_reconciliation_tables	\N	\N	2025-12-01 21:16:20.181699+00	1
1ae0718c-90bf-490b-a836-d0015ada7043	7b982abb24291c2ca1d4676a7dc7f89d3f2334ed3ce48f81fcb1f80fdf59862c	2025-12-01 21:16:20.193695+00	20251124195104_add_account_name_to_recon	\N	\N	2025-12-01 21:16:20.192349+00	1
6f43b7b8-499d-40d3-9ffe-b95a0591898f	36017d008621dd00b73bd60a427dad9a4e3183d9356bb2ec2b421c58d2d7bb98	2025-12-01 21:16:42.41456+00	20251201211642_add_user_model	\N	\N	2025-12-01 21:16:42.39395+00	1
4744077c-5288-49fd-b35b-5530890ac6e7	99111cc853be23a387d9bca916dd78b42cbf5fd18cda2bd4a4bb24342b854d2f	2025-12-01 21:16:20.19575+00	20251124223326_add_unmatched_count	\N	\N	2025-12-01 21:16:20.194476+00	1
408352fb-9bbb-46a9-9783-e6cb3c560e3e	372849cbc151106554aee2e85ad6c644720fb5651f3a7d3fc0536605753ea012	2025-12-01 21:16:20.203528+00	20251125154804_add_store_model	\N	\N	2025-12-01 21:16:20.196452+00	1
7039f98a-2271-424e-bed7-2a9822fefcda	ad4e2305bf50e50ad9c8fccec5e7ecaec4dd693bcff68702f0763595564bd65a	2025-12-01 21:16:20.207524+00	20251125180056_add_inventory_fields_and_relations	\N	\N	2025-12-01 21:16:20.20422+00	1
7d6249b2-0767-4ea7-a367-2ba9750e3ad7	5ca0af31f074eb546b514e0bae96ebd4771cd0b790387a9e153c51befb02e708	2025-12-01 21:16:20.209409+00	20251125205810_add_manufacturer_code	\N	\N	2025-12-01 21:16:20.208223+00	1
41a409a9-08d7-4f7a-95bf-46c282b6ea46	fc8fac40b5f104b5a036fcbbc270e8c551356bd763266fc835e6441cac8cf872	2025-12-01 21:16:20.212327+00	20251126211812_add_tire_classification	\N	\N	2025-12-01 21:16:20.210116+00	1
339f295c-fe61-423e-82c6-7a92f34d257c	c98dc2be158d6b4485a494f5ad9134cdde2753fc4f32e81bd29a20e453074eb1	2025-12-01 21:16:20.214733+00	20251126220058_add_tire_quality	\N	\N	2025-12-01 21:16:20.213075+00	1
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appointments (id, "customerId", "vehicleId", "employeeId", "appointmentDate", "appointmentTime", duration, "serviceType", description, status, "reminderSent", "confirmationSent", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (id, "firstName", "lastName", email, phone, address, city, state, "zipCode", "accountType", status, "preferredCommunication", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, "firstName", "lastName", email, role, "employeeId", "hourlyRate", "hireDate", status, "createdAt", "updatedAt", "isMechanic") FROM stdin;
\.


--
-- Data for Name: import_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.import_batches (id, file_name, original_path, processed_path, started_at, completed_at, total_records, successful_records, failed_records, status, user_id, error_summary) FROM stdin;
\.


--
-- Data for Name: import_errors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.import_errors (id, import_batch_id, row_number, error_type, error_message, original_data, field_name, created_at) FROM stdin;
\.


--
-- Data for Name: import_rollback_operations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.import_rollback_operations (id, import_batch_id, operation_type, record_id, table_name, operation, original_data, new_data, "timestamp") FROM stdin;
\.


--
-- Data for Name: invoice_customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_customers (id, name, email, phone, address, "customerCode", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoice_line_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_line_items (id, invoice_id, product_code, description, quantity, line_total, cost_price, gross_profit_margin, gross_profit, category, created_at, adjustment, fet, labor_cost, line_number, parts_cost, tire_master_product_id) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, invoice_number, customer_id, invoice_date, salesperson, subtotal, tax_amount, total_amount, labor_cost, parts_cost, environmental_fee, status, import_batch_id, created_at, updated_at, fet_total, gross_profit, mileage, total_cost, vehicle_info, store_id) FROM stdin;
\.


--
-- Data for Name: large_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.large_accounts (id, "customerId", "contractNumber", "contractStartDate", "contractEndDate", "creditLimit", "paymentTerms", "billingContact", "billingEmail", notes, "createdAt", "updatedAt", "accountManager", "accountType", "annualRevenue", "discountTier", "priorityRanking", "serviceLevel", "specialTerms", status, tier) FROM stdin;
\.


--
-- Data for Name: mechanic_labor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mechanic_labor (id, mechanic_name, category, invoice_number, product_code, quantity, parts, labor, total_cost, gross_profit, gp_percent, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: reconciliation_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reconciliation_batches (id, filename, "uploadDate", status, "totalRecords", "matchedCount", "unmatchedCount") FROM stdin;
\.


--
-- Data for Name: reconciliation_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reconciliation_records (id, "batchId", "invoiceNumber", "invoiceDate", "invoiceAmount", "creditAmount", commission, difference, category, "subCategory", status, "matchedInvoiceId", "createdAt", "updatedAt", "accountName", "discrepancyReason") FROM stdin;
\.


--
-- Data for Name: sales_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_data (id, "tireMasterId", "serviceRecordId", "customerId", "employeeId", "transactionDate", "transactionType", category, "itemDescription", quantity, "unitPrice", "taxAmount", "syncedAt", "updatedAt", "costBasis", "grossProfitMargin", "invoiceId", "sourceType") FROM stdin;
\.


--
-- Data for Name: service_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_records (id, "customerId", "vehicleId", "employeeId", "serviceMasterId", "serviceDate", "serviceType", description, "laborHours", "partsCost", "laborCost", "taxAmount", "paymentStatus", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: service_reminders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_reminders (id, "customerId", "vehicleId", "lastServiceId", "reminderType", "reminderDate", "reminderMessage", "sentDate", status, "communicationMethod", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: stores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stores (id, code, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tire_master_customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tire_master_customers (id, "tireMasterCode", "companyName", "firstName", "lastName", email, phone, address, city, state, "zipCode", "creditLimit", "paymentTerms", "isActive", "lastSyncedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: tire_master_inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tire_master_inventory (id, "productId", "locationId", quantity, "reservedQty", "availableQty", "lastUpdated", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: tire_master_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tire_master_locations (id, "tireMasterCode", name, address, city, state, "zipCode", phone, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: tire_master_price_lists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tire_master_price_lists (id, "tireMasterCode", name, description, currency, "effectiveDate", "expirationDate", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: tire_master_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tire_master_prices (id, "productId", "priceListId", "listPrice", cost, msrp, "effectiveDate", "expirationDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: tire_master_product_mappings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tire_master_product_mappings (id, "tireMasterProductId", "crmProductId", "mappingType", "autoSync", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: tire_master_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tire_master_products (id, "tireMasterSku", brand, pattern, size, type, season, description, weight, specifications, "warrantyInfo", features, "isActive", "lastSyncedAt", "createdAt", "updatedAt", fet_amount, labor_price, manufacturer_code, "isTire", quality) FROM stdin;
\.


--
-- Data for Name: tire_master_sales_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tire_master_sales_order_items (id, "salesOrderId", "productId", "lineNumber", quantity, "unitPrice", discount, "totalAmount", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: tire_master_sales_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tire_master_sales_orders (id, "tireMasterCode", "customerId", "orderNumber", "orderDate", "requiredDate", "shippedDate", status, subtotal, "taxAmount", "shippingAmount", "totalAmount", notes, "lastSyncedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: tire_master_sync_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tire_master_sync_history (id, "syncId", "syncType", status, "startTime", "endTime", "recordsProcessed", "recordsCreated", "recordsUpdated", "recordsFailed", errors, metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, email, "firstName", "lastName", role, scopes, "isApproved", "mustChangePassword", "employeeId", "createdAt", "updatedAt") FROM stdin;
cminnh7nu0000rtsscrjg0qjw	admin	$2a$12$ozxwEHTZ/TUAmDfVXL5N6uvRPen2ecZSFAVaaDs.5gQgzuvZ3DAYW	admin@example.com	System	Administrator	ADMINISTRATOR	{*}	t	t	\N	2025-12-01 21:17:28.458	2025-12-01 21:17:28.458
\.


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicles (id, "customerId", make, model, year, vin, "licensePlate", mileage, "tireSize", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: import_batches import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_pkey PRIMARY KEY (id);


--
-- Name: import_errors import_errors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_errors
    ADD CONSTRAINT import_errors_pkey PRIMARY KEY (id);


--
-- Name: import_rollback_operations import_rollback_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_rollback_operations
    ADD CONSTRAINT import_rollback_operations_pkey PRIMARY KEY (id);


--
-- Name: invoice_customers invoice_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_customers
    ADD CONSTRAINT invoice_customers_pkey PRIMARY KEY (id);


--
-- Name: invoice_line_items invoice_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: large_accounts large_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.large_accounts
    ADD CONSTRAINT large_accounts_pkey PRIMARY KEY (id);


--
-- Name: mechanic_labor mechanic_labor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mechanic_labor
    ADD CONSTRAINT mechanic_labor_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_batches reconciliation_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reconciliation_batches
    ADD CONSTRAINT reconciliation_batches_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_records reconciliation_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reconciliation_records
    ADD CONSTRAINT reconciliation_records_pkey PRIMARY KEY (id);


--
-- Name: sales_data sales_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_data
    ADD CONSTRAINT sales_data_pkey PRIMARY KEY (id);


--
-- Name: service_records service_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_records
    ADD CONSTRAINT service_records_pkey PRIMARY KEY (id);


--
-- Name: service_reminders service_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_reminders
    ADD CONSTRAINT service_reminders_pkey PRIMARY KEY (id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: tire_master_customers tire_master_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_customers
    ADD CONSTRAINT tire_master_customers_pkey PRIMARY KEY (id);


--
-- Name: tire_master_inventory tire_master_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_inventory
    ADD CONSTRAINT tire_master_inventory_pkey PRIMARY KEY (id);


--
-- Name: tire_master_locations tire_master_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_locations
    ADD CONSTRAINT tire_master_locations_pkey PRIMARY KEY (id);


--
-- Name: tire_master_price_lists tire_master_price_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_price_lists
    ADD CONSTRAINT tire_master_price_lists_pkey PRIMARY KEY (id);


--
-- Name: tire_master_prices tire_master_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_prices
    ADD CONSTRAINT tire_master_prices_pkey PRIMARY KEY (id);


--
-- Name: tire_master_product_mappings tire_master_product_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_product_mappings
    ADD CONSTRAINT tire_master_product_mappings_pkey PRIMARY KEY (id);


--
-- Name: tire_master_products tire_master_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_products
    ADD CONSTRAINT tire_master_products_pkey PRIMARY KEY (id);


--
-- Name: tire_master_sales_order_items tire_master_sales_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_sales_order_items
    ADD CONSTRAINT tire_master_sales_order_items_pkey PRIMARY KEY (id);


--
-- Name: tire_master_sales_orders tire_master_sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_sales_orders
    ADD CONSTRAINT tire_master_sales_orders_pkey PRIMARY KEY (id);


--
-- Name: tire_master_sync_history tire_master_sync_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_sync_history
    ADD CONSTRAINT tire_master_sync_history_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: _EmployeeToStore_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_EmployeeToStore_AB_unique" ON public."_EmployeeToStore" USING btree ("A", "B");


--
-- Name: _EmployeeToStore_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_EmployeeToStore_B_index" ON public."_EmployeeToStore" USING btree ("B");


--
-- Name: _StoreToUser_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_StoreToUser_AB_unique" ON public."_StoreToUser" USING btree ("A", "B");


--
-- Name: _StoreToUser_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_StoreToUser_B_index" ON public."_StoreToUser" USING btree ("B");


--
-- Name: appointments_appointmentDate_appointmentTime_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "appointments_appointmentDate_appointmentTime_idx" ON public.appointments USING btree ("appointmentDate", "appointmentTime");


--
-- Name: appointments_customerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "appointments_customerId_idx" ON public.appointments USING btree ("customerId");


--
-- Name: appointments_employeeId_appointmentDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "appointments_employeeId_appointmentDate_idx" ON public.appointments USING btree ("employeeId", "appointmentDate");


--
-- Name: appointments_employeeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "appointments_employeeId_idx" ON public.appointments USING btree ("employeeId");


--
-- Name: appointments_vehicleId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "appointments_vehicleId_idx" ON public.appointments USING btree ("vehicleId");


--
-- Name: customers_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX customers_email_key ON public.customers USING btree (email);


--
-- Name: customers_lastName_firstName_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "customers_lastName_firstName_idx" ON public.customers USING btree ("lastName", "firstName");


--
-- Name: customers_phone_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX customers_phone_idx ON public.customers USING btree (phone);


--
-- Name: employees_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX employees_email_key ON public.employees USING btree (email);


--
-- Name: employees_employeeId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "employees_employeeId_key" ON public.employees USING btree ("employeeId");


--
-- Name: employees_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX employees_role_idx ON public.employees USING btree (role);


--
-- Name: import_batches_started_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX import_batches_started_at_idx ON public.import_batches USING btree (started_at);


--
-- Name: import_batches_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX import_batches_status_idx ON public.import_batches USING btree (status);


--
-- Name: import_errors_error_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX import_errors_error_type_idx ON public.import_errors USING btree (error_type);


--
-- Name: import_errors_import_batch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX import_errors_import_batch_id_idx ON public.import_errors USING btree (import_batch_id);


--
-- Name: import_rollback_operations_import_batch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX import_rollback_operations_import_batch_id_idx ON public.import_rollback_operations USING btree (import_batch_id);


--
-- Name: import_rollback_operations_operation_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX import_rollback_operations_operation_type_idx ON public.import_rollback_operations USING btree (operation_type);


--
-- Name: import_rollback_operations_table_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX import_rollback_operations_table_name_idx ON public.import_rollback_operations USING btree (table_name);


--
-- Name: import_rollback_operations_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX import_rollback_operations_timestamp_idx ON public.import_rollback_operations USING btree ("timestamp");


--
-- Name: invoice_customers_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX invoice_customers_name_key ON public.invoice_customers USING btree (name);


--
-- Name: invoice_line_items_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoice_line_items_category_idx ON public.invoice_line_items USING btree (category);


--
-- Name: invoice_line_items_invoice_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoice_line_items_invoice_id_idx ON public.invoice_line_items USING btree (invoice_id);


--
-- Name: invoice_line_items_product_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoice_line_items_product_code_idx ON public.invoice_line_items USING btree (product_code);


--
-- Name: invoice_line_items_tire_master_product_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoice_line_items_tire_master_product_id_idx ON public.invoice_line_items USING btree (tire_master_product_id);


--
-- Name: invoices_customer_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_customer_id_idx ON public.invoices USING btree (customer_id);


--
-- Name: invoices_import_batch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_import_batch_id_idx ON public.invoices USING btree (import_batch_id);


--
-- Name: invoices_invoice_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_invoice_date_idx ON public.invoices USING btree (invoice_date);


--
-- Name: invoices_invoice_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX invoices_invoice_number_key ON public.invoices USING btree (invoice_number);


--
-- Name: invoices_salesperson_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_salesperson_idx ON public.invoices USING btree (salesperson);


--
-- Name: invoices_store_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_store_id_idx ON public.invoices USING btree (store_id);


--
-- Name: large_accounts_accountType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "large_accounts_accountType_idx" ON public.large_accounts USING btree ("accountType");


--
-- Name: large_accounts_contractNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "large_accounts_contractNumber_key" ON public.large_accounts USING btree ("contractNumber");


--
-- Name: large_accounts_customerId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "large_accounts_customerId_key" ON public.large_accounts USING btree ("customerId");


--
-- Name: large_accounts_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX large_accounts_status_idx ON public.large_accounts USING btree (status);


--
-- Name: large_accounts_tier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX large_accounts_tier_idx ON public.large_accounts USING btree (tier);


--
-- Name: reconciliation_records_batchId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "reconciliation_records_batchId_idx" ON public.reconciliation_records USING btree ("batchId");


--
-- Name: reconciliation_records_invoiceNumber_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "reconciliation_records_invoiceNumber_idx" ON public.reconciliation_records USING btree ("invoiceNumber");


--
-- Name: reconciliation_records_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reconciliation_records_status_idx ON public.reconciliation_records USING btree (status);


--
-- Name: sales_data_customerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sales_data_customerId_idx" ON public.sales_data USING btree ("customerId");


--
-- Name: sales_data_employeeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sales_data_employeeId_idx" ON public.sales_data USING btree ("employeeId");


--
-- Name: sales_data_invoiceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sales_data_invoiceId_idx" ON public.sales_data USING btree ("invoiceId");


--
-- Name: sales_data_serviceRecordId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sales_data_serviceRecordId_idx" ON public.sales_data USING btree ("serviceRecordId");


--
-- Name: sales_data_sourceType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sales_data_sourceType_idx" ON public.sales_data USING btree ("sourceType");


--
-- Name: sales_data_tireMasterId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "sales_data_tireMasterId_key" ON public.sales_data USING btree ("tireMasterId");


--
-- Name: sales_data_transactionDate_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sales_data_transactionDate_category_idx" ON public.sales_data USING btree ("transactionDate", category);


--
-- Name: sales_data_transactionType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sales_data_transactionType_idx" ON public.sales_data USING btree ("transactionType");


--
-- Name: service_records_customerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "service_records_customerId_idx" ON public.service_records USING btree ("customerId");


--
-- Name: service_records_employeeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "service_records_employeeId_idx" ON public.service_records USING btree ("employeeId");


--
-- Name: service_records_serviceDate_customerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "service_records_serviceDate_customerId_idx" ON public.service_records USING btree ("serviceDate", "customerId");


--
-- Name: service_records_serviceMasterId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "service_records_serviceMasterId_idx" ON public.service_records USING btree ("serviceMasterId");


--
-- Name: service_records_vehicleId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "service_records_vehicleId_idx" ON public.service_records USING btree ("vehicleId");


--
-- Name: service_reminders_customerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "service_reminders_customerId_idx" ON public.service_reminders USING btree ("customerId");


--
-- Name: service_reminders_lastServiceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "service_reminders_lastServiceId_idx" ON public.service_reminders USING btree ("lastServiceId");


--
-- Name: service_reminders_reminderDate_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "service_reminders_reminderDate_status_idx" ON public.service_reminders USING btree ("reminderDate", status);


--
-- Name: service_reminders_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX service_reminders_status_idx ON public.service_reminders USING btree (status);


--
-- Name: service_reminders_vehicleId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "service_reminders_vehicleId_idx" ON public.service_reminders USING btree ("vehicleId");


--
-- Name: stores_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX stores_code_key ON public.stores USING btree (code);


--
-- Name: tire_master_customers_companyName_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_customers_companyName_idx" ON public.tire_master_customers USING btree ("companyName");


--
-- Name: tire_master_customers_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_customers_isActive_idx" ON public.tire_master_customers USING btree ("isActive");


--
-- Name: tire_master_customers_lastSyncedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_customers_lastSyncedAt_idx" ON public.tire_master_customers USING btree ("lastSyncedAt");


--
-- Name: tire_master_customers_tireMasterCode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_customers_tireMasterCode_idx" ON public.tire_master_customers USING btree ("tireMasterCode");


--
-- Name: tire_master_customers_tireMasterCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tire_master_customers_tireMasterCode_key" ON public.tire_master_customers USING btree ("tireMasterCode");


--
-- Name: tire_master_inventory_lastUpdated_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_inventory_lastUpdated_idx" ON public.tire_master_inventory USING btree ("lastUpdated");


--
-- Name: tire_master_inventory_locationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_inventory_locationId_idx" ON public.tire_master_inventory USING btree ("locationId");


--
-- Name: tire_master_inventory_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_inventory_productId_idx" ON public.tire_master_inventory USING btree ("productId");


--
-- Name: tire_master_inventory_productId_locationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tire_master_inventory_productId_locationId_key" ON public.tire_master_inventory USING btree ("productId", "locationId");


--
-- Name: tire_master_inventory_quantity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tire_master_inventory_quantity_idx ON public.tire_master_inventory USING btree (quantity);


--
-- Name: tire_master_locations_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_locations_isActive_idx" ON public.tire_master_locations USING btree ("isActive");


--
-- Name: tire_master_locations_tireMasterCode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_locations_tireMasterCode_idx" ON public.tire_master_locations USING btree ("tireMasterCode");


--
-- Name: tire_master_locations_tireMasterCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tire_master_locations_tireMasterCode_key" ON public.tire_master_locations USING btree ("tireMasterCode");


--
-- Name: tire_master_price_lists_effectiveDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_price_lists_effectiveDate_idx" ON public.tire_master_price_lists USING btree ("effectiveDate");


--
-- Name: tire_master_price_lists_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_price_lists_isActive_idx" ON public.tire_master_price_lists USING btree ("isActive");


--
-- Name: tire_master_price_lists_tireMasterCode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_price_lists_tireMasterCode_idx" ON public.tire_master_price_lists USING btree ("tireMasterCode");


--
-- Name: tire_master_price_lists_tireMasterCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tire_master_price_lists_tireMasterCode_key" ON public.tire_master_price_lists USING btree ("tireMasterCode");


--
-- Name: tire_master_prices_effectiveDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_prices_effectiveDate_idx" ON public.tire_master_prices USING btree ("effectiveDate");


--
-- Name: tire_master_prices_priceListId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_prices_priceListId_idx" ON public.tire_master_prices USING btree ("priceListId");


--
-- Name: tire_master_prices_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_prices_productId_idx" ON public.tire_master_prices USING btree ("productId");


--
-- Name: tire_master_prices_productId_priceListId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tire_master_prices_productId_priceListId_key" ON public.tire_master_prices USING btree ("productId", "priceListId");


--
-- Name: tire_master_product_mappings_autoSync_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_product_mappings_autoSync_idx" ON public.tire_master_product_mappings USING btree ("autoSync");


--
-- Name: tire_master_product_mappings_crmProductId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_product_mappings_crmProductId_idx" ON public.tire_master_product_mappings USING btree ("crmProductId");


--
-- Name: tire_master_product_mappings_mappingType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_product_mappings_mappingType_idx" ON public.tire_master_product_mappings USING btree ("mappingType");


--
-- Name: tire_master_product_mappings_tireMasterProductId_crmProduct_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tire_master_product_mappings_tireMasterProductId_crmProduct_key" ON public.tire_master_product_mappings USING btree ("tireMasterProductId", "crmProductId");


--
-- Name: tire_master_product_mappings_tireMasterProductId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_product_mappings_tireMasterProductId_idx" ON public.tire_master_product_mappings USING btree ("tireMasterProductId");


--
-- Name: tire_master_products_brand_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tire_master_products_brand_idx ON public.tire_master_products USING btree (brand);


--
-- Name: tire_master_products_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_products_isActive_idx" ON public.tire_master_products USING btree ("isActive");


--
-- Name: tire_master_products_lastSyncedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_products_lastSyncedAt_idx" ON public.tire_master_products USING btree ("lastSyncedAt");


--
-- Name: tire_master_products_season_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tire_master_products_season_idx ON public.tire_master_products USING btree (season);


--
-- Name: tire_master_products_size_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tire_master_products_size_idx ON public.tire_master_products USING btree (size);


--
-- Name: tire_master_products_tireMasterSku_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tire_master_products_tireMasterSku_key" ON public.tire_master_products USING btree ("tireMasterSku");


--
-- Name: tire_master_products_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tire_master_products_type_idx ON public.tire_master_products USING btree (type);


--
-- Name: tire_master_sales_order_items_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_sales_order_items_productId_idx" ON public.tire_master_sales_order_items USING btree ("productId");


--
-- Name: tire_master_sales_order_items_salesOrderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_sales_order_items_salesOrderId_idx" ON public.tire_master_sales_order_items USING btree ("salesOrderId");


--
-- Name: tire_master_sales_order_items_salesOrderId_lineNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tire_master_sales_order_items_salesOrderId_lineNumber_key" ON public.tire_master_sales_order_items USING btree ("salesOrderId", "lineNumber");


--
-- Name: tire_master_sales_orders_customerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_sales_orders_customerId_idx" ON public.tire_master_sales_orders USING btree ("customerId");


--
-- Name: tire_master_sales_orders_lastSyncedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_sales_orders_lastSyncedAt_idx" ON public.tire_master_sales_orders USING btree ("lastSyncedAt");


--
-- Name: tire_master_sales_orders_orderDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_sales_orders_orderDate_idx" ON public.tire_master_sales_orders USING btree ("orderDate");


--
-- Name: tire_master_sales_orders_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tire_master_sales_orders_status_idx ON public.tire_master_sales_orders USING btree (status);


--
-- Name: tire_master_sales_orders_tireMasterCode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_sales_orders_tireMasterCode_idx" ON public.tire_master_sales_orders USING btree ("tireMasterCode");


--
-- Name: tire_master_sales_orders_tireMasterCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tire_master_sales_orders_tireMasterCode_key" ON public.tire_master_sales_orders USING btree ("tireMasterCode");


--
-- Name: tire_master_sync_history_startTime_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_sync_history_startTime_idx" ON public.tire_master_sync_history USING btree ("startTime");


--
-- Name: tire_master_sync_history_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tire_master_sync_history_status_idx ON public.tire_master_sync_history USING btree (status);


--
-- Name: tire_master_sync_history_syncId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_sync_history_syncId_idx" ON public.tire_master_sync_history USING btree ("syncId");


--
-- Name: tire_master_sync_history_syncId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tire_master_sync_history_syncId_key" ON public.tire_master_sync_history USING btree ("syncId");


--
-- Name: tire_master_sync_history_syncType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tire_master_sync_history_syncType_idx" ON public.tire_master_sync_history USING btree ("syncType");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_employeeId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "users_employeeId_key" ON public.users USING btree ("employeeId");


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: vehicles_customerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "vehicles_customerId_idx" ON public.vehicles USING btree ("customerId");


--
-- Name: vehicles_customerId_make_model_year_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "vehicles_customerId_make_model_year_idx" ON public.vehicles USING btree ("customerId", make, model, year);


--
-- Name: vehicles_vin_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX vehicles_vin_key ON public.vehicles USING btree (vin);


--
-- Name: _EmployeeToStore _EmployeeToStore_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_EmployeeToStore"
    ADD CONSTRAINT "_EmployeeToStore_A_fkey" FOREIGN KEY ("A") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _EmployeeToStore _EmployeeToStore_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_EmployeeToStore"
    ADD CONSTRAINT "_EmployeeToStore_B_fkey" FOREIGN KEY ("B") REFERENCES public.stores(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _StoreToUser _StoreToUser_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_StoreToUser"
    ADD CONSTRAINT "_StoreToUser_A_fkey" FOREIGN KEY ("A") REFERENCES public.stores(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _StoreToUser _StoreToUser_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_StoreToUser"
    ADD CONSTRAINT "_StoreToUser_B_fkey" FOREIGN KEY ("B") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: appointments appointments_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT "appointments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: appointments appointments_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT "appointments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: appointments appointments_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT "appointments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public.vehicles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: import_errors import_errors_import_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_errors
    ADD CONSTRAINT import_errors_import_batch_id_fkey FOREIGN KEY (import_batch_id) REFERENCES public.import_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: import_rollback_operations import_rollback_operations_import_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_rollback_operations
    ADD CONSTRAINT import_rollback_operations_import_batch_id_fkey FOREIGN KEY (import_batch_id) REFERENCES public.import_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoice_line_items invoice_line_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoice_line_items invoice_line_items_tire_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_tire_master_product_id_fkey FOREIGN KEY (tire_master_product_id) REFERENCES public.tire_master_products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.invoice_customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_import_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_import_batch_id_fkey FOREIGN KEY (import_batch_id) REFERENCES public.import_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: large_accounts large_accounts_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.large_accounts
    ADD CONSTRAINT "large_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reconciliation_records reconciliation_records_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reconciliation_records
    ADD CONSTRAINT "reconciliation_records_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public.reconciliation_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reconciliation_records reconciliation_records_matchedInvoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reconciliation_records
    ADD CONSTRAINT "reconciliation_records_matchedInvoiceId_fkey" FOREIGN KEY ("matchedInvoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sales_data sales_data_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_data
    ADD CONSTRAINT "sales_data_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sales_data sales_data_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_data
    ADD CONSTRAINT "sales_data_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sales_data sales_data_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_data
    ADD CONSTRAINT "sales_data_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sales_data sales_data_serviceRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_data
    ADD CONSTRAINT "sales_data_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES public.service_records(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_records service_records_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_records
    ADD CONSTRAINT "service_records_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: service_records service_records_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_records
    ADD CONSTRAINT "service_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: service_records service_records_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_records
    ADD CONSTRAINT "service_records_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public.vehicles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: service_reminders service_reminders_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_reminders
    ADD CONSTRAINT "service_reminders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: service_reminders service_reminders_lastServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_reminders
    ADD CONSTRAINT "service_reminders_lastServiceId_fkey" FOREIGN KEY ("lastServiceId") REFERENCES public.service_records(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_reminders service_reminders_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_reminders
    ADD CONSTRAINT "service_reminders_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public.vehicles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tire_master_inventory tire_master_inventory_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_inventory
    ADD CONSTRAINT "tire_master_inventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.tire_master_locations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tire_master_inventory tire_master_inventory_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_inventory
    ADD CONSTRAINT "tire_master_inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.tire_master_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tire_master_prices tire_master_prices_priceListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_prices
    ADD CONSTRAINT "tire_master_prices_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES public.tire_master_price_lists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tire_master_prices tire_master_prices_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_prices
    ADD CONSTRAINT "tire_master_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.tire_master_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tire_master_product_mappings tire_master_product_mappings_tireMasterProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_product_mappings
    ADD CONSTRAINT "tire_master_product_mappings_tireMasterProductId_fkey" FOREIGN KEY ("tireMasterProductId") REFERENCES public.tire_master_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tire_master_sales_order_items tire_master_sales_order_items_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_sales_order_items
    ADD CONSTRAINT "tire_master_sales_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.tire_master_products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tire_master_sales_order_items tire_master_sales_order_items_salesOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_sales_order_items
    ADD CONSTRAINT "tire_master_sales_order_items_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES public.tire_master_sales_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tire_master_sales_orders tire_master_sales_orders_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tire_master_sales_orders
    ADD CONSTRAINT "tire_master_sales_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.tire_master_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vehicles vehicles_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT "vehicles_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Jha75EpKlOxbWQe9CQX2cMA9RLRHyt4ClhvJ0aAfj7jgPjqTlL8ZdbvowjpWeeI

