#!/usr/bin/env node

/**
 * Updated CSV Parser Test Script
 *
 * Tests the updated TireMaster CSV parsing logic based on user feedback:
 * - Customer name comes first
 * - Invoice number appears a couple rows down
 * - "Totals for Invoice" marks end of invoice
 * - Column A: NOT "Invoice Detail Report" = new invoice starts
 */

const fs = require('fs');
const path = require('path');

const TEST_CONFIG = {
  sampleFile: '/Users/kenny/Documents/Apps/TakeTenDash/backend/tests/fixtures/tiremaster-samples/tiremaster-sample-1.csv',
  testOutputDir: '/tmp/csv-import-test'
};

console.log('🔧 Updated TireMaster CSV Parser Test');
console.log('=====================================');

async function testUpdatedCsvParsing() {
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

    // Apply updated logic based on user feedback
    let invoiceCount = 0;
    let currentInvoice = null;
    let allInvoices = [];
    let lineItemCount = 0;
    let customerStartRows = [];
    let invoiceEndRows = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowType = identifyRowTypeUpdated(row);
      const firstColumn = (row[0] || '').trim();

      switch (rowType) {
        case 'invoice_header':
          console.log(`📝 Line ${i + 1}: Invoice Header - "${firstColumn}"`);

          // Extract invoice details from the row (search all columns)
          const invoiceNumber = extractInvoiceNumberFromRow(row);
          const customerName = extractCustomerFromRow(row);
          const vehicleInfo = extractVehicleFromRow(row);
          const mileage = extractMileageFromRow(row);
          const salesperson = extractSalespersonFromRow(row);

          if (invoiceNumber && customerName) {
            invoiceCount++;
            currentInvoice = {
              customerName,
              invoiceNumber,
              customerLine: i + 1,
              invoiceFoundAtLine: i + 1,
              vehicleInfo,
              mileage,
              salesperson,
              lineItems: []
            };

            console.log(`   📋 Invoice: ${invoiceNumber}`);
            console.log(`   👤 Customer: ${customerName}`);
            if (vehicleInfo) console.log(`   🚗 Vehicle: ${vehicleInfo}`);
            if (mileage) console.log(`   📏 Mileage: ${mileage}`);
            if (salesperson) console.log(`   👨‍💼 Salesperson: ${salesperson}`);

            customerStartRows.push({ line: i + 1, customer: customerName, invoice: invoiceNumber });
          } else {
            console.log(`   ⚠️  Could not extract invoice/customer info from row`);
          }
          break;

        case 'invoice_end':
          console.log(`📄 Line ${i + 1}: Invoice End - "${firstColumn}"`);
          invoiceEndRows.push({ line: i + 1, content: firstColumn });
          if (currentInvoice) {
            allInvoices.push(currentInvoice);
            currentInvoice = null;
          }
          break;

        case 'lineitem':
          lineItemCount++;
          if (currentInvoice) {
            const lineItem = {
              line: i + 1,
              productCode: row[0]?.trim() || '',
              description: row[1]?.trim() || '',
              quantity: row[3] || '',
              total: row[7] || ''
            };
            currentInvoice.lineItems.push(lineItem);
          }
          break;
      }
    }

    // Handle case where last invoice doesn't have explicit end marker
    if (currentInvoice) {
      allInvoices.push(currentInvoice);
    }

    console.log('');
    console.log('📈 Updated Parsing Results:');
    console.log(`   - Customer start rows: ${customerStartRows.length}`);
    console.log(`   - Invoice end rows: ${invoiceEndRows.length}`);
    console.log(`   - Total invoices detected: ${invoiceCount}`);
    console.log(`   - Line items: ${lineItemCount}`);
    console.log('');

    if (allInvoices.length > 0) {
      console.log('📋 All Invoices Found:');
      allInvoices.forEach((invoice, idx) => {
        console.log(`   ${idx + 1}. Invoice ${invoice.invoiceNumber}`);
        console.log(`      Customer: ${invoice.customerName} (line ${invoice.customerLine})`);
        console.log(`      Invoice found at line: ${invoice.invoiceFoundAtLine}`);
        if (invoice.vehicleInfo) console.log(`      Vehicle: ${invoice.vehicleInfo}`);
        if (invoice.mileage) console.log(`      Mileage: ${invoice.mileage}`);
        if (invoice.salesperson) console.log(`      Salesperson: ${invoice.salesperson}`);
        console.log(`      Line items: ${invoice.lineItems.length}`);
        console.log('');
      });
    }

    // Save updated analysis
    const analysis = {
      filename: path.basename(TEST_CONFIG.sampleFile),
      timestamp: new Date().toISOString(),
      totalLines: lines.length,
      customerStarts: customerStartRows.length,
      invoiceEnds: invoiceEndRows.length,
      totalInvoicesDetected: invoiceCount,
      lineItems: lineItemCount,
      allInvoices,
      success: true,
      formatValid: invoiceCount > 0
    };

    const analysisFile = path.join(TEST_CONFIG.testOutputDir, 'updated-csv-analysis.json');
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    console.log(`💾 Updated analysis saved to: ${analysisFile}`);

    if (analysis.formatValid) {
      console.log('✅ Updated TireMaster CSV format validation PASSED');
      console.log(`📊 Summary: ${invoiceCount} invoices with ${lineItemCount} line items processed`);
    } else {
      console.log('❌ Updated TireMaster CSV format validation FAILED');
    }

  } catch (error) {
    console.error(`❌ Updated CSV parsing test failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Helper functions implementing updated logic

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

  const firstColumn = (row[0] || '').trim();

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

  // Skip rows that are clearly report headers/summaries
  if (firstColumn.includes('Total #') ||
      firstColumn.includes('Average') ||
      firstColumn.includes('Selected Date Range') ||
      firstColumn.includes('Report Notes') ||
      firstColumn.includes('Printed:') ||
      firstColumn.includes('Product Code') ||
      firstColumn.includes('Totals for Report')) {
    return 'ignore';
  }

  // Skip "Invoice Detail Report" rows if they don't contain "Invoice #" (already checked above)
  if (firstColumn.includes('Invoice Detail Report')) {
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

function looksLikeCustomerName(value) {
  const trimmed = value.trim().toUpperCase();
  if (trimmed.length < 3) return false;

  if (trimmed.includes('INVOICE') || trimmed.includes('REPORT') ||
      trimmed.includes('TOTAL') || trimmed.includes('$') || /^\d+$/.test(trimmed)) {
    return false;
  }

  // Customer names often have comma (LAST, FIRST format) or multiple words
  if (trimmed.includes(',') && /[A-Z]{2,}/.test(trimmed)) return true;

  const words = trimmed.split(/\s+/);
  if (words.length >= 2 && words.every(word => /^[A-Z]{2,}$/.test(word))) return true;

  return false;
}

function looksLikeInvoiceNumber(value) {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;

  return /^\d+-\d+$/.test(trimmed) ||        // "3-327551"
         /^INV-?\d+$/i.test(trimmed) ||      // "INV-12345"
         /^\d{5,}$/.test(trimmed);           // "327551"
}

function findInvoiceNumberInArea(rows, startIndex) {
  const searchRange = Math.min(5, rows.length - startIndex);

  for (let i = startIndex; i < startIndex + searchRange; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cell = row[colIndex] || '';
      const trimmedCell = cell.trim();

      if (looksLikeInvoiceNumber(trimmedCell) || trimmedCell.includes('Invoice #')) {
        const invoiceNumber = extractInvoiceNumber(trimmedCell);
        if (invoiceNumber) {
          // Look for vehicle, mileage, salesperson in same area
          const additionalInfo = extractAdditionalInfo(rows, startIndex, startIndex + searchRange);

          return {
            invoiceNumber,
            foundAtIndex: i,
            ...additionalInfo
          };
        }
      }
    }
  }
  return null;
}

function extractInvoiceNumber(value) {
  return value.replace(/^Invoice #\s+/, '').trim();
}

function extractInvoiceNumberFromRow(row) {
  // Look for "Invoice #" in any column
  for (let i = 0; i < row.length; i++) {
    const cell = row[i] || '';
    if (cell.includes('Invoice #')) {
      return cell.replace(/^Invoice #\s+/, '').trim();
    }
  }
  return null;
}

function extractCustomerFromRow(row) {
  // Look for "Customer Name:" in any column
  for (let i = 0; i < row.length; i++) {
    const cell = row[i] || '';
    if (cell.includes('Customer Name:')) {
      return cell.replace(/^Customer Name:\s+/, '').trim();
    }
  }
  return null;
}

function extractVehicleFromRow(row) {
  // Look for "Vehicle:" in any column
  for (let i = 0; i < row.length; i++) {
    const cell = row[i] || '';
    if (cell.includes('Vehicle:')) {
      return cell.replace(/^Vehicle:\s+/, '').trim();
    }
  }
  return null;
}

function extractMileageFromRow(row) {
  // Look for "Mileage:" in any column
  for (let i = 0; i < row.length; i++) {
    const cell = row[i] || '';
    if (cell.includes('Mileage:')) {
      return cell.replace(/^Mileage:\s+/, '').trim();
    }
  }
  return null;
}

function extractSalespersonFromRow(row) {
  // Look for "Salesperson:" in any column
  for (let i = 0; i < row.length; i++) {
    const cell = row[i] || '';
    if (cell.includes('Salesperson:')) {
      return cell.replace(/^Salesperson:\s+/, '').trim();
    }
  }
  return null;
}

function extractAdditionalInfo(rows, startIndex, endIndex) {
  let vehicleInfo, mileage, salesperson;

  for (let i = startIndex; i < endIndex && i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cell = row[colIndex] || '';

      if (cell.includes('Vehicle:') && !vehicleInfo) {
        vehicleInfo = cell.replace(/^Vehicle:\s+/, '').trim();
      }
      if (cell.includes('Mileage:') && !mileage) {
        mileage = cell.replace(/^Mileage:\s+/, '').trim();
      }
      if (cell.includes('Salesperson:') && !salesperson) {
        salesperson = cell.replace(/^Salesperson:\s+/, '').trim();
      }
    }
  }

  return { vehicleInfo, mileage, salesperson };
}

// Run the test
testUpdatedCsvParsing();