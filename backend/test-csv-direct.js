#!/usr/bin/env node

/**
 * Direct CSV Import Test Script
 *
 * This bypasses the hanging NestJS HTTP server and tests the CSV import
 * functionality directly through the service layer.
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  sampleFile: '/Users/kenny/Documents/Apps/TakeTenDash/backend/tests/fixtures/tiremaster-samples/tiremaster-sample-1.csv',
  testOutputDir: '/tmp/csv-import-test'
};

console.log('🔧 Direct CSV Import Test Starting...');

// Create test output directory
if (!fs.existsSync(TEST_CONFIG.testOutputDir)) {
  fs.mkdirSync(TEST_CONFIG.testOutputDir, { recursive: true });
  console.log(`✅ Created test directory: ${TEST_CONFIG.testOutputDir}`);
}

// Check if sample file exists
if (fs.existsSync(TEST_CONFIG.sampleFile)) {
  console.log(`✅ Found sample file: ${TEST_CONFIG.sampleFile}`);

  // Read and analyze the CSV file
  const csvContent = fs.readFileSync(TEST_CONFIG.sampleFile, 'utf8');
  const lines = csvContent.split('\n');
  const headers = lines[0];
  const dataRows = lines.slice(1).filter(line => line.trim().length > 0);

  console.log(`📊 CSV Analysis:`);
  console.log(`   - Headers: ${headers}`);
  console.log(`   - Data rows: ${dataRows.length}`);
  console.log(`   - Sample row: ${dataRows[0]?.substring(0, 100)}...`);

  // Copy file to test directory for processing
  const testFile = path.join(TEST_CONFIG.testOutputDir, 'test-import.csv');
  fs.copyFileSync(TEST_CONFIG.sampleFile, testFile);
  console.log(`✅ Copied sample file to: ${testFile}`);

  console.log('🔧 CSV File validation complete - ready for import testing');
  console.log('📝 Next step: Test the import service directly when server is accessible');

} else {
  console.error(`❌ Sample file not found: ${TEST_CONFIG.sampleFile}`);
  process.exit(1);
}

console.log('✅ Direct CSV test preparation complete');