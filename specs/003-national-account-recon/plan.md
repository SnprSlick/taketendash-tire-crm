# National Account Reconciliation Feature Plan

## Goal
Implement a system to import National Account Reconciliation CSV reports, store them, and cross-reference them with existing invoices to track payments and generate analytics.

## Phases

### Phase 1: Database & Backend Setup
- [ ] Design Prisma schema for `ReconciliationRecord` (or similar).
- [ ] Create migration.
- [ ] Create `ReconciliationController` and `ReconciliationService`.
- [ ] Implement CSV parsing logic for the recon report.

### Phase 2: Reconciliation Logic
- [ ] Implement matching logic (Recon Invoice # <-> System Invoice #).
- [ ] Calculate status (Matched, Partial, Missing, Overpaid).
- [ ] Create endpoints for retrieving reconciliation stats and lists.

### Phase 3: Frontend Implementation
- [ ] Add "Reconciliation" to the main navigation.
- [ ] Create the Reconciliation Dashboard page.
- [ ] Implement CSV file upload UI.
- [ ] Display reconciliation results (Matched vs Unmatched).
- [ ] Add detailed view for reconciliation items.

### Phase 4: Analytics & Reporting
- [ ] Add charts/stats for Payouts vs Expected.
- [ ] Export functionality.
