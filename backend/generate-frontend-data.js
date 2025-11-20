#!/usr/bin/env node

/**
 * Generate Frontend Data Script
 *
 * This script extracts the complete parsing results and formats them
 * for use in the frontend CSV import page.
 */

const fs = require('fs');
const path = require('path');

const TEST_CONFIG = {
  sampleFile: '/Users/kenny/Documents/Apps/TakeTenDash/backend/tests/fixtures/tiremaster-samples/tiremaster-sample-1.csv',
  outputFile: '/tmp/csv-import-test/frontend-invoice-data.json'
};

console.log('🔧 Generating Frontend Invoice Data');
console.log('===================================');

async function generateFrontendData() {
  try {
    if (!fs.existsSync(TEST_CONFIG.sampleFile)) {
      console.error(`❌ Sample file not found: ${TEST_CONFIG.sampleFile}`);
      return;
    }

    console.log(`✅ Found sample file: ${path.basename(TEST_CONFIG.sampleFile)}`);

    const csvContent = fs.readFileSync(TEST_CONFIG.sampleFile, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
    const rows = lines.map(line => parseCsvLine(line));

    console.log(`📊 Processing ${lines.length} lines...`);

    let currentInvoice = null;
    let allInvoices = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstColumn = (row[0] || '').trim();

      // CRITICAL FIX: Check for line items FIRST, before checking invoice termination
      // This handles the case where the last line item and "Totals for Invoice #" are on the same row

      // Check if this row has line item data in columns 27+ (even if it also has invoice termination)
      if (firstColumn.includes('Invoice Detail Report') && row.length > 30) {
        const potentialProductCode = (row[27] || '').trim();
        const potentialQty = (row[30] || '').trim();

        if (potentialProductCode.length > 0 &&
            potentialQty.length > 0 &&
            !potentialProductCode.includes('Invoice #') &&
            !potentialProductCode.includes('Customer Name') &&
            !potentialProductCode.includes('Total') &&
            !potentialProductCode.includes('Report') &&
            !potentialProductCode.includes('Totals for') &&
            !potentialProductCode.includes('Site#') &&
            !potentialProductCode.includes('Page ')) {

          // Process the line item FIRST
          if (currentInvoice) {
            const lineItem = extractLineItemFromReportRow(row, i + 1);
            currentInvoice.lineItems.push(lineItem);
          }
        }
      }

      // Now get the row type for other processing
      const rowType = identifyRowTypeUpdated(row);

      switch (rowType) {
        case 'invoice_header':
          const invoiceInfo = extractCompleteInvoiceInfo(row);

          if (invoiceInfo.invoiceNumber) {
            currentInvoice = {
              invoiceNumber: invoiceInfo.invoiceNumber,
              customerName: invoiceInfo.customerName,
              vehicleInfo: invoiceInfo.vehicleInfo,
              mileage: invoiceInfo.mileage,
              invoiceDate: invoiceInfo.invoiceDate,
              salesperson: invoiceInfo.salesperson,
              taxAmount: invoiceInfo.taxAmount,
              totalAmount: invoiceInfo.totalAmount,
              lineItems: []
            };
          }
          break;

        case 'invoice_end':
          if (currentInvoice) {
            allInvoices.push(currentInvoice);
            currentInvoice = null;
          }
          break;

        case 'lineitem':
          if (currentInvoice) {
            const lineItem = extractCompleteLineItem(row, i + 1);
            currentInvoice.lineItems.push(lineItem);
          }
          break;

        case 'lineitem_in_report':
          // Skip this case since we already processed line items above
          break;
      }
    }

    // Handle last invoice
    if (currentInvoice) {
      allInvoices.push(currentInvoice);
    }

    // Generate frontend-compatible data structure
    const frontendData = allInvoices.slice(0, 15).map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      vehicleInfo: inv.vehicleInfo,
      mileage: inv.mileage,
      invoiceDate: inv.invoiceDate,
      salesperson: inv.salesperson,
      taxAmount: inv.taxAmount || 0,
      totalAmount: inv.totalAmount || 0,
      lineItemsCount: inv.lineItems.length,
      lineItems: inv.lineItems.map(item => ({
        line: item.line,
        productCode: item.productCode,
        description: item.description,
        adjustment: item.adjustment,
        quantity: item.quantity,
        partsCost: item.partsCost,
        laborCost: item.laborCost,
        fet: item.fet,
        lineTotal: item.lineTotal,
        cost: item.cost,
        grossProfitMargin: item.grossProfitMargin,
        grossProfit: item.grossProfit
      }))
    }));

    const summary = {
      generatedAt: new Date().toISOString(),
      totalInvoicesAvailable: allInvoices.length,
      totalLineItemsAvailable: allInvoices.reduce((sum, inv) => sum + inv.lineItems.length, 0),
      invoicesIncluded: frontendData.length,
      lineItemsIncluded: frontendData.reduce((sum, inv) => sum + inv.lineItems.length, 0),
      invoices: frontendData
    };

    fs.writeFileSync(TEST_CONFIG.outputFile, JSON.stringify(summary, null, 2));

    console.log('✅ Frontend data generated successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Total invoices available: ${summary.totalInvoicesAvailable}`);
    console.log(`   - Total line items available: ${summary.totalLineItemsAvailable}`);
    console.log(`   - Invoices included in frontend data: ${summary.invoicesIncluded}`);
    console.log(`   - Line items included in frontend data: ${summary.lineItemsIncluded}`);
    console.log(`💾 Data saved to: ${TEST_CONFIG.outputFile}`);

  } catch (error) {
    console.error(`❌ Frontend data generation failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Helper functions (same as test script)

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function identifyRowTypeUpdated(row) {
  if (!row || row.length === 0) return 'ignore';

  // Check for invoice termination
  for (let i = 0; i < row.length; i++) {
    const cell = (row[i] || '').trim();
    if (cell.includes('Totals for Invoice')) {
      return 'invoice_end';
    }
  }

  // Check for invoice start
  for (let i = 0; i < row.length; i++) {
    const cell = (row[i] || '').trim();
    if (cell.includes('Invoice #')) {
      return 'invoice_header';
    }
  }

  const firstColumn = (row[0] || '').trim();

  // Skip known header/summary patterns
  if (firstColumn.includes('Total #') ||
      firstColumn.includes('Average') ||
      firstColumn.includes('Selected Date Range') ||
      firstColumn.includes('Report Notes') ||
      firstColumn.includes('Printed:') ||
      firstColumn.includes('Product Code') ||
      firstColumn.includes('Totals for Report')) {
    return 'ignore';
  }

  // Check for line items hidden in "Invoice Detail Report" rows
  if (firstColumn.includes('Invoice Detail Report')) {
    if (row.length > 30) {
      const potentialProductCode = (row[27] || '').trim();
      const potentialQty = (row[30] || '').trim();

      if (potentialProductCode.length > 0 &&
          potentialQty.length > 0 &&
          !potentialProductCode.includes('Invoice #') &&
          !potentialProductCode.includes('Customer Name') &&
          !potentialProductCode.includes('Total') &&
          !potentialProductCode.includes('Report') &&
          !potentialProductCode.includes('Totals for') &&
          !potentialProductCode.includes('Site#') &&
          !potentialProductCode.includes('Page ')) {
        return 'lineitem_in_report';
      }
    }
    return 'ignore';
  }

  // If first column has content and doesn't match above patterns, likely line item
  if (firstColumn.length > 0 &&
      !firstColumn.includes('Report') &&
      !firstColumn.includes('Total')) {
    return 'lineitem';
  }

  return 'ignore';
}

function extractCompleteInvoiceInfo(row) {
  return {
    invoiceNumber: extractFromRow(row, 'Invoice #'),
    customerName: extractFromRow(row, 'Customer Name:'),
    vehicleInfo: extractFromRow(row, 'Vehicle:'),
    mileage: extractFromRow(row, 'Mileage:'),
    invoiceDate: extractFromRow(row, 'Invoice Date:'),
    salesperson: extractFromRow(row, 'Salesperson:'),
    taxAmount: parseAmount(extractFromRow(row, 'Tax:')),
    totalAmount: parseAmount(extractFromRow(row, 'Total:'))
  };
}

function extractCompleteLineItem(row, lineNumber) {
  return {
    line: lineNumber,
    productCode: (row[0] || '').trim(),
    description: (row[1] || '').trim(),
    adjustment: (row[2] || '').trim() || null,
    quantity: parseFloat(row[3]) || 0,
    partsCost: parseFloat(row[4]) || 0,
    laborCost: parseFloat(row[5]) || 0,
    fet: parseFloat(row[6]) || 0,
    lineTotal: parseFloat(row[7]) || 0,
    cost: parseFloat(row[8]) || 0,
    grossProfitMargin: parseFloat(row[9]) || 0,
    grossProfit: parseFloat(row[10]) || 0
  };
}

function extractLineItemFromReportRow(row, lineNumber) {
  return {
    line: lineNumber,
    productCode: (row[27] || '').trim(),
    description: (row[28] || '').trim(),
    adjustment: (row[29] || '').trim() || null,
    quantity: parseFloat(row[30]) || 0,
    partsCost: parseFloat(row[31]) || 0,
    laborCost: parseFloat(row[32]) || 0,
    fet: parseFloat(row[33]) || 0,
    lineTotal: parseFloat(row[34]) || 0,
    cost: parseFloat(row[35]) || 0,
    grossProfitMargin: parseFloat(row[36]) || 0,
    grossProfit: parseFloat(row[37]) || 0
  };
}

function extractFromRow(row, pattern) {
  for (let i = 0; i < row.length; i++) {
    const cell = row[i] || '';
    if (cell.includes(pattern)) {
      return cell.replace(pattern, '').trim();
    }
  }
  return null;
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[$,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Run the generator
generateFrontendData();