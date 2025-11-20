#!/usr/bin/env node

const fs = require('fs');

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

const csvPath = '/Users/kenny/Documents/Apps/TakeTenDash/backend/tests/fixtures/tiremaster-samples/tiremaster-sample-1.csv';
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');

// Find the OP19 line
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"OP19"')) {
    const fields = parseCsvLine(lines[i]);
    console.log(`\nLine ${i + 1} - OP19 line has ${fields.length} columns:`);
    
    // Find OP19 in the columns
    fields.forEach((field, index) => {
      if (field.includes('OP19') || index >= 24 && index <= 38) {
        console.log(`  Column ${index}: "${field}"`);
      }
    });
    break;
  }
}

// Find the ENV-F01 line
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"ENV-F01"') && lines[i].includes('Invoice Detail Report')) {
    const fields = parseCsvLine(lines[i]);
    console.log(`\nLine ${i + 1} - ENV-F01 line (in report) has ${fields.length} columns:`);
    
    fields.forEach((field, index) => {
      if (field.includes('ENV') || (index >= 24 && index <= 38)) {
        console.log(`  Column ${index}: "${field}"`);
      }
    });
    break;
  }
}
