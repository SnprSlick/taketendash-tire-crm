# Implementation Plan: Invoice CSV Import and Data Management

**Branch**: `002-invoice-csv-import` | **Date**: 2025-11-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-invoice-csv-import/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a CSV import system that monitors a backend data folder hourly, automatically processes TireMaster invoice files with custom column mapping, validates and stores invoice data with customer/product relationships, and integrates with existing sales dashboard for analytics. Includes manual trigger capability and robust error handling with audit trails.

## Technical Context

**Language/Version**: TypeScript 5.1.3 with Node.js 20 LTS
**Primary Dependencies**: NestJS 10, Prisma 5.6.0, PostgreSQL, Redis, @nestjs/schedule (for cron jobs)
**Storage**: PostgreSQL with Prisma ORM, Redis for caching, file system for CSV processing
**Testing**: Jest with supertest for integration testing
**Target Platform**: Docker containerized Linux server environment
**Project Type**: Web application (backend CSV processing with frontend dashboard integration)
**Performance Goals**: Process 1000+ invoice records in under 5 minutes, sub-10 second search responses
**Constraints**: 99.5% data accuracy, hourly monitoring schedule, TireMaster format compatibility
**Scale/Scope**: Handle multiple large CSV files (100MB+), thousands of invoices, existing dashboard integration

**CSV Processing Requirements**:
- NEEDS CLARIFICATION: TireMaster CSV column structure and field mappings
- NEEDS CLARIFICATION: File system monitoring implementation approach (chokidar vs cron)
- NEEDS CLARIFICATION: Error handling and recovery strategies for partial imports
- NEEDS CLARIFICATION: Dashboard integration API endpoints and data format

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASSED - Constitution file is template-only, no specific constraints defined

The project constitution file contains only template placeholders and no established principles to evaluate against. This feature implementation can proceed without constitutional constraints.

**Note**: If project-specific constraints are added to constitution later, this section should be re-evaluated.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── csv-import/              # New CSV import feature module
│   │   ├── controllers/         # REST endpoints for manual triggers
│   │   ├── services/            # Business logic for import processing
│   │   ├── processors/          # CSV parsing and validation
│   │   ├── mappers/             # TireMaster format mapping
│   │   ├── schedulers/          # Cron job for hourly monitoring
│   │   └── dto/                 # Data transfer objects
│   ├── invoices/                # Invoice management module
│   │   ├── entities/            # Prisma models for invoices
│   │   ├── services/            # Invoice business logic
│   │   └── controllers/         # Invoice API endpoints
│   ├── customers/               # Customer management module
│   │   ├── entities/            # Customer Prisma models
│   │   ├── services/            # Customer business logic
│   │   └── controllers/         # Customer API endpoints
│   ├── analytics/               # Sales analytics module (existing)
│   │   ├── services/            # Dashboard data aggregation
│   │   └── controllers/         # Analytics API endpoints
│   └── shared/
│       ├── utils/               # Common utilities
│       └── validators/          # Data validation helpers
├── prisma/
│   ├── migrations/              # Database schema migrations
│   └── schema.prisma            # Updated with invoice/customer models
├── data/                        # CSV import monitoring folder
│   └── import/                  # Processed files archive
└── tests/
    ├── integration/             # End-to-end import tests
    ├── unit/                    # Service and utility tests
    └── fixtures/                # Sample CSV files for testing

frontend/
├── src/
│   ├── components/
│   │   ├── invoices/            # Invoice management components
│   │   ├── customers/           # Customer view components
│   │   └── csv-import/          # Import status/trigger components
│   ├── pages/
│   │   ├── invoices/            # Invoice listing/detail pages
│   │   ├── customers/           # Customer management pages
│   │   └── dashboard/           # Updated dashboard (existing)
│   └── services/
│       ├── invoice-api.ts       # Invoice API client
│       ├── customer-api.ts      # Customer API client
│       └── import-api.ts        # Import trigger API client
└── tests/
    ├── components/              # Component tests
    └── integration/             # Frontend integration tests
```

**Structure Decision**: Web application structure selected based on existing NestJS backend and Next.js frontend. New feature modules follow existing patterns with dedicated controllers, services, and entities for separation of concerns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations identified. Feature follows established project patterns and architecture.
