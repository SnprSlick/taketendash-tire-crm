const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend/data/invmfg_new.csv');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Line 4 (index 3)
const line = lines[3];
console.log('Line 4 raw:', line);

let cleanLine = line.trim();
if (cleanLine.startsWith('"')) cleanLine = cleanLine.substring(1);
if (cleanLine.endsWith('"')) cleanLine = cleanLine.substring(0, cleanLine.length - 1);

const columns = cleanLine.split('","');
console.log('Column count:', columns.length);
columns.forEach((col, index) => {
  console.log(`[${index}] ${col}`);
});
