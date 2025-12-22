const odbc = require('odbc');
const fs = require('fs');

// --- CONFIGURATION ---
const DSN_NAME = 'TireMaster'; // Update if needed
const USER = 'dba';            // Update if needed
const PASSWORD = 'sql';        // Update if needed

const CONNECTION_STRING = `DSN=${DSN_NAME};UID=${USER};PWD=${PASSWORD}`;

async function main() {
  let connection;
  try {
    console.log(`🔌 Connecting to ODBC DSN: ${DSN_NAME}...`);
    connection = await odbc.connect(CONNECTION_STRING);
    console.log('✅ Connected!');

    // 1. List all tables
    console.log('\n🔍 Listing all tables...');
    // SQL Anywhere specific query to list tables
    const tablesQuery = "SELECT table_name FROM sys.systable WHERE table_type = 'BASE' ORDER BY table_name";
    const tables = await connection.query(tablesQuery);
    
    console.log(`Found ${tables.length} tables.`);
    const tableNames = tables.map(t => t.table_name);
    fs.writeFileSync('all_tables.json', JSON.stringify(tableNames, null, 2));
    console.log('💾 Saved table list to all_tables.json');

    // 2. Search for likely brand/manufacturer tables
    const keywords = ['BRAND', 'MFG', 'MANU', 'CODE', 'VEND'];
    const likelyTables = tableNames.filter(name => 
      keywords.some(k => name.toUpperCase().includes(k))
    );

    console.log('\n🎯 Likely Brand/Manufacturer Tables:', likelyTables);

    // 3. Inspect likely tables
    for (const tableName of likelyTables) {
      console.log(`\n👀 Inspecting ${tableName}...`);
      try {
        const data = await connection.query(`SELECT TOP 10 * FROM "${tableName}"`);
        console.log(`   Found ${data.length} records.`);
        if (data.length > 0) {
          console.log('   Sample data:', JSON.stringify(data[0], null, 2));
          fs.writeFileSync(`sample_${tableName}.json`, JSON.stringify(data, null, 2));
        }
      } catch (e) {
        console.log(`   ⚠️ Error reading ${tableName}: ${e.message}`);
      }
    }

    // 4. Check specifically for a "Codes" table if it exists (common in legacy systems)
    if (tableNames.includes('CODES')) {
      console.log('\n👀 Inspecting CODES table...');
      const data = await connection.query(`SELECT TOP 20 * FROM CODES`);
      fs.writeFileSync('sample_CODES.json', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

main();
