const odbc = require('odbc');

const config = {
  dsn: 'TireMaster',
  user: 'dba',
  password: 'sql'
};

async function main() {
  let connection;
  try {
    console.log(`🔌 Connecting to ODBC DSN: ${config.dsn}...`);
    const connectionString = `DSN=${config.dsn};UID=${config.user};PWD=${config.password}`;
    connection = await odbc.connect(connectionString);
    console.log('✅ Connected!');

    // Query to list tables (Sybase/SQL Anywhere specific usually)
    // Try standard SQL first, or system tables
    try {
        const tables = await connection.query("SELECT table_name FROM sys.systable WHERE table_type = 'BASE'");
        console.log('\n📋 Tables found:');
        tables.forEach(t => console.log(t.table_name));
    } catch (e) {
        console.log('Failed to query sys.systable, trying sp_tables...');
        const tables = await connection.query("sp_tables");
        console.log('\n📋 Tables found (sp_tables):');
        tables.forEach(t => console.log(t.TABLE_NAME));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) await connection.close();
  }
}

main();
