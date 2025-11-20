# TireMaster CSV Format Analysis

**Created**: 2025-11-20
**Purpose**: Collaborative analysis of TireMaster invoice CSV format for data import mapping
**Status**: ✅ **ANALYSIS COMPLETE** - Format analyzed, mapping strategy defined

## Overview

Analysis of TireMaster's "Invoice Detail Report" CSV export reveals a complex multi-section format that requires specialized parsing. This document defines the extraction strategy and mapping rules.

## Expected Data Model Mapping

Based on our database schema, we need to extract the following information from TireMaster CSV:

### Invoice Header Information
- **Invoice Number** → `Invoice.invoiceNumber` (unique identifier)
- **Customer Information** → `InvoiceCustomer` (name, contact details)
- **Invoice Date** → `Invoice.invoiceDate`
- **Salesperson** → `Invoice.salesperson`
- **Financial Totals** → `Invoice.subtotal`, `taxAmount`, `totalAmount`
- **Additional Costs** → `Invoice.laborCost`, `partsCost`, `environmentalFee` (optional)

### Line Item Information
- **Product Details** → `InvoiceLineItem.productCode`, `description`
- **Quantities & Pricing** → `InvoiceLineItem.quantity`, `unitPrice`, `lineTotal`
- **Cost Information** → `InvoiceLineItem.costPrice` (for profit calculations)
- **Categories** → `InvoiceLineItem.category` (TIRES, SERVICES, PARTS, FEES, OTHER)

## TireMaster CSV Format Analysis

### Sample File Requirements
Please provide a representative TireMaster invoice CSV export with the following:
- Multiple invoices (3-5 sample invoices)
- Different invoice types (tires, services, parts)
- Various customer types
- **Anonymized customer data** (replace real names/addresses with test data)

### Questions for Analysis

**1. File Structure**
- What is the file naming convention for TireMaster exports?
- Are headers included in the first row?
- What field delimiter is used (comma, semicolon, tab)?
- What text qualifier is used for fields with special characters?
- How are date/time values formatted?

**2. Invoice Organization**
- Is each row a separate line item, or are invoices grouped differently?
- How are multiple line items per invoice structured?
- Are there header/detail/footer rows, or is it flat?

**3. Customer Information**
- How is customer information represented?
- Is customer data repeated on each line item row?
- What customer identifying fields are available?

**4. Financial Data**
- How are monetary values formatted (decimals, currency symbols)?
- Are tax amounts separate or included in totals?
- How are labor vs parts costs differentiated?
- Is cost basis (for profit calculation) included?

**5. Product Categorization**
- How can we identify if a line item is TIRES vs SERVICES vs PARTS?
- Are there product codes or categories we can use?
- How are fees (environmental, disposal) represented?

## ✅ ACTUAL FORMAT DISCOVERED

**Format Type**: Complex multi-section report (NOT standard CSV)
**Sample File**: `tiremaster-sample-1.csv` (178 rows, 105KB)

### Row Structure Pattern:
Each invoice consists of:
1. **Invoice Header Row** - Invoice metadata
2. **Multiple Line Item Rows** - Products/services
3. **Report totals** (embedded in each row, can be ignored)

### Column Mapping - Invoice Header Rows
*When row starts with "Invoice #":*

```
TireMaster Column → Database Field
=================================
Column 1: "Invoice # 3-327551" → Invoice.invoiceNumber
Column 2: "Customer Name: AKERS, KENNETH" → InvoiceCustomer.name
Column 3: "Vehicle: TUBE 145/70-6" → [metadata - not stored]
Column 4: "Mileage: 0 / 0" → [metadata - not stored]
Column 5: "Invoice Date: 9/2/2025" → Invoice.invoiceDate
Column 6: "Salesperson: CHAD C GOAD" → Invoice.salesperson
Column 7: "Tax: $0.00" → Invoice.taxAmount
Column 8: "Total: $0.00" → Invoice.totalAmount
```

### Column Mapping - Line Item Rows
*Product/service detail rows:*

