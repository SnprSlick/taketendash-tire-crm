#!/usr/bin/env node

/**
 * Verify Line Items Script
 * This script verifies that all invoices have their complete line items
 */

const fs = require('fs');
const path = require('path');

const dataPath = '/Users/kenny/Documents/Apps/TakeTenDash/frontend/public/data/frontend-invoice-data.json';

console.log('🔍 Verifying Line Items in Frontend Data');
console.log('=========================================\n');

try {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  console.log('📊 Summary Statistics:');
  console.log(`   Total Invoices Available: ${data.totalInvoicesAvailable}`);
  console.log(`   Total Line Items Available: ${data.totalLineItemsAvailable}`);
  console.log(`   Invoices Included: ${data.invoicesIncluded}`);
  console.log(`   Line Items Included: ${data.lineItemsIncluded}\n`);
  
  console.log('📋 Invoice Details:');
  console.log('   Invoice Number | Customer Name | Line Items');
  console.log('   ' + '-'.repeat(75));
  
  let totalLineItems = 0;
  data.invoices.forEach((invoice, index) => {
    const paddedNumber = invoice.invoiceNumber.padEnd(15);
    const paddedCustomer = invoice.customerName.substring(0, 35).padEnd(35);
    const lineItemCount = invoice.lineItems.length;
    totalLineItems += lineItemCount;
    
    console.log(`   ${paddedNumber} | ${paddedCustomer} | ${lineItemCount} items`);
    
    // Show first line item if exists
    if (lineItemCount > 0) {
      const firstItem = invoice.lineItems[0];
      console.log(`      └─ ${firstItem.productCode}: ${firstItem.description || '(no description)'}`);
    }
  });
  
  console.log('   ' + '-'.repeat(75));
  console.log(`   Total: ${data.invoices.length} invoices, ${totalLineItems} line items\n`);
  
  // Verify totals match
  if (totalLineItems === data.lineItemsIncluded) {
    console.log('✅ Line item count verification: PASSED');
  } else {
    console.log(`❌ Line item count mismatch: Expected ${data.lineItemsIncluded}, got ${totalLineItems}`);
  }
  
  // Check for invoices with zero line items
  const invoicesWithoutItems = data.invoices.filter(inv => inv.lineItems.length === 0);
  if (invoicesWithoutItems.length > 0) {
    console.log(`\n⚠️  Warning: ${invoicesWithoutItems.length} invoice(s) have zero line items:`);
    invoicesWithoutItems.forEach(inv => {
      console.log(`   - ${inv.invoiceNumber} (${inv.customerName})`);
    });
  } else {
    console.log('\n✅ All invoices have line items!');
  }
  
  console.log('\n🎉 Verification complete!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
