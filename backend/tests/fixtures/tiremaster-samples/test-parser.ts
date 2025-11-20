import * as fs from 'fs';
import * as path from 'path';
import { TireMasterColumnMapper } from '../../../src/csv-import/mappers/tiremaster-column-mapper';
import { TireMasterDataTransformer } from '../../../src/csv-import/mappers/tiremaster-data-transformer';
import { CsvFormatValidator } from '../../../src/csv-import/processors/csv-format-validator';

/**
 * Quick test script to validate our TireMaster parsing logic with actual CSV data
 *
 * Run with: npx ts-node backend/tests/fixtures/tiremaster-samples/test-parser.ts
 */

async function testTireMasterParsing() {
  console.log('🧪 Testing TireMaster CSV parsing...\n');

  const csvPath = path.join(__dirname, 'tiremaster-sample-1.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Sample CSV file not found:', csvPath);
    return;
  }

  try {
    // Read CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0);

    console.log(`📊 File Stats: ${lines.length} total lines\n`);

    // Test format validation
    console.log('1️⃣ Testing Format Validation...');
    const validation = await CsvFormatValidator.validateTireMasterCsv(lines);

    console.log(`   Validation Result: ${validation.isValid ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Total Rows: ${validation.summary.totalRows}`);
    console.log(`   Invoice Headers: ${validation.summary.headerRows}`);
    console.log(`   Line Items: ${validation.summary.lineItemRows}`);
    console.log(`   Estimated Invoices: ${validation.summary.estimatedInvoices}`);

    if (validation.errors.length > 0) {
      console.log(`   Errors: ${validation.errors.length}`);
      validation.errors.slice(0, 3).forEach(error => {
        console.log(`     - Row ${error.rowNumber}: ${error.message}`);
      });
    }

    if (validation.warnings.length > 0) {
      console.log(`   Warnings: ${validation.warnings.length}`);
    }

    console.log('\n2️⃣ Testing Row Parsing...');

    let invoiceCount = 0;
    let lineItemCount = 0;
    let currentInvoice: any = null;
    const invoices: any[] = [];

    // Parse first few rows to test logic
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i];
      const row = line.split('","').map(cell => cell.replace(/^"|"$/g, ''));

      const mappedRow = TireMasterColumnMapper.mapRow(row);

      if (mappedRow.type === 'header') {
        if (currentInvoice) {
          invoices.push(currentInvoice);
        }

        invoiceCount++;
        currentInvoice = {
          header: mappedRow.data,
          lineItems: []
        };

        console.log(`   📋 Invoice ${invoiceCount}: ${(mappedRow.data as any).invoiceNumber} - ${(mappedRow.data as any).customerName}`);

      } else if (mappedRow.type === 'lineitem' && currentInvoice) {
        lineItemCount++;
        currentInvoice.lineItems.push(mappedRow.data);

        const lineItem = mappedRow.data as any;
        console.log(`      💼 ${lineItem.productCode}: ${lineItem.description} (${lineItem.category})`);
      }
    }

    // Add final invoice
    if (currentInvoice) {
      invoices.push(currentInvoice);
    }

    console.log(`\n   Found ${invoiceCount} invoices with ${lineItemCount} total line items\n`);

    // Test data transformation
    if (invoices.length > 0) {
      console.log('3️⃣ Testing Data Transformation...');

      const firstInvoice = invoices[0];
      if (firstInvoice.header && firstInvoice.lineItems.length > 0) {
        const transformed = TireMasterDataTransformer.transformInvoiceData(
          firstInvoice.header,
          firstInvoice.lineItems
        );

        console.log(`   📄 Transformed Invoice:`);
        console.log(`      Number: ${transformed.invoice.invoiceNumber}`);
        console.log(`      Customer: ${transformed.customer.name}`);
        console.log(`      Date: ${transformed.invoice.invoiceDate.toLocaleDateString()}`);
        console.log(`      Salesperson: ${transformed.invoice.salesperson}`);
        console.log(`      Total: $${transformed.invoice.totalAmount.toFixed(2)}`);
        console.log(`      Line Items: ${transformed.lineItems.length}`);

        // Test validation
        const dataValidation = TireMasterDataTransformer.validateTransformedData(transformed);
        console.log(`      Validation: ${dataValidation.isValid ? '✅ Valid' : '❌ Invalid'}`);

        if (!dataValidation.isValid) {
          dataValidation.errors.forEach(error => {
            console.log(`        - ${error}`);
          });
        }
      }
    }

    console.log('\n🎉 Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTireMasterParsing().catch(console.error);