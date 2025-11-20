# TireMaster CSV Format Analysis - FINDINGS

## 🔍 **FORMAT DISCOVERED** - Complex Multi-Section Report

The TireMaster export is **NOT a standard CSV** but a complex formatted report with multiple data sections per row. Here's what I've discovered:

## Format Structure

### Row Types Identified:

**1. Invoice Header Rows** (contain invoice metadata)
```
"Invoice #   3-327551","Customer Name:  AKERS, KENNETH","Vehicle:   TUBE 145/70-6 ","Mileage: 0 / 0","Invoice Date:  9/2/2025","Salesperson:  CHAD C GOAD","Tax:  $0.00","Total:  $0.00"
```

**2. Line Item Rows** (contain product/service details)
```
"SRV-SHOP01",". SHOP SUPPLIES","","1.0","0.00","0.00","0.00","0.00","0.00","0.00","0.00",[TOTALS_DATA],[REPORT_DATA]
```

**3. Report Header/Footer Data** (repeated on every row - can be ignored)
```
...,"Totals for Report","9358.89","3409.75","231.54","13000.18","7844.61","39.66","5155.57","Total # of Invoices:  ","37",...
```

## Key Data Fields Identified

### Invoice Header Fields (when row starts with "Invoice #"):
- **Column 1**: Invoice Number (e.g., "3-327551")
- **Column 2**: Customer Name (e.g., "AKERS, KENNETH")
- **Column 3**: Vehicle Info (e.g., "TUBE 145/70-6")
- **Column 4**: Mileage (e.g., "0 / 0")
- **Column 5**: Invoice Date (e.g., "9/2/2025")
- **Column 6**: Salesperson (e.g., "CHAD C GOAD")
- **Column 7**: Tax Amount (e.g., "$0.00")
- **Column 8**: Total Amount (e.g., "$0.00")

### Line Item Fields (product/service rows):
- **Column 1**: Product Code (e.g., "SRV-SHOP01", "OP19", "ENV-F01")
- **Column 2**: Description (e.g., ". SHOP SUPPLIES", "11L15 AGSTAR RIB IMP TL")
- **Column 3**: Adjustment (usually empty)
- **Column 4**: Quantity (e.g., "1.0", "2.0")
- **Column 5**: Parts Cost (e.g., "0.00", "251.90")
- **Column 6**: Labor Cost (e.g., "0.00", "90.00")
- **Column 7**: FET (Federal Excise Tax) (e.g., "0.00")
- **Column 8**: Line Total (e.g., "0.00", "251.90")
- **Column 9**: Cost (e.g., "0.00", "140.24")
- **Column 10**: Gross Profit Margin % (e.g., "0.00", "44.33")
- **Column 11**: Gross Profit $ (e.g., "0.00", "111.66")

## Product Categories Identified

Based on product codes, I can see these categories:
- **TIRES**: `OP19` (tire products), `11225STKCAS` (tire casing)
- **SERVICES**: `SRV-SHOP01` (shop supplies), `SRV-FLA001` (mount/dismount), `STW-MOU13` (mount/dismount), `STW-BAL12` (balance)
- **FEES**: `ENV-F01` (environmental fee), `48-01-091-1` (tire scrap)

## Data Format Patterns

- **Dates**: "9/2/2025" (M/D/YYYY format)
- **Money**: "$0.00" (includes $ symbol) or "0.00" (plain decimal)
- **Quantities**: "1.0", "2.0" (decimal format)
- **Customer Names**: "LASTNAME, FIRSTNAME" or "COMPANY NAME"

## Processing Strategy

This requires a **multi-pass parser** that:

1. **Identifies row types** by checking first column patterns
2. **Groups data by invoice** (track current invoice context)
3. **Extracts relevant fields** while ignoring report totals
4. **Builds complete invoice records** with line items

## Next Steps for Implementation

1. Create a state machine parser that tracks current invoice
2. Build field extractors for each row type
3. Map product codes to categories
4. Handle monetary value cleanup
5. Group line items under invoices