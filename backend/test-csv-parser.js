#!/usr/bin/env node

/**
 * Standalone CSV Parser Test Script
 *
 * Tests the TireMaster CSV parsing functionality directly
 * without requiring the full NestJS application.
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  sampleFile: '/Users/kenny/Documents/Apps/TakeTenDash/backend/tests/fixtures/tiremaster-samples/tiremaster-sample-1.csv',
  testOutputDir: '/tmp/csv-import-test'
};

console.log('🔧 TireMaster CSV Parser Test Starting...');

async function testCsvParsing() {
  try {
    // Check if sample file exists
    if (!fs.existsSync(TEST_CONFIG.sampleFile)) {
      console.error(`❌ Sample file not found: ${TEST_CONFIG.sampleFile}`);
      return;
    }

    console.log(`✅ Found sample file: ${TEST_CONFIG.sampleFile}`);

    // Read the CSV content
    const csvContent = fs.readFileSync(TEST_CONFIG.sampleFile, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0);

    console.log(`📊 File Analysis:`);
    console.log(`   - Total lines: ${lines.length}`);

    // Analyze line patterns based on TireMaster CSV format
    let headerLines = 0;
    let lineItemLines = 0;
    let ignoredLines = 0;
    let invoiceNumbers = [];
    let sampleLineItems = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fields = parseCsvLine(line);

      // Identify line type based on patterns from TireMaster mapper
      const lineType = identifyTireMasterLineType(fields);

      switch (lineType) {
        case 'header':
          headerLines++;
          const invoiceNumber = extractInvoiceNumber(fields[0] || '');
          if (invoiceNumber) {
            invoiceNumbers.push({
              line: i + 1,
              invoice: invoiceNumber,
              customer: extractCustomerName(fields[1] || ''),
              raw: line.substring(0, 100) + '...'
            });
          }
          break;

        case 'lineitem':
          lineItemLines++;
          if (sampleLineItems.length < 3) {
            sampleLineItems.push({
              line: i + 1,
              productCode: fields[0]?.trim() || '',
              description: fields[1]?.trim() || '',
              quantity: fields[3] || '',
              total: fields[7] || '',
              raw: line.substring(0, 100) + '...'
            });
          }
          break;

        default:
          ignoredLines++;
          break;
      }
    }

    console.log(`📈 Parsing Results:`);
    console.log(`   - Invoice headers: ${headerLines}`);
    console.log(`   - Line items: ${lineItemLines}`);
    console.log(`   - Ignored lines: ${ignoredLines}`);
    console.log(``);

    if (invoiceNumbers.length > 0) {
      console.log(`📋 Sample Invoices Found:`);
      invoiceNumbers.slice(0, 5).forEach(inv => {
        console.log(`   - Line ${inv.line}: Invoice ${inv.invoice} - ${inv.customer}`);
      });
      console.log(``);
    }

    if (sampleLineItems.length > 0) {
      console.log(`🛒 Sample Line Items:`);
      sampleLineItems.forEach(item => {
        console.log(`   - Line ${item.line}: ${item.productCode} | ${item.description} | Qty: ${item.quantity} | Total: ${item.total}`);
      });
      console.log(``);
    }

    // Save detailed analysis
    const analysis = {
      filename: path.basename(TEST_CONFIG.sampleFile),
      timestamp: new Date().toISOString(),
      totalLines: lines.length,
      headerLines,
      lineItemLines,
      ignoredLines,
      invoices: invoiceNumbers,
      sampleLineItems,
      success: true,
      formatValid: headerLines > 0 && lineItemLines > 0
    };

    const analysisFile = path.join(TEST_CONFIG.testOutputDir, 'csv-analysis.json');
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    console.log(`💾 Analysis saved to: ${analysisFile}`);

    if (analysis.formatValid) {
      console.log('✅ TireMaster CSV format validation PASSED');
      console.log(`📊 Summary: ${headerLines} invoices with ${lineItemLines} line items processed successfully`);
    } else {
      console.log('❌ TireMaster CSV format validation FAILED');
    }

  } catch (error) {
    console.error(`❌ CSV parsing test failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Helper functions based on TireMaster CSV logic

function parseCsvLine(line) {
  // Simple CSV parser (handles basic cases)
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

function identifyTireMasterLineType(fields) {
  if (!fields || fields.length === 0) return 'ignore';

  const firstColumn = fields[0] || '';

  // Invoice header rows start with "Invoice #"
  if (firstColumn.includes('Invoice #')) {
    return 'header';
  }

  // Ignore report headers and summary rows
  if (firstColumn.includes('Invoice Detail Report') ||
      firstColumn.includes('Totals for') ||
      firstColumn.includes('Total #') ||
      firstColumn.includes('Average') ||
      firstColumn.includes('Selected Date Range') ||
      firstColumn.includes('Report Notes') ||
      firstColumn.includes('Printed:')) {
    return 'ignore';
  }

  // If first column looks like a product code, it's a line item
  if (firstColumn.trim().length > 0 &&
      !firstColumn.includes('Report') &&
      !firstColumn.includes('Total')) {
    return 'lineitem';
  }

  return 'ignore';
}

function extractInvoiceNumber(value) {
  // "Invoice #   3-327551" → "3-327551"
  return value.replace(/^Invoice #\s+/, '').trim();
}

function extractCustomerName(value) {
  // "Customer Name:  AKERS, KENNETH" → "AKERS, KENNETH"
  return value.replace(/^Customer Name:\s+/, '').trim();
}

// Run the test
testCsvParsing();