```
TireMaster Column → Database Field
=================================
Column 1: "SRV-SHOP01" → InvoiceLineItem.productCode
Column 2: ". SHOP SUPPLIES" → InvoiceLineItem.description
Column 3: "" → [adjustment - ignore]
Column 4: "1.0" → InvoiceLineItem.quantity
Column 5: "0.00" → Invoice.partsCost (aggregate)
Column 6: "0.00" → Invoice.laborCost (aggregate)
Column 7: "0.00" → [FET - add to total]
Column 8: "0.00" → InvoiceLineItem.lineTotal
Column 9: "0.00" → InvoiceLineItem.costPrice
Column 10: "0.00" → InvoiceLineItem.grossProfitMargin
Column 11: "0.00" → InvoiceLineItem.grossProfit
```

## ✅ DATA TRANSFORMATION RULES

### Field Extraction Patterns:
```typescript
// Invoice Header Extraction (when row[0].startsWith("Invoice #"))
{
  invoiceNumber: (row: string[]) => row[0].replace(/^Invoice #\s+/, '').trim(),
  customerName: (row: string[]) => row[1].replace(/^Customer Name:\s+/, '').trim(),
  invoiceDate: (row: string[]) => parseDate(row[4].replace(/^Invoice Date:\s+/, '')),
  salesperson: (row: string[]) => row[5].replace(/^Salesperson:\s+/, '').trim(),
  taxAmount: (row: string[]) => parseAmount(row[6].replace(/^Tax:\s+/, '')),
  totalAmount: (row: string[]) => parseAmount(row[7].replace(/^Total:\s+/, ''))
}

// Line Item Extraction (product/service rows)
{
  productCode: (row: string[]) => row[0].trim(),
  description: (row: string[]) => row[1].trim(),
  quantity: (row: string[]) => parseFloat(row[3]) || 0,
  partsCost: (row: string[]) => parseFloat(row[4]) || 0,
  laborCost: (row: string[]) => parseFloat(row[5]) || 0,
  lineTotal: (row: string[]) => parseFloat(row[7]) || 0,
  costPrice: (row: string[]) => parseFloat(row[8]) || 0,
  grossProfitMargin: (row: string[]) => parseFloat(row[9]) || 0,
  grossProfit: (row: string[]) => parseFloat(row[10]) || 0
}
```

### Utility Functions:
```typescript
function parseDate(dateStr: string): Date {
  // "9/2/2025" → Date object
  const [month, day, year] = dateStr.split('/');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function parseAmount(amountStr: string): number {
  // "$0.00" or "0.00" → 0.00
  return parseFloat(amountStr.replace(/[$,]/g, '')) || 0;
}
```

### Product Category Mapping:
```typescript
function getProductCategory(productCode: string): ProductCategory {
  const code = productCode.toUpperCase();

  // Tire products
  if (code.includes('OP') || code.includes('TIRE') || code.includes('CASING')) {
    return ProductCategory.TIRES;
  }

  // Services (mount, balance, etc.)
  if (code.startsWith('SRV-') || code.startsWith('STW-')) {
    return ProductCategory.SERVICES;
  }

  // Environmental fees and scrap
  if (code.startsWith('ENV-') || code.includes('SCRAP')) {
    return ProductCategory.FEES;
  }

  // Default to parts
  return ProductCategory.PARTS;
}
```

## Next Steps

### For Collaboration:
1. **Upload Sample CSV**: Place 1-2 anonymized sample files in `/backend/tests/fixtures/tiremaster-samples/`
2. **Review Format**: We'll analyze the structure together
3. **Define Mapping**: Create column mapping based on actual data
4. **Test Import**: Validate the mapping with sample data

### Files to Create:
- `sample-invoice-1.csv` (3-4 invoices with mixed content)
- `sample-invoice-2.csv` (different format variations if any)

### Questions to Discuss:
- Are there multiple export formats depending on settings?
- Are there any optional fields that might not always be present?
- What should happen if required fields are missing?
- How should we handle duplicate invoice numbers?

## Implementation Plan

Once format is analyzed, we'll create:
1. **Column Mapper** (`tiremaster-column-mapper.ts`) - Configurable field mapping
2. **Data Transformer** (`tiremaster-data-transformer.ts`) - Value conversion rules
3. **Format Validator** (`csv-format-validator.ts`) - Structure validation

---

**Ready for collaboration! Please upload sample CSV files to begin analysis.**