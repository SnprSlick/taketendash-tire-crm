# TireMaster CSV Sample Template Guide

## What We Need

Please provide 1-2 representative CSV files exported from TireMaster that include invoice data.

### Sample Requirements:

**Content:**
- 3-5 different invoices
- Mix of services: tires, service work, parts, fees
- Different customer types
- Various line item quantities and pricing

**Data Privacy:**
- **IMPORTANT**: Replace all real customer information with test data
- Use fake names like "John Smith", "ABC Company", etc.
- Use test addresses like "123 Main St, Test City, ST 12345"
- Use test phone/email like "555-1234", "test@example.com"

### Expected Invoice Structure

We're expecting the CSV to contain invoice data similar to:

```
Invoice# | Date     | Customer      | Salesperson | Product    | Qty | Price | Total | ...
---------|----------|---------------|-------------|------------|-----|-------|-------|----
2024001  | 1/15/24  | John Smith    | Mike Jones  | Tire P225  | 4   | 125.00| 500.00| ...
2024001  | 1/15/24  | John Smith    | Mike Jones  | Mount/Bal  | 1   | 75.00 | 75.00 | ...
2024002  | 1/16/24  | ABC Company   | Sarah Lee   | Oil Change | 1   | 45.00 | 45.00 | ...
```

### Questions We'll Answer Together:

1. **File Format**: What's the exact column structure?
2. **Data Types**: How are dates, money, quantities formatted?
3. **Organization**: How are multi-line invoices structured?
4. **Categories**: How can we identify tire vs service vs parts items?
5. **Calculations**: Are tax, labor, parts costs broken out?

### How to Share:

Place your anonymized CSV file(s) in this directory:
`/Users/kenny/Documents/Apps/TakeTenDash/backend/tests/fixtures/tiremaster-samples/`

Name them something like:
- `tiremaster-sample-1.csv`
- `tiremaster-sample-2.csv`

Then we can analyze the format together and create the proper mapping configuration!

---

**Ready when you are! Upload the sample files and we'll analyze the format together.**