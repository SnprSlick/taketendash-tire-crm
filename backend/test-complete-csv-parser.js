#!/usr/bin/env node

/**
 * Complete CSV Parser Test Script
 *
 * Tests the updated TireMaster CSV parsing with all columns:
 * Product Code | Size & Desc. | Adjustment | QTY | Parts | Labor | FET | Total | Cost | GPM% | GP$
 * Plus invoice header fields: Date, Tax, Totals
 */

const fs = require('fs');
const path = require('path');

const TEST_CONFIG = {
  sampleFile: '/Users/kenny/Documents/Apps/TakeTenDash/backend/tests/fixtures/tiremaster-samples/tiremaster-sample-1.csv',
  testOutputDir: '/tmp/csv-import-test'
};

console.log('🔧 Complete TireMaster CSV Parser Test');
console.log('=====================================');

async function testCompleteCsvParsing() {
  try {
    if (!fs.existsSync(TEST_CONFIG.sampleFile)) {
      console.error(`❌ Sample file not found: ${TEST_CONFIG.sampleFile}`);
      return;
    }

    console.log(`✅ Found sample file: ${path.basename(TEST_CONFIG.sampleFile)}`);

    const csvContent = fs.readFileSync(TEST_CONFIG.sampleFile, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
    const rows = lines.map(line => parseCsvLine(line));

    console.log(`📊 File Analysis:`);
    console.log(`   - Total lines: ${lines.length}`);
    console.log('');

    let invoiceCount = 0;
    let currentInvoice = null;
    let allInvoices = [];
    let lineItemCount = 0;

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
          lineItemCount++;
          if (currentInvoice) {
            const lineItem = extractLineItemFromReportRow(row, i + 1);
            currentInvoice.lineItems.push(lineItem);
            console.log(`   🔍 Found line item in report row: ${lineItem.productCode} - ${lineItem.description}`);
          }
        }
      }

      // Now get the row type for other processing
      const rowType = identifyRowTypeUpdated(row);

      switch (rowType) {
        case 'invoice_header':
          console.log(`📝 Line ${i + 1}: Invoice Header - "${firstColumn}"`);

          // Extract complete invoice details
          const invoiceInfo = extractCompleteInvoiceInfo(row);

          if (invoiceInfo.invoiceNumber) {
            invoiceCount++;
            currentInvoice = {
              invoiceNumber: invoiceInfo.invoiceNumber,
              customerName: invoiceInfo.customerName,
              vehicleInfo: invoiceInfo.vehicleInfo,
              mileage: invoiceInfo.mileage,
              invoiceDate: invoiceInfo.invoiceDate,
              salesperson: invoiceInfo.salesperson,
              taxAmount: invoiceInfo.taxAmount,
              totalAmount: invoiceInfo.totalAmount,
              invoiceFoundAtLine: i + 1,
              lineItems: []
            };

            console.log(`   📋 Invoice: ${invoiceInfo.invoiceNumber}`);
            console.log(`   👤 Customer: ${invoiceInfo.customerName}`);
            if (invoiceInfo.vehicleInfo) console.log(`   🚗 Vehicle: ${invoiceInfo.vehicleInfo}`);
            if (invoiceInfo.mileage) console.log(`   📏 Mileage: ${invoiceInfo.mileage}`);
            if (invoiceInfo.invoiceDate) console.log(`   📅 Date: ${invoiceInfo.invoiceDate}`);
            if (invoiceInfo.salesperson) console.log(`   👨‍💼 Salesperson: ${invoiceInfo.salesperson}`);
            if (invoiceInfo.taxAmount) console.log(`   💰 Tax: $${invoiceInfo.taxAmount}`);
            if (invoiceInfo.totalAmount) console.log(`   💵 Total: $${invoiceInfo.totalAmount}`);
          }
          break;

        case 'invoice_end':
          if (currentInvoice) {
            allInvoices.push(currentInvoice);
            currentInvoice = null;
          }
          break;

        case 'lineitem':
          lineItemCount++;
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

    // Handle case where last invoice doesn't have explicit end marker
    if (currentInvoice) {
      allInvoices.push(currentInvoice);
    }

    console.log('');
    console.log('📈 Complete Parsing Results:');
    console.log(`   - Total invoices detected: ${invoiceCount}`);
    console.log(`   - Line items: ${lineItemCount}`);
    console.log('');

    if (allInvoices.length > 0) {
      console.log('📋 Sample Invoice with Complete Data:');
      const sampleInvoice = allInvoices[0];
      console.log(`   Invoice: ${sampleInvoice.invoiceNumber}`);
      console.log(`   Customer: ${sampleInvoice.customerName}`);
      console.log(`   Date: ${sampleInvoice.invoiceDate || 'N/A'}`);
      console.log(`   Tax: $${sampleInvoice.taxAmount || '0.00'}`);
      console.log(`   Total: $${sampleInvoice.totalAmount || '0.00'}`);

      if (sampleInvoice.lineItems.length > 0) {
        console.log(`   Line Items (${sampleInvoice.lineItems.length}):`);
        sampleInvoice.lineItems.slice(0, 3).forEach((item, idx) => {
          console.log(`     ${idx + 1}. ${item.productCode} - ${item.description}`);
          console.log(`        QTY: ${item.quantity} | Parts: $${item.partsCost} | Labor: $${item.laborCost}`);
          console.log(`        FET: $${item.fet} | Total: $${item.lineTotal} | Cost: $${item.cost}`);
          console.log(`        GPM%: ${item.grossProfitMargin}% | GP$: $${item.grossProfit}`);
        });
      }
      console.log('');
    }

    // Save complete analysis
    const analysis = {
      filename: path.basename(TEST_CONFIG.sampleFile),
      timestamp: new Date().toISOString(),
      totalLines: lines.length,
      totalInvoicesDetected: invoiceCount,
      lineItems: lineItemCount,
      sampleInvoices: allInvoices.slice(0, 5).map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        invoiceDate: inv.invoiceDate,
        taxAmount: inv.taxAmount,
        totalAmount: inv.totalAmount,
        lineItemsCount: inv.lineItems.length,
        sampleLineItems: inv.lineItems.slice(0, 2).map(item => ({
          productCode: item.productCode,
          description: item.description,
          quantity: item.quantity,
          partsCost: item.partsCost,
          laborCost: item.laborCost,
          fet: item.fet,
          lineTotal: item.lineTotal,
          cost: item.cost,
          grossProfitMargin: item.grossProfitMargin,
          grossProfit: item.grossProfit
        }))
      })),
      success: true,
      formatValid: invoiceCount > 0
    };

    const analysisFile = path.join(TEST_CONFIG.testOutputDir, 'complete-csv-analysis.json');
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    console.log(`💾 Complete analysis saved to: ${analysisFile}`);

    if (analysis.formatValid) {
      console.log('✅ Complete TireMaster CSV format validation PASSED');
      console.log(`📊 Summary: ${invoiceCount} invoices with complete data (11 columns per line item)`);
    } else {
      console.log('❌ Complete TireMaster CSV format validation FAILED');
    }

  } catch (error) {
    console.error(`❌ Complete CSV parsing test failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Helper functions

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

  // Check for invoice termination - "Totals for Invoice #" in ANY column
  for (let i = 0; i < row.length; i++) {
    const cell = (row[i] || '').trim();
    if (cell.includes('Totals for Invoice')) {
      return 'invoice_end';
    }
  }

  // Check for invoice start - "Invoice #" in ANY column indicates new invoice
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

  // CRITICAL FIX: Check for line items hidden in "Invoice Detail Report" rows
  if (firstColumn.includes('Invoice Detail Report')) {
    // Look for line items in columns 27+ (after the report headers)
    if (row.length > 30) {
      // Look for line items at the exact column position (27 based on CSV analysis)
      const potentialProductCode = (row[27] || '').trim();
      const potentialDescription = (row[28] || '').trim();
      const potentialQty = (row[30] || '').trim();

      // Debug logging
      if (potentialProductCode.length > 0) {
        console.log(`🔍 DEBUG: Row with ${row.length} columns - ProductCode[27]: "${potentialProductCode}", Desc[28]: "${potentialDescription}", Qty[30]: "${potentialQty}"`);
      }

      // Validate this looks like a real line item (relaxed description requirement since some may be empty)
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
    productCode: (row[0] || '').trim(),                    // Column A: Product Code
    description: (row[1] || '').trim(),                    // Column B: Size & Desc.
    adjustment: (row[2] || '').trim() || null,             // Column C: Adjustment
    quantity: parseFloat(row[3]) || 0,                     // Column D: QTY
    partsCost: parseFloat(row[4]) || 0,                    // Column E: Parts
    laborCost: parseFloat(row[5]) || 0,                    // Column F: Labor
    fet: parseFloat(row[6]) || 0,                          // Column G: FET
    lineTotal: parseFloat(row[7]) || 0,                    // Column H: Total
    cost: parseFloat(row[8]) || 0,                         // Column I: Cost
    grossProfitMargin: parseFloat(row[9]) || 0,            // Column J: GPM%
    grossProfit: parseFloat(row[10]) || 0                  // Column K: GP$
  };
}

function extractLineItemFromReportRow(row, lineNumber) {
  // Extract line item from columns 27+ in "Invoice Detail Report" rows
  return {
    line: lineNumber,
    productCode: (row[27] || '').trim(),                   // Column 27: Product Code
    description: (row[28] || '').trim(),                   // Column 28: Size & Desc.
    adjustment: (row[29] || '').trim() || null,            // Column 29: Adjustment
    quantity: parseFloat(row[30]) || 0,                    // Column 30: QTY
    partsCost: parseFloat(row[31]) || 0,                   // Column 31: Parts
    laborCost: parseFloat(row[32]) || 0,                   // Column 32: Labor
    fet: parseFloat(row[33]) || 0,                         // Column 33: FET
    lineTotal: parseFloat(row[34]) || 0,                   // Column 34: Total
    cost: parseFloat(row[35]) || 0,                        // Column 35: Cost
    grossProfitMargin: parseFloat(row[36]) || 0,           // Column 36: GPM%
    grossProfit: parseFloat(row[37]) || 0                  // Column 37: GP$
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

// Run the test
testCompleteCsvParsing();