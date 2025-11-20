# Tasks: Invoice CSV Import and Data Management

**Input**: Design documents from `/specs/002-invoice-csv-import/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - only included where explicitly mentioned in spec.md for validation requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths follow NestJS and Next.js project structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and module structure for CSV import feature

- [x] T001 Create CSV import module directory structure in backend/src/csv-import/ with subfolders: controllers/, services/, processors/, mappers/, schedulers/, dto/
- [x] T002 Create invoice management module directory structure in backend/src/invoices/ with subfolders: entities/, services/, controllers/
- [x] T003 [P] Create customer management module directory structure in backend/src/customers/ with subfolders: entities/, services/, controllers/
- [x] T004 [P] Create data folder structure with backend/data/ and backend/data/import/ directories
- [x] T005 [P] Create test fixtures directory structure in backend/tests/fixtures/ for sample CSV files
- [x] T006 [P] Create frontend components directory structure for invoice features in frontend/src/components/invoices/, frontend/src/components/customers/, frontend/src/components/csv-import/
- [x] T007 [P] Install required backend dependencies: csv-parser, @nestjs/schedule, @nestjs/bull, socket.io, @nestjs/websockets, @nestjs-cls/transactional
- [x] T008 [P] Install required frontend dependencies: socket.io-client for real-time import progress updates
- [x] T009 [P] Configure environment variables for CSV_DATA_FOLDER and CSV_IMPORT_FOLDER in backend/.env

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schema and infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T010 Update Prisma schema with Customer, Invoice, InvoiceLineItem, ImportBatch, and ImportError models in backend/prisma/schema.prisma
- [x] T011 Update existing SalesData model with new fields: sourceType, invoiceId, grossProfitMargin, costBasis in backend/prisma/schema.prisma
- [x] T012 Generate Prisma migration for new invoice entities with command: npx prisma migrate dev --name add-invoice-entities
- [x] T013 [P] Setup NestJS Schedule module configuration in backend/src/app.module.ts for hourly CSV monitoring
- [x] T014 [P] Setup EventEmitter module configuration in backend/src/app.module.ts for import progress events
- [x] T015 [P] Setup Bull Queue module configuration in backend/src/app.module.ts with Redis connection for job processing
- [x] T016 [P] Setup WebSocket gateway configuration in backend/src/app.module.ts for real-time updates
- [x] T017 [P] Create base import error types and enums in backend/src/shared/enums/import.enums.ts
- [x] T018 [P] Create shared validation utilities in backend/src/shared/validators/csv-validation.util.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - CSV Invoice Data Import (Priority: P1) 🎯 MVP

**Goal**: Establish foundational CSV import capability with TireMaster format collaboration, automatic monitoring, and manual triggers

**Independent Test**: Place a CSV file in the data folder, trigger import manually, verify invoice records are parsed and stored correctly

**Critical Note**: This phase includes collaborative work on TireMaster CSV format mapping and data translation setup as requested

### CSV Format Collaboration and Mapping Setup

- [x] T019 [P] [US1] Create TireMaster CSV sample analysis workspace in backend/tests/fixtures/tiremaster-samples/ for collaborative format review
- [x] T020 [US1] **COLLABORATIVE TASK** - Work together to analyze TireMaster CSV structure and create column mapping documentation in backend/src/csv-import/mappers/tiremaster-format-analysis.md
- [x] T021 [US1] **COLLABORATIVE TASK** - Create configurable TireMaster column mapper in backend/src/csv-import/mappers/tiremaster-column-mapper.ts based on format analysis
- [x] T022 [US1] **COLLABORATIVE TASK** - Create TireMaster data transformation rules in backend/src/csv-import/mappers/tiremaster-data-transformer.ts for proper data type conversion
- [x] T023 [P] [US1] Create CSV format validation service in backend/src/csv-import/processors/csv-format-validator.ts to ensure TireMaster format compatibility

### Import Batch and Error Tracking

- [x] T024 [P] [US1] Create ImportBatch entity and service in backend/src/csv-import/entities/import-batch.entity.ts
- [x] T025 [P] [US1] Create ImportError entity and service in backend/src/csv-import/entities/import-error.entity.ts
- [x] T026 [US1] Implement ImportBatchService with creation, tracking, and completion methods in backend/src/csv-import/services/import-batch.service.ts

### Core CSV Processing Engine

- [x] T027 [US1] Create CSV file processor service with streaming support for large files in backend/src/csv-import/processors/csv-file-processor.ts
- [x] T028 [US1] Implement TireMaster CSV parser with configurable column mapping in backend/src/csv-import/processors/tiremaster-csv-parser.ts
- [x] T029 [US1] Create CSV import orchestration service in backend/src/csv-import/services/csv-import.service.ts
- [x] T030 [US1] Implement error handling and batch processing logic with rollback capabilities in backend/src/csv-import/services/rollback.service.ts

### File System Monitoring

- [x] T031 [US1] Create hourly CSV monitoring scheduler with @nestjs/schedule in backend/src/csv-import/services/file-monitor-scheduler.service.ts
- [x] T032 [US1] Implement file system scanning service for detecting new CSV files in backend/src/csv-import/services/file-system-scanner.service.ts
- [x] T033 [US1] Create processed file archiving service for moving files to import folder in backend/src/csv-import/services/file-archiver.service.ts

### Manual Import Triggers

- [x] T034 [P] [US1] Create manual import trigger controller with REST endpoints in backend/src/csv-import/controllers/csv-import.controller.ts
- [x] T035 [P] [US1] Create import progress tracking DTOs in backend/src/csv-import/dto/csv-import.dto.ts
- [x] T036 [US1] Implement manual import service with immediate processing capability in backend/src/csv-import/services/csv-import.service.ts

### Progress Tracking and Real-time Updates

- [x] T037 [P] [US1] Create WebSocket gateway for import progress updates in backend/src/csv-import/gateways/import-progress.gateway.ts
- [x] T038 [P] [US1] Create import progress events and event handlers in backend/src/csv-import/events/import-progress.events.ts
- [x] T039 [US1] Implement real-time progress broadcasting during CSV processing in csv-import.service.ts

### Module Integration

- [x] T040 [US1] Create CsvImportModule with all providers and exports in backend/src/csv-import/csv-import.module.ts
- [x] T041 [US1] Register CsvImportModule in main AppModule with proper dependency injection in backend/src/app.module.ts

**Checkpoint**: At this point, CSV files can be automatically monitored, manually triggered, and processed with real-time progress updates

---

## Phase 4: User Story 2 - Invoice Data Organization and Categorization (Priority: P1)

**Goal**: Create customer and invoice management interfaces with filtering, sorting, and categorization capabilities

**Independent Test**: Import sample invoice data and verify users can filter, sort, and categorize records by customer, date, invoice number, and items

### Customer Entity and Management

- [x] T042 [P] [US2] Create Customer entity with normalized contact information in backend/src/customers/entities/customer.entity.ts
- [x] T043 [P] [US2] Create customer DTOs for creation, updates, and responses in backend/src/customers/dto/
- [x] T044 [US2] Implement CustomerService with CRUD operations, search, and duplicate detection in backend/src/customers/services/customer.service.ts
- [x] T045 [US2] Create customer controller with REST endpoints for management in backend/src/customers/controllers/customer.controller.ts
- [x] T046 [US2] Implement customer search and autocomplete functionality in CustomerService

### Invoice Entity and Management

- [x] T047 [P] [US2] Create Invoice entity with complete transaction details in backend/src/invoices/entities/invoice.entity.ts
- [x] T048 [P] [US2] Create InvoiceLineItem entity with product details and pricing in backend/src/invoices/entities/invoice-line-item.entity.ts
- [x] T049 [P] [US2] Create invoice DTOs for filtering, pagination, and responses in backend/src/invoices/dto/
- [x] T050 [US2] Implement InvoiceService with CRUD, filtering, and sorting capabilities in backend/src/invoices/services/invoice.service.ts
- [x] T051 [US2] Create invoice controller with comprehensive filtering endpoints in backend/src/invoices/controllers/invoice.controller.ts

### Data Categorization and Filtering

- [x] T052 [US2] Implement advanced invoice filtering by customer, date ranges, amounts in InvoiceService
- [x] T053 [US2] Create invoice categorization by product types, salespeople, status in backend/src/invoices/services/invoice-categorization.service.ts
- [x] T054 [US2] Implement customer aggregation service for purchase totals and history in backend/src/customers/services/customer-aggregation.service.ts

### Frontend Components for Data Organization

- [x] T055 [P] [US2] Create invoice list component with filtering controls in frontend/src/components/invoices/invoice-list.tsx
- [x] T056 [P] [US2] Create invoice detail view component with line items display in frontend/src/components/invoices/invoice-detail.tsx
- [x] T057 [P] [US2] Create customer list component with search functionality in frontend/src/components/customers/customer-list.tsx
- [x] T058 [P] [US2] Create customer detail view with invoice history in frontend/src/components/customers/customer-detail.tsx
- [x] T059 [P] [US2] Create invoice filtering sidebar component in frontend/src/components/invoices/invoice-filters.tsx
- [x] T060 [P] [US2] Create date range picker component for invoice filtering in frontend/src/components/shared/date-range-picker.tsx

### API Integration Services

- [x] T061 [P] [US2] Create invoice API client service in frontend/src/services/invoice-api.ts
- [x] T062 [P] [US2] Create customer API client service in frontend/src/services/customer-api.ts
- [x] T063 [P] [US2] Create pagination and filtering hooks in frontend/src/hooks/use-invoice-filters.ts

### Pages and Routing

- [x] T064 [US2] Create invoices listing page in frontend/src/app/invoices/page.tsx
- [x] T065 [US2] Create invoice detail page in frontend/src/app/invoices/[id]/page.tsx
- [x] T066 [US2] Create customers listing page in frontend/src/app/customers/page.tsx
- [x] T067 [US2] Create customer detail page in frontend/src/app/customers/[id]/page.tsx

### Module Integration

- [x] T068 [US2] Create CustomersModule with all providers and exports in backend/src/customers/customers.module.ts
- [x] T069 [US2] Create InvoicesModule with all providers and exports in backend/src/invoices/invoices.module.ts
- [x] T070 [US2] Register new modules in main AppModule in backend/src/app.module.ts

**Checkpoint**: At this point, users can view, filter, sort and manage all imported invoice and customer data independently

---

## Phase 5: User Story 3 - Sales Dashboard Integration (Priority: P2)

**Goal**: Integrate processed invoice data with existing sales dashboard to provide enhanced analytics and real-time reporting

**Independent Test**: Import invoice data and verify existing sales dashboard displays updated metrics, trends, and analytics from imported data

### Enhanced Sales Analytics

- [ ] T071 [P] [US3] Create enhanced sales metrics service that combines TireMaster and invoice data in backend/src/analytics/services/enhanced-sales.service.ts
- [ ] T072 [P] [US3] Create sales data transformation service for invoice-to-analytics conversion in backend/src/analytics/services/sales-data-transformer.service.ts
- [ ] T073 [US3] Implement dashboard data aggregation service with caching in backend/src/analytics/services/dashboard-aggregation.service.ts

### GraphQL Schema Extension

- [ ] T074 [P] [US3] Create enhanced sales metrics GraphQL types in backend/src/graphql/types/enhanced-sales.types.ts
- [ ] T075 [P] [US3] Create invoice and customer GraphQL types in backend/src/graphql/types/invoice.types.ts
- [ ] T076 [US3] Create enhanced sales analytics resolver in backend/src/graphql/resolvers/enhanced-sales.resolver.ts
- [ ] T077 [US3] Create invoice GraphQL resolver with filtering capabilities in backend/src/graphql/resolvers/invoice.resolver.ts

### Real-time Dashboard Updates

- [ ] T078 [P] [US3] Create sales dashboard WebSocket gateway for real-time updates in backend/src/analytics/gateways/sales-updates.gateway.ts
- [ ] T079 [P] [US3] Implement cache invalidation service for dashboard refresh in backend/src/analytics/services/cache-invalidation.service.ts
- [ ] T080 [US3] Create event handlers for automatic dashboard refresh after imports in backend/src/analytics/events/dashboard-refresh.events.ts

### Frontend Dashboard Enhancement

- [ ] T081 [P] [US3] Create enhanced sales metrics hook with real-time updates in frontend/src/hooks/use-enhanced-sales-metrics.ts
- [ ] T082 [P] [US3] Update existing sales dashboard to include invoice data sources in frontend/src/components/dashboard/sales-dashboard.tsx
- [ ] T083 [P] [US3] Create invoice-specific dashboard widgets in frontend/src/components/dashboard/invoice-widgets.tsx
- [ ] T084 [P] [US3] Create customer analytics dashboard components in frontend/src/components/dashboard/customer-analytics.tsx
- [ ] T085 [P] [US3] Implement real-time dashboard update notifications in frontend/src/components/dashboard/live-updates.tsx

### Data Source Integration

- [ ] T086 [US3] Implement automatic SalesData creation from imported invoices in backend/src/csv-import/services/sales-data-integration.service.ts
- [ ] T087 [US3] Create data source breakdown analytics (TireMaster vs Invoice import) in enhanced-sales.service.ts
- [ ] T088 [US3] Implement period-over-period comparison with invoice data in backend/src/analytics/services/period-comparison.service.ts

### Performance and Caching

- [ ] T089 [P] [US3] Implement Redis caching for dashboard metrics in backend/src/analytics/services/analytics-cache.service.ts
- [ ] T090 [P] [US3] Create dashboard cache warming service for common queries in backend/src/analytics/services/cache-warming.service.ts
- [ ] T091 [US3] Implement intelligent cache invalidation after CSV imports in analytics-cache.service.ts

**Checkpoint**: At this point, the sales dashboard automatically displays enhanced analytics from both TireMaster sync and CSV import sources

---

## Phase 6: User Story 4 - Data Validation and Error Handling (Priority: P2)

**Goal**: Implement comprehensive validation, error handling, and recovery mechanisms for production-ready CSV import operations

**Independent Test**: Import CSV files with various data quality issues and verify appropriate validation messages and error handling

### Advanced Data Validation

- [ ] T092 [P] [US4] Create comprehensive CSV field validators in backend/src/csv-import/validators/field-validators.ts
- [ ] T093 [P] [US4] Implement business rule validation service in backend/src/csv-import/validators/business-rule-validator.ts
- [ ] T094 [P] [US4] Create duplicate detection service with configurable strategies in backend/src/csv-import/services/duplicate-detection.service.ts
- [ ] T095 [US4] Implement data type conversion and standardization service in backend/src/csv-import/services/data-standardization.service.ts

### Error Handling and Recovery

- [ ] T096 [US4] Create partial import recovery service for resumable operations in backend/src/csv-import/services/import-recovery.service.ts
- [ ] T097 [US4] Implement comprehensive error reporting with row-level details in backend/src/csv-import/services/error-reporting.service.ts
- [ ] T098 [US4] Create error resolution guidance service for user-actionable feedback in backend/src/csv-import/services/error-guidance.service.ts

### Import Status and Progress Management

- [ ] T099 [P] [US4] Create import status tracking service with detailed progress in backend/src/csv-import/services/import-status.service.ts
- [ ] T100 [P] [US4] Implement import batch management with retry capabilities in backend/src/csv-import/services/batch-management.service.ts
- [ ] T101 [US4] Create import cancellation service for stopping long-running operations in backend/src/csv-import/services/import-cancellation.service.ts

### User Interface for Error Management

- [ ] T102 [P] [US4] Create import progress modal with real-time updates in frontend/src/components/csv-import/import-progress-modal.tsx
- [ ] T103 [P] [US4] Create import error dashboard for reviewing failed records in frontend/src/components/csv-import/error-dashboard.tsx
- [ ] T104 [P] [US4] Create import batch history view in frontend/src/components/csv-import/batch-history.tsx
- [ ] T105 [P] [US4] Create error resolution interface for fixing data issues in frontend/src/components/csv-import/error-resolution.tsx

### REST API for Import Management

- [ ] T106 [P] [US4] Create import batch management controller in backend/src/csv-import/controllers/batch-management.controller.ts
- [ ] T107 [P] [US4] Create import error management controller in backend/src/csv-import/controllers/error-management.controller.ts
- [ ] T108 [P] [US4] Create import status and monitoring endpoints in backend/src/csv-import/controllers/import-status.controller.ts

### System Health and Monitoring

- [ ] T109 [US4] Create import system health check service in backend/src/csv-import/services/system-health.service.ts
- [ ] T110 [US4] Implement import performance monitoring and metrics in backend/src/csv-import/services/performance-monitor.service.ts

**Checkpoint**: At this point, the system handles all error scenarios gracefully with comprehensive user feedback and recovery options

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, testing, and validation that affect multiple user stories

- [ ] T111 [P] Create comprehensive integration tests for end-to-end import workflow in backend/tests/integration/csv-import-workflow.test.ts
- [ ] T112 [P] Create performance tests for large CSV file processing in backend/tests/performance/large-file-import.test.ts
- [ ] T113 [P] Implement CSV import API documentation with OpenAPI examples in backend/src/csv-import/docs/api-documentation.ts
- [ ] T114 [P] Create user guide documentation for CSV format requirements in frontend/docs/csv-import-guide.md
- [ ] T115 [P] Implement security hardening for file upload and processing in backend/src/csv-import/security/file-security.service.ts
- [ ] T116 [P] Create monitoring dashboards for import system health in frontend/src/components/admin/import-monitoring.tsx
- [ ] T117 [P] Implement automated CSV format validation before processing in backend/src/csv-import/services/pre-validation.service.ts
- [ ] T118 Run quickstart.md validation with sample CSV import workflow
- [ ] T119 Create deployment scripts for production CSV import system in backend/scripts/deploy-csv-import.sh
- [ ] T120 Implement backup and recovery procedures for import data in backend/scripts/backup-import-data.sh

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) after foundational phase
  - Or sequentially in priority order (P1 → P1 → P2 → P2)
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories, includes collaborative CSV format work
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1 data but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Uses data from US1/US2 but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Enhances US1 import process but independently testable

### Critical Path: CSV Format Collaboration

**T020-T023** are collaborative tasks that require working together on TireMaster format analysis and mapping. These should be prioritized early in User Story 1 as they block CSV processing implementation.

### Within Each User Story

- Format collaboration and mapping (US1) before CSV processing implementation
- Models before services before controllers
- Core services before API endpoints
- Backend services before frontend components
- Module creation before module registration

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational completes, User Stories 1 and 2 can start in parallel (both P1 priority)
- User Stories 3 and 4 can start in parallel after US1/US2 provide data
- All tasks within a user story marked [P] can run in parallel
- Frontend and backend work can proceed in parallel within each story

---

## Parallel Example: User Story 1 (CSV Import)

```bash
# Launch collaborative format analysis tasks together:
Task T019: "Create TireMaster CSV sample analysis workspace"
Task T023: "Create CSV format validation service" (can run parallel to format analysis)

