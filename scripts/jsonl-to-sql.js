
const fs = require('fs');
const readline = require('readline');

async function jsonlToSql(filePath, outputPath) {
  console.log(`Converting ${filePath} to SQL...`);
  
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const writeStream = fs.createWriteStream(outputPath);
  
  // Helper to escape SQL strings
  const escape = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    // Escape single quotes by doubling them
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  // Helper to format Date for SQL
  const formatDate = (dateStr) => {
    if (!dateStr) return 'NULL';
    return `'${new Date(dateStr).toISOString()}'`;
  };

  let count = 0;
  let skipped = 0;

  // Create a dummy import batch if needed to satisfy foreign key constraints
  writeStream.write(`INSERT INTO import_batches (id, file_name, original_path, total_records, status, started_at) VALUES ('legacy-import-batch', 'legacy_import.jsonl', 'legacy', 0, 'COMPLETED', NOW()) ON CONFLICT (id) DO NOTHING;\n\n`);

  for await (const line of rl) {
    try {
      if (!line.trim()) continue;
      
      const record = JSON.parse(line);
      const model = record.model;
      const data = record.data;

      if (model === 'invoiceCustomer') {
        const sql = `INSERT INTO invoice_customers (id, name, email, phone, address, "customerCode", created_at, updated_at) VALUES (${escape(data.id)}, ${escape(data.name)}, ${escape(data.email)}, ${escape(data.phone)}, ${escape(data.address)}, ${escape(data.customerCode)}, ${formatDate(data.createdAt)}, ${formatDate(data.updatedAt)}) ON CONFLICT (id) DO NOTHING;\n`;
        writeStream.write(sql);
      } else if (model === 'invoice') {
        // Note: store_id and import_batch_id might be missing in JSONL or need handling.
        // Assuming they are nullable or we provide defaults if schema requires.
        // Schema says: importBatchId String @map("import_batch_id") (Required)
        // We need a dummy import batch ID if it's missing.
        
        const importBatchId = data.importBatchId || 'legacy-import-batch';
        
        const sql = `INSERT INTO invoices (id, invoice_number, customer_id, invoice_date, salesperson, vehicle_info, mileage, subtotal, tax_amount, total_amount, gross_profit, status, import_batch_id, created_at, updated_at, store_id, labor_cost, parts_cost, fet_total, environmental_fee, total_cost) VALUES (${escape(data.id)}, ${escape(data.invoiceNumber)}, ${escape(data.customerId)}, ${formatDate(data.invoiceDate)}, ${escape(data.salesperson)}, ${escape(data.vehicleInfo)}, ${escape(data.mileage)}, ${data.subtotal || 0}, ${data.taxAmount || 0}, ${data.totalAmount || 0}, ${data.grossProfit || 0}, 'ACTIVE', ${escape(importBatchId)}, ${formatDate(data.createdAt)}, ${formatDate(data.updatedAt)}, ${escape(data.storeId)}, ${data.laborCost || 0}, ${data.partsCost || 0}, ${data.fetTotal || 0}, ${data.environmentalFee || 0}, ${data.totalCost || 0}) ON CONFLICT (id) DO NOTHING;\n`;
        writeStream.write(sql);
      } else if (model === 'invoiceLineItem') {
        const sql = `INSERT INTO invoice_line_items (id, invoice_id, line_number, product_code, description, adjustment, quantity, parts_cost, labor_cost, fet, line_total, cost_price, gross_profit_margin, gross_profit, created_at) VALUES (${escape(data.id)}, ${escape(data.invoiceId)}, ${data.line || 0}, ${escape(data.productCode)}, ${escape(data.description)}, ${escape(data.adjustment)}, ${data.quantity || 0}, ${data.partsCost || 0}, ${data.laborCost || 0}, ${data.fet || 0}, ${data.lineTotal || 0}, ${data.cost || 0}, ${data.grossProfitMargin || 0}, ${data.grossProfit || 0}, ${formatDate(data.createdAt)}) ON CONFLICT (id) DO NOTHING;\n`;
        writeStream.write(sql);
      }

      count++;
      if (count % 1000 === 0) process.stdout.write(`.`);
      
    } catch (err) {
      console.error(`\nError processing line: ${err.message}`);
      skipped++;
    }
  }

  writeStream.end();

  console.log(`\nConversion complete.`);
  console.log(`Processed: ${count}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Output saved to: ${outputPath}`);
}

const filePath = process.argv[2];
const outputPath = process.argv[3] || 'backups/converted_dump.sql';

if (!filePath) {
    console.error('Please provide a file path');
    process.exit(1);
}

jsonlToSql(filePath, outputPath).catch(console.error);
