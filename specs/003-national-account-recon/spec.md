# National Account Reconciliation Spec

## Overview
A new module to handle the reconciliation of National Account payments against generated invoices.

## Data Model
Need to define the fields present in the National Account CSV.
*Assumption*:
- Account Name
- Invoice Number
- Date
- Amount Paid
- Transaction ID/Reference
- Status

## User Flow
1. User navigates to "Reconciliation" tab.
2. User uploads a CSV file.
3. System parses and saves records.
4. System runs matching algorithm against `Invoice` table.
5. User views results:
    - Total Matched
    - Total Unmatched
    - Discrepancies
