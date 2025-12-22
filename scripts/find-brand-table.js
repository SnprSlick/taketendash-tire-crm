const odbc = require('odbc');

// Configuration
const connectionString = "DSN=TireMaster;UID=dba;PWD=sql";
const TARGET_SKU = '000019';
const TARGET_BRAND_NAME = 'Bridgestone';

async function findBrandTable() {
  let connection;

  try {
    console.log(`Connecting to TireMaster database...`);
    connection = await odbc.connect(connectionString);
    console.log('Connected!');

    // 1. Inspect the Product/Inventory row for the target SKU
    console.log(`\n--- Step 1: Inspecting Inventory for SKU: ${TARGET_SKU} ---`);
    try {
      const product = await connection.query(`SELECT * FROM Inventory WHERE PartNO = '${TARGET_SKU}'`);
      if (product.length > 0) {
        console.log('Found product:', product[0]);
        console.log('Keys in product record:', Object.keys(product[0]).join(', '));
      } else {
        console.log(`Product with SKU ${TARGET_SKU} not found.`);
      }
    } catch (err) {
      console.error('Error querying Inventory:', err.message);
    }

    // 2. List all tables
    console.log(`\n--- Step 2: Listing all tables ---`);
    let tables = [];
    try {
      // Sybase/ASA specific query for tables
      const result = await connection.query("SELECT table_name FROM sys.systable WHERE table_type = 'BASE'");
      tables = result.map(r => r.table_name);
      console.log(`Found ${tables.length} tables.`);
      // Filter for likely candidates
      const candidates = tables.filter(t => 
        /CODE|MFR|MFG|BRAND|TYPE|CLASS|CAT/i.test(t)
      );
      console.log('Likely brand/category tables:', candidates.join(', '));
    } catch (err) {
      console.error('Error listing tables:', err.message);
    }

    // 3. Search for "Bridgestone" in likely tables
    console.log(`\n--- Step 3: Searching for '${TARGET_BRAND_NAME}' in likely tables ---`);
    
    // Add some common ones if not found by regex
    const searchTables = [...new Set([...tables.filter(t => /CODE|MFR|MFG|BRAND/i.test(t)), 'Codes', 'Mfg', 'Brand', 'SystemCodes'])];

    for (const table of searchTables) {
      // Skip if table doesn't exist in the full list (unless we failed to get the full list)
      if (tables.length > 0 && !tables.includes(table)) continue;

      try {
        console.log(`Checking table: ${table}...`);
        // Select first row to get column names
        const sample = await connection.query(`SELECT TOP 1 * FROM "${table}"`);
        if (sample.length === 0) {
            console.log(`  (Empty table)`);
            continue;
        }
        
        const columns = Object.keys(sample[0]);
        // Construct a WHERE clause searching all text columns
        const whereClause = columns.map(c => `"${c}" LIKE '%${TARGET_BRAND_NAME}%'`).join(' OR ');
        
        const query = `SELECT * FROM "${table}" WHERE ${whereClause}`;
        const matches = await connection.query(query);
        
        if (matches.length > 0) {
          console.log(`\n!!! FOUND MATCH IN TABLE: ${table} !!!`);
          console.log(matches[0]);
          console.log('----------------------------------------\n');
        }
      } catch (err) {
        // Ignore errors (table might not exist or column types might mismatch)
        // console.log(`  Error checking ${table}: ${err.message}`);
      }
    }

  } catch (error) {
    console.error('Fatal Error:', error);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

findBrandTable();