# After format analysis, launch mapping implementation tasks:
Task T021: "Create configurable TireMaster column mapper"
Task T022: "Create TireMaster data transformation rules"

# Launch entity creation tasks together:
Task T024: "Create ImportBatch entity and service"
Task T025: "Create ImportError entity and service"

# Launch parallel processing components:
Task T037: "Create WebSocket gateway for import progress"
Task T038: "Create import progress events and handlers"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (CSV Import with collaborative format setup)
4. Complete Phase 4: User Story 2 (Data Organization)
5. **STOP and VALIDATE**: Test CSV import → data organization workflow
6. Deploy/demo complete invoice management system

### Incremental Delivery

1. **Foundation** (Phases 1-2) → CSV import infrastructure ready
2. **CSV Import MVP** (Phase 3) → Can process TireMaster files with collaborative format mapping
3. **Data Management** (Phase 4) → Can organize and view imported data
4. **Dashboard Integration** (Phase 5) → Enhanced analytics with invoice data
5. **Production Hardening** (Phase 6) → Robust error handling and validation
6. **Polish & Deploy** (Phase 7) → Production-ready system

### Collaborative Format Work Priority

The TireMaster CSV format collaboration tasks (T020-T023) are critical early deliverables that enable all subsequent CSV processing work. These should be completed first in User Story 1 before proceeding with other implementation tasks.

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- **COLLABORATIVE TASK** = requires working together on TireMaster format analysis
- Each user story is independently completable and testable
- Stop at any checkpoint to validate story independently
- CSV format collaboration is blocking for all import functionality
- Commit after each task or logical group of related tasks
- Test import workflow end-to-end after User Stories 1 & 2 are complete
- Dashboard integration can be developed in parallel with data management