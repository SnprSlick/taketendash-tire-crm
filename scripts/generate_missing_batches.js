
const fs = require('fs');
const readline = require('readline');

async function generateBatches() {
  const fileStream = fs.createReadStream('backups/converted_dump_fixed.sql');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const batchIds = new Set();
  // Regex to capture import_batch_id (13th column)
  // It follows 'ACTIVE' (or other status)
  const batchRegex = /'ACTIVE', '([^']+)'/;

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO invoices')) {
      const match = line.match(batchRegex);
      if (match && match[1]) {
        batchIds.add(match[1]);
      }
    }
  }

  console.log('-- Generated missing batches');
  for (const batchId of batchIds) {
    console.log(`INSERT INTO import_batches (id, file_name, original_path, total_records, status, started_at) VALUES ('${batchId}', 'generated_batch_${batchId}', 'generated', 0, 'COMPLETED', NOW()) ON CONFLICT (id) DO NOTHING;`);
  }
}

generateBatches();
