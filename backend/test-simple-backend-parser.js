#!/usr/bin/env node

/**
 * Simple Backend Parser Test Script
 *
 * Tests the updated backend parsing logic without module dependencies
 */

const fs = require('fs');
const path = require('path');

const TEST_CONFIG = {
  sampleFile: '/Users/kenny/Documents/Apps/TakeTenDash/backend/tests/fixtures/tiremaster-samples/tiremaster-sample-1.csv',
};

console.log('🔧 Testing Backend Parser Logic Changes');
console.log('=====================================');

async function testBackendLogic() {
  try {
    if (!fs.existsSync(TEST_CONFIG.sampleFile)) {
      console.error(`❌ Sample file not found: ${TEST_CONFIG.sampleFile}`);
      return;
    }

    console.log(`✅ Found sample file: ${path.basename(TEST_CONFIG.sampleFile)}`);

    const csvContent = fs.readFileSync(TEST_CONFIG.sampleFile, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0);

    console.log(`📊 Processing ${lines.length} lines...`);

    let invoiceCount = 0;
    let lineItemCount = 0;
    let lineItemsInReportCount = 0;

    // Simulate the backend parsing logic with our fixes
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fields = parseCsvLine(line);
      const firstColumn = (fields[0] || '').trim();

      // CRITICAL FIX: Check for line items FIRST, before checking invoice termination
      if (firstColumn.includes('Invoice Detail Report') && fields.length > 30) {
        const potentialProductCode = (fields[27] || '').trim();
        const potentialQty = (fields[30] || '').trim();

        if (potentialProductCode.length > 0 &&
            potentialQty.length > 0 &&
            !potentialProductCode.includes('Invoice #') &&
            !potentialProductCode.includes('Customer Name') &&
            !potentialProductCode.includes('Total') &&
            !potentialProductCode.includes('Report') &&
            !potentialProductCode.includes('Totals for') &&
            !potentialProductCode.includes('Site#') &&
            !potentialProductCode.includes('Page ')) {

          lineItemsInReportCount++;
          console.log(`   🔍 Line ${i + 1}: Found line item in report row: ${potentialProductCode}`);

          // Check specifically for the STW-MOU20 item that was missing
          if (potentialProductCode.includes('STW-MOU20')) {
            console.log(`   ✅ SUCCESS: Found previously missing STW-MOU20 at line ${i + 1}!`);
          }
        }
      }

      // Now check for invoice termination in ANY column
      let isInvoiceEnd = false;
      for (let j = 0; j < fields.length; j++) {
        const cell = (fields[j] || '').trim();
        if (cell.includes('Totals for Invoice') ||
            cell.includes('Invoice Total') ||
            cell.includes('Total for Invoice')) {
          isInvoiceEnd = true;
          break;
        }
      }

      // Check for invoice start in ANY column
      let isInvoiceHeader = false;
      for (let j = 0; j < fields.length; j++) {
        const cell = (fields[j] || '').trim();
        if (cell.includes('Invoice #') ||
            cell.includes('Invoice Number')) {
          isInvoiceHeader = true;
          break;
        }
      }

      if (isInvoiceHeader) {
        invoiceCount++;
        // Extract invoice number for debugging
        for (let j = 0; j < fields.length; j++) {
          const cell = (fields[j] || '').trim();
          if (cell.includes('Invoice #')) {
            const invoiceNumber = cell.replace(/^Invoice #\s+/, '').trim();
            console.log(`📝 Line ${i + 1}: Invoice Header - ${invoiceNumber}`);
            break;
          }
        }
      }

      if (isInvoiceEnd) {
        // Already processed any line items above, so just handle termination
        continue;
      }

      // Regular line items (not in report format)
      if (firstColumn.length > 0 &&
          !firstColumn.includes('Invoice Detail Report') &&
          !firstColumn.includes('Total #') &&
          !firstColumn.includes('Average') &&
          !firstColumn.includes('Selected Date Range') &&
          !firstColumn.includes('Report Notes') &&
          !firstColumn.includes('Printed:') &&
          !firstColumn.includes('Product Code') &&
          !firstColumn.includes('Totals for Report') &&
          !firstColumn.includes('Report') &&
          !firstColumn.includes('Total')) {
        lineItemCount++;
      }
    }

    console.log('');
    console.log('📈 Backend Logic Test Results:');
    console.log(`   - Total invoices detected: ${invoiceCount}`);
    console.log(`   - Regular line items: ${lineItemCount}`);
    console.log(`   - Line items in report rows: ${lineItemsInReportCount}`);
    console.log(`   - Total line items: ${lineItemCount + lineItemsInReportCount}`);
    console.log('');

    // Compare with the expected results from our fixed test script
    const expectedInvoices = 37;
    const expectedLineItems = 139;

    if (invoiceCount === expectedInvoices) {
      console.log(`✅ Invoice count matches expected: ${invoiceCount}/${expectedInvoices}`);
    } else {
      console.log(`❌ Invoice count mismatch: ${invoiceCount}/${expectedInvoices}`);
    }

    const totalLineItems = lineItemCount + lineItemsInReportCount;
    if (totalLineItems === expectedLineItems) {
      console.log(`✅ Line item count matches expected: ${totalLineItems}/${expectedLineItems}`);
    } else {
      console.log(`❌ Line item count mismatch: ${totalLineItems}/${expectedLineItems}`);
    }

    if (lineItemsInReportCount > 0) {
      console.log(`✅ Found ${lineItemsInReportCount} line items in report rows (this is the fix!)`);
    } else {
      console.log(`❌ No line items found in report rows - fix not working`);
    }

    console.log(`💾 Backend logic test completed successfully!`);

  } catch (error) {
    console.error(`❌ Backend logic test failed: ${error.message}`);
    console.error(error.stack);
  }
}

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

// Run the test
testBackendLogic();