const odbc = require('odbc');

const connectionString = "Driver={ODBC Driver 17 for SQL Server};Server=10.10.11.204;Database=TireMaster;Uid=sa;Pwd=TireMaster;";

async function checkColumns() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await odbc.connect(connectionString);
    console.log('Connected!');

    const query = `
      SELECT TOP 1 * FROM Inventory
    `;
    
    console.log('Executing query:', query);
    const result = await connection.query(query);
    
    if (result.length > 0) {
      console.log('Columns in Inventory table:');
      console.log(Object.keys(result[0]).join(', '));
    } else {
      console.log('Inventory table is empty, cannot determine columns from data.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

checkColumns();
