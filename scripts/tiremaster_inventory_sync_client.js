const odbc = require('odbc');
const axios = require('axios');
const fs = require('fs');

// --- HELPER: Concurrency Limiter ---
const pLimit = (concurrency) => {
  const queue = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()();
    }
  };

  return (fn) => {
    return new Promise((resolve, reject) => {
      const run = async () => {
        activeCount++;
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          next();
        }
      };

      if (activeCount < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
  };
};

// Configuration
const config = {
  connectionString: 'DSN=TireMaster;UID=dba;PWD=sql', // Update if needed
  apiUrl: 'http://10.10.13.188:3001/api/v1/live-sync',
  batchSize: 2000,
  concurrency: 5
};

// --- REMOTE LOGGING ---
async function remoteLog(level, message, context = null) {
  const timestamp = new Date().toISOString();
  
  // Print to local console
  if (level === 'ERROR') console.error(`[${timestamp}] ${message}`, context ? JSON.stringify(context) : '');
  else console.log(`[${timestamp}] ${message}`, context ? JSON.stringify(context) : '');

  try {
    await axios.post(`${config.apiUrl}/logs`, {
      level,
      message,
      timestamp,
      context
    });
  } catch (err) {
    // Fail silently to avoid spamming local console about log failures
  }
}

const limit = pLimit(config.concurrency);

async function postToBackend(endpoint, data, payloadKey = 'invoices') {
  try {
    const payload = {};
    payload[payloadKey] = data;
    
    const response = await axios.post(`${config.apiUrl}/${endpoint}`, payload, {
      headers: { 'Content-Type': 'application/json' },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    return response.data;
  } catch (error) {
    remoteLog('ERROR', `❌ API Error (${endpoint}):`, error.response ? error.response.data : error.message);
    throw error;
  }
}

async function fetchAndSync(connection, endpoint, queryOrData, batchName, transformFn = null, payloadKey = 'invoices') {
  try {
    let items;
    if (typeof queryOrData === 'string') {
      items = await connection.query(queryOrData);
    } else {
      items = queryOrData;
    }

    if (items.length === 0) return;

    let dataToSync = items;
    
    // Sanitize: Remove null values to satisfy @IsOptional() in backend DTOs
    dataToSync = dataToSync.map(item => {
      const newItem = { ...item };
      for (const key in newItem) {
        if (newItem[key] === null) {
          delete newItem[key];
        }
      }
      return newItem;
    });

    if (transformFn) {
      dataToSync = await Promise.all(dataToSync.map(transformFn));
      // Filter out nulls if transformFn returns null for skipped items
      dataToSync = dataToSync.filter(item => item !== null);
    }

    if (dataToSync.length > 0) {
      await postToBackend(endpoint, dataToSync, payloadKey);
    }
  } catch (error) {
    remoteLog('ERROR', `❌ Error processing ${batchName}:`, error.message);
    throw error; // Rethrow to allow fallback logic in main
  }
}

// --- GLOBAL ERROR HANDLERS ---
process.on('unhandledRejection', (reason, promise) => {
  remoteLog('ERROR', '❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  remoteLog('ERROR', '❌ Uncaught Exception:', error);
  process.exit(1);
});

async function main() {
  let connection;

  try {
    remoteLog('INFO', '🔌 Connecting to TireMaster Database...');
    connection = await odbc.connect(config.connectionString);
    remoteLog('INFO', '✅ Connected!');

    // --- DEBUG: List Tables ---
    try {
        remoteLog('INFO', '\n🔍 Listing Tables (to find Brands/MFG)...');
        // SQL Anywhere system table query
        const tables = await connection.query("SELECT table_name FROM systable WHERE table_type = 'BASE' ORDER BY table_name");
        const tableNames = tables.map(t => t.table_name || t.TABLE_NAME);
        remoteLog('INFO', `   Found ${tableNames.length} tables.`);
        
        // Check for likely candidates
        const candidates = tableNames.filter(t => 
            ['MFG', 'MANUFACTURER', 'BRAND', 'CODES', 'CODE', 'GENCODES'].includes(t.toUpperCase())
        );
        remoteLog('INFO', `   Potential Brand Tables: ${candidates.join(', ')}`);
    } catch (e) {
        remoteLog('WARN', '   Could not list tables:', e.message);
    }

    // 1. Fetch Categories (CRITICAL for Tire Classification)
    remoteLog('INFO', '\n📦 Fetching Categories...');
    try {
      const categories = await connection.query('SELECT * FROM INVCAT');
      
      // Transform to match DTO
      const mappedCategories = categories.map(c => {
        let cType = c.TYPE || c.CATTYPE || c.CatType;
        // Ensure CatType is a number if present
        if (cType !== null && cType !== undefined) {
            const parsed = parseInt(cType, 10);
            cType = isNaN(parsed) ? null : parsed;
        }
        
        return {
            CAT: c.CAT,
            NAME: c.NAME || c.DESCR,
            CatType: cType
        };
      });

      await fetchAndSync(connection, 'categories', mappedCategories, 'Categories', null, 'categories');
      remoteLog('INFO', `✅ Synced ${categories.length} categories.`);
    } catch (err) {
      remoteLog('ERROR', '❌ Failed to sync categories:', err.message);
    }

    // 2. Fetch Brands (Manufacturers)
    remoteLog('INFO', '\n📦 Fetching Brands...');
    try {
      let brands = [];
      let source = '';
      
      // Try MFGCODE table first (Confirmed by user)
      try {
         // Code = 'BRI', Descr = 'bridgestone'
         brands = await connection.query('SELECT "Code", "Descr" FROM "MFGCODE"');
         source = 'MFGCODE';
      } catch (e) {
         remoteLog('WARN', '   Could not query MFGCODE table:', e.message);
         
         // Fallback to other tables just in case
         try {
            brands = await connection.query('SELECT * FROM MFG');
            source = 'MFG';
         } catch (e2) {
             try {
                brands = await connection.query('SELECT * FROM MANUFACTURER');
                source = 'MANUFACTURER';
             } catch (e3) {
                 try {
                    brands = await connection.query('SELECT * FROM BRAND');
                    source = 'BRAND';
                 } catch (e4) {
                    remoteLog('WARN', '   Could not find MFGCODE, MFG, MANUFACTURER, or BRAND table.');
                 }
             }
         }
      }

      if (brands.length > 0) {
         // Map to expected format: CODE, NAME
         const mappedBrands = brands.map(b => {
            // Handle MFGCODE specific columns
            if (source === 'MFGCODE') {
                return {
                    CODE: b.Code || b.CODE,
                    NAME: b.Descr || b.DESCR || b.Code || b.CODE
                };
            }
            
            // Handle other tables
            return {
                CODE: b.CODE || b.MFG || b.ID,
                NAME: b.NAME || b.DESCR || b.DESCRIPTION || b.MFG // Fallback to code if name missing
            };
         }).filter(b => b.CODE);

         await fetchAndSync(connection, 'brands', mappedBrands, `Brands (from ${source})`, null, 'brands');
         remoteLog('INFO', `✅ Synced ${mappedBrands.length} brands.`);
      } else {
         remoteLog('WARN', '⚠️ No brands found to sync.');
      }
    } catch (err) {
      remoteLog('ERROR', '❌ Failed to sync brands:', err.message);
    }

    // 3. Fetch ALL Inventory
    remoteLog('INFO', '\n📦 Fetching ALL Inventory...');
    try {
      const allInventory = await connection.query('SELECT PARTNO FROM INV');
      remoteLog('INFO', `✅ Found ${allInventory.length} inventory items. Syncing...`);

      // Check for duplicates
      const partNos = allInventory.map(i => i.PARTNO);
      const uniquePartNos = new Set(partNos);
      if (partNos.length !== uniquePartNos.size) {
          remoteLog('WARN', `⚠️ Found ${partNos.length - uniquePartNos.size} duplicate PARTNOs in INV table!`);
      }

      const inventoryBatches = [];
      for (let i = 0; i < allInventory.length; i += config.batchSize) {
        inventoryBatches.push(allInventory.slice(i, i + config.batchSize));
      }

      const inventoryPromises = inventoryBatches.map((batch, i) => {
        return limit(async () => {
          // Filter out null/undefined PARTNOs
          const validBatch = batch.filter(p => p.PARTNO != null);
          if (validBatch.length === 0) return;

          const ids = validBatch.map(p => `'${String(p.PARTNO).replace(/'/g, "''")}'`).join(',');
          
          // Fetch details for this batch
          // Added TYPE to selection if available, but sticking to standard columns for safety
          // UPDATE: Fetch ALL columns to support hot-swapping data via metadata
          const query = `SELECT * FROM INV WHERE PARTNO IN (${ids})`;
          
          // Verify count
          const items = await connection.query(query);
          if (items.length !== validBatch.length) {
             remoteLog('WARN', `⚠️ Batch mismatch! Requested ${validBatch.length} items, got ${items.length}. Some PARTNOs might be missing or invalid.`);
             remoteLog('DEBUG', `Sample IDs: ${ids.substring(0, 100)}...`);
          }

          // Transform to capture raw_data
          const transformFn = (item) => {
              const allowed = ['PARTNO', 'INVNO', 'MFG', 'SIZE', 'CAT', 'NAME', 'WEIGHT', 'ACTIVE', 'lastsync', 'VENDPARTNO', 'NEXTCOST', 'LASTCOST', 'EDL', 'DBILL', 'SALE_PRICE'];
              const cleanItem = {};
              allowed.forEach(key => {
                  if (item[key] !== undefined) cleanItem[key] = item[key];
              });
              cleanItem.raw_data = { ...item };
              return cleanItem;
          };

          await fetchAndSync(connection, 'inventory', items, `Inventory Batch ${i+1}/${inventoryBatches.length}`, transformFn, 'inventory');
          process.stdout.write(`   ✨ Synced Inventory Batch ${i+1}/${inventoryBatches.length}\r`);
        });
      });
      await Promise.all(inventoryPromises);
      remoteLog('INFO', '\n✅ All Inventory Synced.');
    } catch (err) {
      remoteLog('ERROR', '❌ Failed to sync inventory:', err.message);
    }

    // 4. Fetch Inventory Quantities
    remoteLog('INFO', '\n📦 Fetching Inventory Quantities...');
    try {
      const allInventory = await connection.query('SELECT PARTNO FROM INV');
      const inventoryBatches = [];
      for (let i = 0; i < allInventory.length; i += config.batchSize) {
        inventoryBatches.push(allInventory.slice(i, i + config.batchSize));
      }

      // Try INVPRICE first (most likely)
      remoteLog('INFO', '   Trying INVPRICE table...');
      const qtyPromises = inventoryBatches.map((batch, i) => {
        return limit(async () => {
          const ids = batch.map(p => p.PARTNO ? `'${String(p.PARTNO).replace(/'/g, "''")}'` : "''").join(',');
          const query = `SELECT * FROM INVPRICE WHERE PARTNO IN (${ids})`;
          
          const transformFn = (item) => {
              const allowed = ['PARTNO', 'EFFSITENO', 'QTYONHAND', 'RESERVE', 'MAXQTY', 'MINQTY', 'lastsync'];
              const cleanItem = {};
              allowed.forEach(key => {
                  if (item[key] !== undefined) cleanItem[key] = item[key];
              });
              cleanItem.raw_data = { ...item };
              return cleanItem;
          };

          await fetchAndSync(connection, 'inventory-quantities', query, `Inventory Qty Batch ${i+1}/${inventoryBatches.length}`, transformFn, 'inventoryData');
          process.stdout.write(`   ✨ Synced Inventory Qty Batch ${i+1}/${inventoryBatches.length}\r`);
        });
      });
      await Promise.all(qtyPromises);
      remoteLog('INFO', '\n✅ All Inventory Quantities Synced (from INVPRICE).');

    } catch (err) {
       remoteLog('ERROR', '❌ Failed to sync inventory quantities from INVPRICE (trying INVLOC...):', err.message);
       // Fallback to INVLOC
       try {
          const allInventory = await connection.query('SELECT PARTNO FROM INV');
          const inventoryBatches = [];
          for (let i = 0; i < allInventory.length; i += config.batchSize) {
            inventoryBatches.push(allInventory.slice(i, i + config.batchSize));
          }
          
          const qtyPromises = inventoryBatches.map((batch, i) => {
            return limit(async () => {
              const ids = batch.map(p => p.PARTNO ? `'${String(p.PARTNO).replace(/'/g, "''")}'` : "''").join(',');
              // Use * to get all columns, but ensure we have EFFSITENO alias if needed (INVLOC usually has SITENO)
              const query = `SELECT *, SITENO as EFFSITENO FROM INVLOC WHERE PARTNO IN (${ids})`;
              
              const transformFn = (item) => {
                  const allowed = ['PARTNO', 'EFFSITENO', 'QTYONHAND', 'RESERVE', 'MAXQTY', 'MINQTY', 'lastsync'];
                  const cleanItem = {};
                  allowed.forEach(key => {
                      if (item[key] !== undefined) cleanItem[key] = item[key];
                  });
                  cleanItem.raw_data = { ...item };
                  return cleanItem;
              };

              await fetchAndSync(connection, 'inventory-quantities', query, `Inventory Qty Batch (INVLOC) ${i+1}/${inventoryBatches.length}`, transformFn, 'inventoryData');
              process.stdout.write(`   ✨ Synced Inventory Qty Batch (INVLOC) ${i+1}/${inventoryBatches.length}\r`);
            });
          });
          await Promise.all(qtyPromises);
          remoteLog('INFO', '\n✅ All Inventory Quantities Synced (from INVLOC).');
       } catch (err2) {
          remoteLog('ERROR', '❌ Failed to sync inventory quantities from INVLOC too:', err2.message);
       }
    }

    remoteLog('INFO', '\n🏁 Inventory Sync Completed!');

  } catch (error) {
    remoteLog('ERROR', '❌ Fatal Error:', error);
  } finally {
    if (connection) {
      await connection.close();
      remoteLog('INFO', '🔌 Connection closed.');
    }
  }
}

main();
