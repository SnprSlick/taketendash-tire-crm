import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function backupTable(modelName: string, fileStream: fs.WriteStream) {
  console.log(`Backing up ${modelName}...`);
  const batchSize = 1000;
  let skip = 0;
  let count = 0;

  while (true) {
    // @ts-ignore
    const records = await prisma[modelName].findMany({
      take: batchSize,
      skip: skip,
    });

    if (records.length === 0) break;

    for (const record of records) {
      // Write as NDJSON (Newline Delimited JSON)
      // Format: { "model": "modelName", "data": { ... } }
      fileStream.write(JSON.stringify({ model: modelName, data: record }) + '\n');
    }

    count += records.length;
    skip += batchSize;
    process.stdout.write(`\rProcessed ${count} records for ${modelName}`);
  }
  console.log(`\nCompleted ${modelName}: ${count} records`);
}

async function main() {
  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-invoices-recon-${timestamp}.jsonl`;
  const filePath = path.join(backupDir, filename);
  const stream = fs.createWriteStream(filePath);

  console.log(`Starting backup to ${filePath}`);

  try {
    // Backup Invoice related models
    // Note: The order matters for restoration (parents first), but for backup it doesn't strictly matter 
    // unless we want to stream restore later.
    
    // InvoiceCustomer (Parent of Invoice usually, or related)
    await backupTable('invoiceCustomer', stream);
    
    // Invoice (Parent of InvoiceLineItem)
    await backupTable('invoice', stream);
    
    // InvoiceLineItem
    await backupTable('invoiceLineItem', stream);
    
    // ReconciliationBatch (Parent of ReconciliationRecord)
    await backupTable('reconciliationBatch', stream);
    
    // ReconciliationRecord
    await backupTable('reconciliationRecord', stream);

    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📁 Location: ${filePath}`);
  } catch (error) {
    console.error('\n❌ Backup failed:', error);
  } finally {
    stream.end();
    await prisma.$disconnect();
  }
}

main();
