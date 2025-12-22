const odbc = require('odbc');
const fs = require('fs');

// --- CONFIGURATION ---
const DSN_NAME = 'TireMaster'; // The ODBC DSN name on the source machine
const USER = 'dba';            // Default SQL Anywhere user (update if different)
const PASSWORD = 'sql';        // Default SQL Anywhere password (update if different)
const START_DATE = '2025-11-01'; // Limit scope as requested

// ⚠️ UPDATED TABLE NAMES FROM PDF ⚠️
const TABLES = {
  INVOICE_HEADER: 'HINVOICE',     // Completed Invoices
  INVOICE_DETAIL: 'TRANS',        // Invoice Line Items
  CUSTOMER: 'CUSTOMER',           // Customers & Vendors
  INVENTORY: 'INV',               // Product Master
  INVENTORY_PRICE: 'INVPRICE',    // Stock Levels & Pricing
  INVENTORY_COST: 'INVCOST',      // Cost History
  INVENTORY_CATEGORY: 'INVCAT',   // Categories
  EMPLOYEE: 'EMPLOYEE',           // Mechanics & Salespeople
  VEHICLE: 'VEHICLE'              // Customer Vehicles
};

const CONNECTION_STRING = `DSN=${DSN_NAME};UID=${USER};PWD=${PASSWORD}`;

async function main() {
  let connection;

  try {
    console.log(`🔌 Connecting to ODBC DSN: ${DSN_NAME}...`);
    connection = await odbc.connect(CONNECTION_STRING);
    console.log('✅ Connected!');

    // Helper function to fetch and save
    const fetchAndSave = async (name, query, filename) => {
      console.log(`\n🔍 Fetching ${name}...`);
      try {
        const data = await connection.query(query);
        console.log(`✅ Found ${data.length} records.`);
        if (data.length > 0) {
          fs.writeFileSync(filename, JSON.stringify(data, null, 2));
          console.log(`   💾 Saved ${filename}`);
        }
        return data;
      } catch (e) {
        console.log(`⚠️ Could not fetch ${name}.`);
        console.log('   Error:', e.message);
        return [];
      }
    };

    // 1. Invoices (Header)
    const invoices = await fetchAndSave(
      'Invoices', 
      `SELECT TOP 20 * FROM ${TABLES.INVOICE_HEADER} WHERE INVDATE >= '${START_DATE}'`, 
      'sample_invoices.json'
    );

    if (invoices.length > 0) {
      const invoiceIds = invoices.map(inv => inv.INVOICE).join(',');
      const customerIds = [...new Set(invoices.map(inv => inv.CUCD))].filter(id => id).join(',');

      // 2. Invoice Details (Line Items)
      await fetchAndSave(
        'Invoice Details',
        `SELECT * FROM ${TABLES.INVOICE_DETAIL} WHERE INVOICE IN (${invoiceIds})`,
        'sample_details.json'
      );

      // 3. Customers
      if (customerIds) {
        await fetchAndSave(
          'Customers',
          `SELECT * FROM ${TABLES.CUSTOMER} WHERE CUCD IN (${customerIds})`,
          'sample_customers.json'
        );
        
        // 4. Vehicles (Linked to these customers)
        await fetchAndSave(
          'Vehicles',
          `SELECT * FROM ${TABLES.VEHICLE} WHERE CUCD IN (${customerIds})`,
          'sample_vehicles.json'
        );
      }
    }

    // 5. Inventory Master (Top 20)
    const inventory = await fetchAndSave(
      'Inventory Master',
      `SELECT TOP 20 * FROM ${TABLES.INVENTORY}`,
      'sample_inventory.json'
    );

    // 6. Inventory Pricing & Stock (For the fetched items)
    if (inventory.length > 0) {
      // Assuming 'ITEM' or 'PRODCODE' is the key. Let's try to guess or just fetch top 20.
      // Usually linked by 'ITEM' column in TireMaster.
      // We'll just fetch top 20 for sample.
      await fetchAndSave(
        'Inventory Pricing',
        `SELECT TOP 20 * FROM ${TABLES.INVENTORY_PRICE}`,
        'sample_inventory_price.json'
      );
      
      await fetchAndSave(
        'Inventory Cost',
        `SELECT TOP 20 * FROM ${TABLES.INVENTORY_COST}`,
        'sample_inventory_cost.json'
      );
    }

    // 7. Categories
    await fetchAndSave(
      'Inventory Categories',
      `SELECT * FROM ${TABLES.INVENTORY_CATEGORY}`,
      'sample_categories.json'
    );

    // 8. Employees
    await fetchAndSave(
      'Employees',
      `SELECT * FROM ${TABLES.EMPLOYEE}`,
      'sample_employees.json'
    );

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('IM002')) {
      console.error('   Hint: DSN not found. Check ODBC Administrator (32-bit vs 64-bit).');
    } else if (error.message.includes('Table or view not found')) {
      console.error('   Hint: The table name in TABLES config is incorrect. Check your PDF.');
    }
  } finally {
    if (connection) {
      await connection.close();
      console.log('\n🔌 Connection closed.');
    }
  }
}

main();
