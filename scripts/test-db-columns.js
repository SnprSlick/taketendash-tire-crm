const odbc = require('odbc');

const config = {
  dsn: 'TireMaster',
  user: 'dba',
  password: 'sql'
};

async function checkColumn(connection, table, column) {
  try {
    await connection.query(`SELECT TOP 1 ${column} FROM ${table}`);
    console.log(`✅ Column '${column}' exists in table '${table}'`);
    return true;
  } catch (err) {
    console.log(`❌ Column '${column}' DOES NOT exist in table '${table}' (or other error: ${err.message})`);
    return false;
  }
}

async function main() {
  let connection;
  try {
    console.log(`🔌 Connecting to ODBC DSN: ${config.dsn}...`);
    const connectionString = `DSN=${config.dsn};UID=${config.user};PWD=${config.password}`;
    connection = await odbc.connect(connectionString);
    console.log('✅ Connected!');

    console.log('\n🔍 Checking Columns...');
    
    // Check HINVOICE
    await checkColumn(connection, 'HINVOICE', 'SITENO');
    
    // Check TRANS
    await checkColumn(connection, 'TRANS', 'FETAX');
    await checkColumn(connection, 'TRANS', 'LABOR');
    
    // Check CUSTOMER
    await checkColumn(connection, 'CUSTOMER', 'CONTACT');
    await checkColumn(connection, 'CUSTOMER', 'COMPANY');

    console.log('\n🏁 Check Complete');

  } catch (error) {
    console.error('❌ Fatal Error:', error);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

main();
