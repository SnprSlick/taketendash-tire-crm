# Store Dashboard Plan

## Goal
Create a comprehensive dashboard to view performance, staffing, and activity for each store location.

## Features

### 1. Store Overview Page (`/stores`)
- List of all stores with high-level metrics (if available) or just a card grid.
- Navigation to individual store details.

### 2. Store Detail Page (`/stores/[id]`)
- **Header**: Store Name, Code.
- **KPI Cards**:
  - Total Revenue (Month to Date).
  - Gross Profit (Month to Date).
  - Invoice Count (Car Count).
  - Average Ticket.
- **Staff Section**:
  - List of Mechanics assigned to this store.
  - List of Service Advisors (if we can determine them).
- **Recent Activity**:
  - List of recent invoices for this store.

## Technical Implementation

### Backend
- **Update `StoreController`**:
  - `GET /stores`: List all stores (already exists, maybe enhance).
  - `GET /stores/:id`: Get store details.
  - `GET /stores/:id/stats`: Get store statistics (revenue, GP, etc.).
  - `GET /stores/:id/employees`: Get employees assigned to this store.
- **Service Layer**:
  - Create `StoreService` (currently logic is in controller, should refactor).
  - Implement aggregation queries for sales data linked to the store.

### Frontend
- **New Route**: `src/app/stores/page.tsx` (List).
- **New Route**: `src/app/stores/[id]/page.tsx` (Detail).
- **Components**:
  - `src/components/stores/store-card.tsx`
  - `src/components/stores/store-stats.tsx`
  - `src/components/stores/store-employee-list.tsx`

## Data Sources
- `Store` model (Prisma).
- `Invoice` model (linked to Store via `storeId`? Need to check schema).
- `Employee` model (linked to Store via `_EmployeeToStore`).
- `MechanicLabor` (for performance data, linked via Invoice -> Store?).

## Schema Check
Need to verify if `Invoice` has `storeId`.
