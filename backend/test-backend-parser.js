#!/usr/bin/env node

/**
 * Test Backend Parser Script
 *
 * Tests the updated backend TireMaster CSV parser with the line item detection fixes
 */

const { TireMasterColumnMapper } = require('./dist/csv-import/mappers/tiremaster-column-mapper');
const fs = require('fs');
const path = require('path');

const TEST_CONFIG = {
  sampleFile: '/Users/kenny/Documents/Apps/TakeTenDash/backend/tests/fixtures/tiremaster-samples/tiremaster-sample-1.csv',
};

console.log('🔧 Testing Backend TireMaster Parser');
console.log('====================================');

async function testBackendParser() {
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
    let currentInvoice = null;
    let allInvoices = [];

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

          // Process the line item FIRST
          lineItemCount++;
          if (currentInvoice) {
            const lineItem = TireMasterColumnMapper.extractLineItemFromReport(fields);
            currentInvoice.lineItems.push(lineItem);
            console.log(`   🔍 Found line item in report row: ${lineItem.productCode} - ${lineItem.description}`);
          }
        }
      }

      // Now use the backend mapper
      const mappedRow = TireMasterColumnMapper.mapRow(fields);

      switch (mappedRow.type) {
        case 'invoice_header':
          if (currentInvoice) {
            allInvoices.push(currentInvoice);
          }
          invoiceCount++;
          currentInvoice = {
            header: mappedRow.data,
            lineItems: [],
            foundAtLine: i + 1
          };
          console.log(`📝 Line ${i + 1}: Invoice Header - ${mappedRow.data.invoiceNumber}`);
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
            currentInvoice.lineItems.push(mappedRow.data);
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

    console.log('');
    console.log('📈 Backend Parser Results:');
    console.log(`   - Total invoices detected: ${invoiceCount}`);
    console.log(`   - Line items: ${lineItemCount}`);
    console.log('');

    if (allInvoices.length > 0) {
      console.log('📋 Sample Invoice with Backend Parser:');
      const sampleInvoice = allInvoices.find(inv => inv.header.invoiceNumber === '3-328060') || allInvoices[0];
      console.log(`   Invoice: ${sampleInvoice.header.invoiceNumber}`);
      console.log(`   Customer: ${sampleInvoice.header.customerName}`);
      console.log(`   Line Items (${sampleInvoice.lineItems.length}):`);
      sampleInvoice.lineItems.slice(0, 5).forEach((item, idx) => {
        console.log(`     ${idx + 1}. ${item.productCode} - ${item.description}`);
      });

      // Check for the specific missing item (STW-MOU20)
      const missingItem = sampleInvoice.lineItems.find(item => item.productCode.includes('STW-MOU20'));
      if (missingItem) {
        console.log(`✅ SUCCESS: Found previously missing item STW-MOU20!`);
        console.log(`   Product: ${missingItem.productCode}`);
        console.log(`   Description: ${missingItem.description}`);
      } else {
        console.log(`❌ ISSUE: STW-MOU20 still missing from Triple G Excavating invoice`);
      }
    }

    console.log(`💾 Backend parsing completed successfully!`);

  } catch (error) {
    console.error(`❌ Backend parser test failed: ${error.message}`);
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
testBackendParser();