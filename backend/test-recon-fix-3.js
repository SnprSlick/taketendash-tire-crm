const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const filePath = path.join(__dirname, 'data/national.csv');
const fileContent = fs.readFileSync(filePath, 'utf-8');

const result = Papa.parse(fileContent, {
  header: false,
  skipEmptyLines: true
});

const rows = result.data;

let currentAccount = '';
const invalidTerms = ['recon report', 'national account', 'narecon', 'reconciliation', 'rec code'];

rows.forEach((row, i) => {
  if (i === 2 || i === 33) {
      console.log(`Row ${i}:`, row);
  }

  const col0 = row[0]?.toString().trim() || '';
  if (col0.toLowerCase().includes('rec code')) {
    let accountName = row[2]?.toString().trim();
    const lowerName = accountName?.toLowerCase() || '';
    const isInvalid = invalidTerms.some(term => lowerName.includes(term));

    if (accountName && !isInvalid) {
      currentAccount = accountName;
      console.log(`Row ${i}: Context Updated -> ${currentAccount}`);
    } else {
      console.log(`Row ${i}: Context Ignored -> ${accountName}`);
    }
  }
  
  // Check for the invoice
  const rowStr = JSON.stringify(row);
  if (rowStr.includes('3-GS321705')) {
      console.log(`Row ${i}: Found Invoice 3-GS321705. Current Account: ${currentAccount}`);
  }
});
