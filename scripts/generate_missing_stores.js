
const fs = require('fs');
const readline = require('readline');

async function generateStores() {
  const fileStream = fs.createReadStream('backups/converted_dump_fixed.sql');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const storeIds = new Set();
  const storeRegex = /'([^']+)', \d+, \d+, \d+, \d+, \d+\)(?: ON CONFLICT.*)?;/;

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO invoices')) {
      const match = line.match(storeRegex);
      if (match && match[1]) {
        storeIds.add(match[1]);
      }
    }
  }

  console.log('-- Generated missing stores');
  for (const storeId of storeIds) {
    const shortCode = 'S-' + storeId.slice(-8);
    console.log(`INSERT INTO stores (id, code, name, created_at, updated_at) VALUES ('${storeId}', '${shortCode}', 'Generated Store ${shortCode}', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;`);
  }
}

generateStores();
