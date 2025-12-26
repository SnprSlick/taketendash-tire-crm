const odbc = require('odbc');
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// --- CONFIGURATION ---
const config = {
  dsn: 'TireMaster',           // ODBC DSN Name
  user: 'dba',                 // ODBC User
  password: 'sql',             // ODBC Password
  backendUrl: 'http://10.10.13.188:3001/api/v1/live-sync', // REPLACE 'localhost' with your Mac's IP if running on a different machine
  startDate: process.argv[2] || '2025-01-01',     // Sync data from this date
  batchSize: 1000,             // Records per API request
  concurrency: 5,             // Max concurrent batches
  cacheFile: path.join(__dirname, 'sync_cache.json'),
};

// --- REMOTE LOGGING ---
async function remoteLog(level, message, context = null) {
  const timestamp = new Date().toISOString();
  
  // Print to local console
  if (level === 'ERROR') console.error(`[${timestamp}] ${message}`, context ? JSON.stringify(context) : '');
  else console.log(`[${timestamp}] ${message}`, context ? JSON.stringify(context) : '');

  try {
    await axios.post(`${config.backendUrl}/logs`, {
      level,
      message,
      timestamp,
      context
    });
  } catch (err) {
    // Fail silently to avoid spamming local console about log failures
  }
}

// --- GLOBAL STATE ---
let employeeMap = {};

// --- CACHE MANAGEMENT ---
let syncCache = {
  customers: {},
  inventory: {},
  invoices: {},
  details: {} // Details are linked to invoices, but we can track them too if needed. Usually invoice update implies details update.
};

if (fs.existsSync(config.cacheFile)) {
  try {
    remoteLog('INFO', `📂 Loading sync cache from ${config.cacheFile}...`);
    syncCache = JSON.parse(fs.readFileSync(config.cacheFile, 'utf8'));
    // Ensure structure
    if (!syncCache.customers) syncCache.customers = {};
    if (!syncCache.inventory) syncCache.inventory = {};
    if (!syncCache.invoices) syncCache.invoices = {};
  } catch (err) {
    remoteLog('ERROR', '⚠️ Failed to load cache, starting fresh:', err.message);
  }
}

function calculateHash(obj) {
  return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');
}

function saveCache() {
  try {
    fs.writeFileSync(config.cacheFile, JSON.stringify(syncCache, null, 2));
  } catch (err) {
    remoteLog('ERROR', '⚠️ Failed to save cache:', err.message);
  }
}

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

const limit = pLimit(config.concurrency);

async function fetchAndSync(connection, type, query, description, cacheOptions = null, transformFn = null, payloadKey = null) {
  try {
    remoteLog('DEBUG', `      Starting fetch for ${description}...`);
    
    // 1. Fetch Data (ODBC)
    // remoteLog('DEBUG', `      Querying ${type}...`);
    const startFetch = Date.now();
    
    // Add timeout to query
    const queryPromise = connection.query(query);
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timed out after 60s')), 60000)
    );
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    const fetchTime = Date.now() - startFetch;
    
    if (result.length === 0) return;
    // remoteLog('DEBUG', `      Fetched ${result.length} rows in ${fetchTime}ms`);

    // 1.5 Transform Data
    let dataToSync = result;
    if (transformFn) {
      dataToSync = result.map(transformFn).filter(item => item !== null && item !== undefined);
    }

    // 2. Filter Data based on Cache
    if (cacheOptions) {
      const { keyField, cacheMap } = cacheOptions;
      dataToSync = dataToSync.filter(item => {
        const id = item[keyField];
        const hash = calculateHash(item);
        // If hash matches, skip. If id not in cache or hash different, keep.
        if (syncCache[cacheMap][id] === hash) {
          return false;
        }
        return true;
      });

      if (dataToSync.length === 0 && result.length > 0) {
        // remoteLog('INFO', `      ⏩ All ${result.length} ${type} skipped (unchanged)`);
        return;
      }
      
      if (dataToSync.length < result.length) {
        // remoteLog('INFO', `      ℹ️  Syncing ${dataToSync.length}/${result.length} ${type} (others unchanged)`);
      }
    }

    // 3. Send Data (API) - This is where parallelism shines
    const payload = {};
    payload[payloadKey || type] = dataToSync;

    try {
      const payloadStr = JSON.stringify(payload);
      const payloadSizeMB = (Buffer.byteLength(payloadStr) / 1024 / 1024).toFixed(2);
      // remoteLog('DEBUG', `      Posting ${dataToSync.length} items (${payloadSizeMB} MB) to ${type}...`);
      
      const startPost = Date.now();
      await axios.post(`${config.backendUrl}/${type}`, payload, {
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      const postTime = Date.now() - startPost;
      // remoteLog('INFO', `      ✅ Synced ${dataToSync.length} ${type} in ${postTime}ms`);

      // 4. Update Cache
      if (cacheOptions) {
        const { keyField, cacheMap } = cacheOptions;
        dataToSync.forEach(item => {
          syncCache[cacheMap][item[keyField]] = calculateHash(item);
        });
      }

    } catch (err) {
      remoteLog('ERROR', `      ❌ Failed to sync ${type}: ${err.message}`);
      if (err.response) remoteLog('ERROR', '         Server:', err.response.data);
      throw err; // Re-throw to mark batch as failed
    }
  } catch (err) {
    remoteLog('ERROR', `      ❌ Error in ${description}: ${err.message}`);
    throw err;
  }
}

async function processBatch(connection, batch, batchIndex, totalBatches) {
  const invoiceIds = batch.map(inv => `'${inv.INVOICE}'`).join(',');
  
  // Define excluded names for salesperson check (must match main list)
  const EXCLUDED_NAMES = [
        'JAMES MATHERS',
        'DARLA KAY TARRANT',
        'KALEE GILBERT',
        'STEVE WITZKE',
        'EMILY R ISRAEL',
        'ELI STEWARD',
        'INTERNAL',
        'ACCOUNTING',
        'TRANSFER',
        'TR',
        'INTER-STORE',
        'INTERCOMPANY'
  ];
  // const customerIds = [...new Set(batch.map(inv => inv.CUCD).filter(id => id != null))]; // No longer needed per-batch

  remoteLog('INFO', `\n📦 Processing Batch ${batchIndex + 1}/${totalBatches} (${batch.length} invoices)`);

  try {
    // A. Sync Customers - SKIPPED (Done globally)
    /*
    if (customerIds.length > 0) {
      const customerQuery = `SELECT CUCD, NAME, ADDRESS1, ADDRESS2, CITY, STATE, ZIP, BPHONE, EMail, CREDIT, TERMS, ACTIVE FROM CUSTOMER WHERE CUCD IN (${customerIds.join(',')})`;
      await fetchAndSync(connection, 'customers', customerQuery, 'Customers', null);
    }
    */

    // B. Fetch Details to find Products
    const detailsQuery = `SELECT INVOICE, LINENUM, SITENO, PARTNO, DESCR, QTY, AMOUNT, COST, FETAX, LABOR 
                          FROM TRANS t 
                          WHERE t.INVOICE IN (${invoiceIds})`;
    
    const details = await connection.query(detailsQuery);

    // DEBUG: Log columns of first row to verify field names
    if (details.length > 0 && batchIndex === 0) {
        remoteLog('INFO', `🔍 TRANS Table Columns: ${Object.keys(details[0]).join(', ')}`);
    }
    
    // Identify invoices to skip based on line item content (Accounting/Internal transactions)
    const invoicesToSkip = new Set();
    details.forEach(d => {
        if (!d.DESCR) return;
        const desc = d.DESCR.toUpperCase();
        if (
            desc.includes('INVENTORY COST') ||
            desc.includes('FE TAX RECEIVED') ||
            desc.includes('PROFIT / LOSS OFFSET') ||
            desc.includes('PAYROLL') ||
            desc.includes('DEPRECIATION') ||
            desc.includes('LOAN FOR') ||
            desc.includes('BUSINESS USE OF PERSONAL')
        ) {
            invoicesToSkip.add(d.INVOICE);
        }
    });

    if (invoicesToSkip.size > 0) {
        // remoteLog('INFO', `      ℹ️  Skipping ${invoicesToSkip.size} internal/accounting invoices in this batch.`);
    }

    // Filter details to exclude skipped invoices
    const filteredDetails = details.filter(d => !invoicesToSkip.has(d.INVOICE));
    
    // DEBUG LOGGING FOR TEST INVOICE
    if (details.length > 0 && details[0].INVOICE == 62783) {
        remoteLog('DEBUG', '\n🔍 DEBUG: Raw Details for Invoice 62783:');
        details.forEach(d => {
            remoteLog('DEBUG', `   Line ${d.LINENUM}: Part=${d.PARTNO}, Qty=${d.QTY}, Amount=${d.AMOUNT}, Labor=${d.LABOR}, FET=${d.FETAX}, Cost=${d.COST}`);
        });
    }
    // const partNos = [...new Set(details.map(d => d.PARTNO).filter(p => p))]; // No longer needed per-batch

    // C. Sync Inventory (Products) - SKIPPED (Done globally)
    /*
    if (partNos.length > 0) {
      // Split partNos into smaller chunks if too many (ODBC limit safety)
      const PART_BATCH = 100;
      for (let p = 0; p < partNos.length; p += PART_BATCH) {
        const partBatch = partNos.slice(p, p + PART_BATCH).join(',');
        const inventoryQuery = `SELECT PARTNO, INVNO, MFG, SIZE, CAT, NAME, WEIGHT, ACTIVE, VENDPARTNO FROM INV WHERE PARTNO IN (${partBatch})`;
        await fetchAndSync(connection, 'inventory', inventoryQuery, 'Inventory', null);
      }
    }
    */

    // D. Sync Invoices
    const invoiceSyncQuery = `SELECT INVOICE, CUCD, INVDATE, TAX, NOTAXABLE, TAXABLE, SITENO, BSALES, KEYMOD, CUCD_S FROM HINVOICE WHERE INVOICE IN (${invoiceIds})`;
    
    const invoiceTransform = (inv) => {
      // Capture raw data before modification
      // const raw_data = { ...inv }; // Removed for performance

      // Skip if in skip list
      if (invoicesToSkip.has(inv.INVOICE)) return null;

      // Map BSALES (Employee ID) to Salesperson Name
      if (inv.BSALES && employeeMap[inv.BSALES]) {
        inv.SALESMAN = employeeMap[inv.BSALES];
      } else {
        inv.SALESMAN = null;
      }
      
      // Filter allowed fields
      const allowed = ['INVOICE', 'CUCD', 'INVDATE', 'TAX', 'NOTAXABLE', 'TAXABLE', 'SITENO', 'SALESMAN', 'KEYMOD', 'CUCD_S', 'lastsync'];
      const cleanItem = {};
      allowed.forEach(key => {
          if (inv[key] !== undefined) cleanItem[key] = inv[key];
      });
      // cleanItem.raw_data = raw_data; // Removed for performance
      
      return cleanItem;
    };

    await fetchAndSync(connection, 'invoices', invoiceSyncQuery, 'Invoices', null, invoiceTransform);

    // E. Sync Details (Send the details we already fetched)
    if (filteredDetails.length > 0) {
        // Add raw_data to details and filter fields
        const allowed = ['INVOICE', 'LINENUM', 'SITENO', 'PARTNO', 'DESCR', 'QTY', 'AMOUNT', 'COST', 'FETAX', 'LABOR', 'lastsync'];
        
        const cleanedDetails = filteredDetails.map(d => {
            const cleanItem = {};
            // Case-insensitive mapping
            const keys = Object.keys(d);
            allowed.forEach(allowKey => {
                const foundKey = keys.find(k => k.toUpperCase() === allowKey.toUpperCase());
                if (foundKey) {
                    cleanItem[allowKey] = d[foundKey];
                }
            });
            // cleanItem.raw_data = { ...d }; // Removed for performance
            return cleanItem;
        });
        
        if (cleanedDetails.length > 0 && batchIndex === 0) {
             remoteLog('DEBUG', `Sample Detail Item: ${JSON.stringify(cleanedDetails[0])}`);
        }
        
        const payload = { details: cleanedDetails };
        await axios.post(`${config.backendUrl}/details`, payload, {
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });
    }

    process.stdout.write(`   ✨ Batch ${batchIndex + 1} Complete\r`);

  } catch (error) {
    remoteLog('ERROR', `   ❌ Batch ${batchIndex + 1} Failed:`, error.message);
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
    remoteLog('INFO', `🔌 Connecting to ODBC DSN: ${config.dsn}...`);
    const connectionString = `DSN=${config.dsn};UID=${config.user};PWD=${config.password}`;
    // Use a pool if possible, but standard connect is safer if driver is old.
    // We will use a single connection and rely on the event loop.
    connection = await odbc.connect(connectionString);
    remoteLog('INFO', '✅ Connected to Database!');

    // 0. Fetch Employees for Mapping
    remoteLog('INFO', '\n👥 Fetching Employees...');
    try {
      const employees = await connection.query('SELECT ECUCD, NAME FROM EMPLOYEE');
      employees.forEach(emp => {
        employeeMap[emp.ECUCD] = emp.NAME;
      });
      remoteLog('INFO', `✅ Loaded ${employees.length} employees.`);
    } catch (err) {
      remoteLog('WARN', '⚠️ Failed to fetch employees, salesperson mapping will be skipped:', err.message);
    }

    // 0.5. Fetch ALL Customers
    remoteLog('INFO', '\n👥 Fetching ALL Customers...');
    const zzCustomerIds = new Set();
    
    const EXCLUDED_NAMES = [
        'JAMES MATHERS',
        'DARLA KAY TARRANT',
        'KALEE GILBERT',
        'STEVE WITZKE',
        'EMILY R ISRAEL',
        'ELI STEWARD',
        'INTERNAL',
        'ACCOUNTING',
        'TRANSFER',
        'TR',
        'INTER-STORE',
        'INTERCOMPANY'
    ];

    try {
      const allCustomers = await connection.query('SELECT CUCD, NAME FROM CUSTOMER');
      
      // Identify ZZ and Internal customers
      allCustomers.forEach(c => {
          if (!c.NAME) return;
          const name = c.NAME.toUpperCase();
          
          let shouldExclude = false;
          
          // Check standard exclusions
          if (
              name.startsWith('ZZ') || 
              name.includes('VISA') || 
              name.includes('MASTERCARD') ||
              name.includes('GOODYEAR TIRE & RUBBER') ||
              name.includes('TAKE TEN') ||
              name.includes('MADDEN,JAMES') ||
              name.includes('MADDEN, JAMES')
          ) {
              shouldExclude = true;
          }
          
          // Check specific names
          if (!shouldExclude) {
              for (const excluded of EXCLUDED_NAMES) {
                  if (name.includes(excluded)) {
                      shouldExclude = true;
                      break;
                  }
              }
          }

          if (shouldExclude) {
              zzCustomerIds.add(String(c.CUCD));
          }
      });
      remoteLog('INFO', `ℹ️  Identified ${zzCustomerIds.size} ZZ/Internal customers to exclude.`);

      remoteLog('INFO', `✅ Found ${allCustomers.length} customers. Syncing...`);
      
      // Filter customers to sync
      // UPDATE: Sync ALL customers to support all invoices.
      const validCustomers = allCustomers;
      // const validCustomers = allCustomers.filter(c => !zzCustomerIds.has(String(c.CUCD)));
      // remoteLog('INFO', `ℹ️  Syncing ${validCustomers.length} valid customers (excluding ${zzCustomerIds.size} ZZ/Internal).`);
      remoteLog('INFO', `ℹ️  Syncing ALL ${validCustomers.length} customers.`);

      const customerBatches = [];
      for (let i = 0; i < validCustomers.length; i += config.batchSize) {
        customerBatches.push(validCustomers.slice(i, i + config.batchSize));
      }

      const customerPromises = customerBatches.map((batch, i) => {
        return limit(async () => {
          const ids = batch.map(c => `'${String(c.CUCD).replace(/'/g, "''")}'`).join(',');
          // UPDATE: Fetch specific columns to improve performance
          const query = `SELECT CUCD, NAME, CONTACT, COMPANY, ADDRESS1, ADDRESS2, CITY, STATE, ZIP, BPHONE, EMail, CREDIT, TERMS, ACTIVE, SITENO FROM CUSTOMER WHERE CUCD IN (${ids})`;
          
          const transformFn = (item) => {
              const allowed = ['CUCD', 'NAME', 'CONTACT', 'COMPANY', 'ADDRESS1', 'ADDRESS2', 'CITY', 'STATE', 'ZIP', 'BPHONE', 'EMail', 'CREDIT', 'TERMS', 'ACTIVE', 'SITENO', 'lastsync'];
              const cleanItem = {};
              allowed.forEach(key => {
                  if (item[key] !== undefined) cleanItem[key] = item[key];
              });
              // cleanItem.raw_data = { ...item }; // Removed for performance
              return cleanItem;
          };

          await fetchAndSync(connection, 'customers', query, `Customers Batch ${i+1}/${customerBatches.length}`, null, transformFn);
          process.stdout.write(`   ✨ Synced Customers Batch ${i+1}/${customerBatches.length}\r`);
        });
      });
      await Promise.all(customerPromises);
      remoteLog('INFO', '\n✅ All Customers Synced.');
    } catch (err) {
      remoteLog('ERROR', '❌ Failed to sync customers:', err.message);
    }

    // 0.6. Fetch ALL Inventory
    remoteLog('INFO', '\n📦 Fetching ALL Inventory...');
    try {
      const allInventory = await connection.query('SELECT PARTNO FROM INV');
      remoteLog('INFO', `✅ Found ${allInventory.length} inventory items. Syncing...`);

      const inventoryBatches = [];
      for (let i = 0; i < allInventory.length; i += config.batchSize) {
        inventoryBatches.push(allInventory.slice(i, i + config.batchSize));
      }

      const inventoryPromises = inventoryBatches.map((batch, i) => {
        return limit(async () => {
          const ids = batch.map(p => `'${String(p.PARTNO).replace(/'/g, "''")}'`).join(',');
          const query = `SELECT PARTNO, INVNO, MFG, SIZE, CAT, NAME, WEIGHT, ACTIVE, VENDPARTNO, NEXTCOST, LASTCOST, EDL, DBILL FROM INV WHERE PARTNO IN (${ids})`;
          
          const transformFn = (item) => {
              const cleanItem = { ...item };
              // Keep cost fields in metadata for fallback calculations
              cleanItem.raw_data = { 
                  NEXTCOST: item.NEXTCOST, 
                  LASTCOST: item.LASTCOST, 
                  EDL: item.EDL 
              };
              return cleanItem;
          };

          await fetchAndSync(connection, 'inventory', query, `Inventory Batch ${i+1}/${inventoryBatches.length}`, null, transformFn);
          process.stdout.write(`   ✨ Synced Inventory Batch ${i+1}/${inventoryBatches.length}\r`);
        });
      });
      await Promise.all(inventoryPromises);
      remoteLog('INFO', '\n✅ All Inventory Synced.');
    } catch (err) {
      remoteLog('ERROR', '❌ Failed to sync inventory:', err.message);
    }

    // 0.7. Fetch Inventory Quantities
    remoteLog('INFO', '\n📦 Fetching Inventory Quantities...');
    try {
      // Re-use inventoryBatches to fetch quantities for those parts.
      // We need to reconstruct inventoryBatches since they were local to the previous block
      const allInventory = await connection.query('SELECT PARTNO FROM INV');
      const inventoryBatches = [];
      for (let i = 0; i < allInventory.length; i += config.batchSize) {
        inventoryBatches.push(allInventory.slice(i, i + config.batchSize));
      }

      const qtyPromises = inventoryBatches.map((batch, i) => {
        return limit(async () => {
          const ids = batch.map(p => `'${String(p.PARTNO).replace(/'/g, "''")}'`).join(',');
          // Note: Using SITENO alias to match DTO expectation of EFFSITENO if table is INVLOC
          // If table is INVPRICE (from sample), it has EFFSITENO.
          // We'll try INVLOC first as it's more standard for quantities.
          // If INVLOC doesn't exist, we might need to try INVPRICE or similar.
          // Assuming INVLOC has SITENO, QTYONHAND, RESERVE, MAXQTY, MINQTY
          
          // Strategy: Try to select from INVLOC. If it fails, catch and try INVPRICE.
          // But we can't easily do that inside the batch loop efficiently without checking first.
          // Let's assume INVLOC for now. If it fails, the user will report it and we can adjust.
          // Actually, sample_inventory_price.json has EFFSITENO. Let's use that column name if we query INVPRICE.
          // But INVLOC is usually the table.
          
          // Let's try a query that works for INVLOC with SITENO aliased to EFFSITENO
          const query = `SELECT PARTNO, SITENO as EFFSITENO, QTYONHAND, RESERVE, MAXQTY, MINQTY FROM INVLOC WHERE PARTNO IN (${ids})`;
          
          await fetchAndSync(connection, 'inventory-quantities', query, `Inventory Qty Batch ${i+1}/${inventoryBatches.length}`, null, null, 'inventoryData');
          process.stdout.write(`   ✨ Synced Inventory Qty Batch ${i+1}/${inventoryBatches.length}\r`);
        });
      });
      await Promise.all(qtyPromises);
      remoteLog('INFO', '\n✅ All Inventory Quantities Synced.');

    } catch (err) {
       remoteLog('ERROR', '❌ Failed to sync inventory quantities (INVLOC might be missing, trying INVPRICE...):', err.message);
       // Fallback to INVPRICE if INVLOC fails
       try {
          const allInventory = await connection.query('SELECT PARTNO FROM INV');
          const inventoryBatches = [];
          for (let i = 0; i < allInventory.length; i += config.batchSize) {
            inventoryBatches.push(allInventory.slice(i, i + config.batchSize));
          }
          
          const qtyPromises = inventoryBatches.map((batch, i) => {
            return limit(async () => {
              const ids = batch.map(p => `'${String(p.PARTNO).replace(/'/g, "''")}'`).join(',');
              const query = `SELECT PARTNO, EFFSITENO, QTYONHAND, RESERVE, MAXQTY, MINQTY FROM INVPRICE WHERE PARTNO IN (${ids})`;
              await fetchAndSync(connection, 'inventory-quantities', query, `Inventory Qty Batch (INVPRICE) ${i+1}/${inventoryBatches.length}`, null, null, 'inventoryData');
              process.stdout.write(`   ✨ Synced Inventory Qty Batch (INVPRICE) ${i+1}/${inventoryBatches.length}\r`);
            });
          });
          await Promise.all(qtyPromises);
          remoteLog('INFO', '\n✅ All Inventory Quantities Synced (from INVPRICE).');
       } catch (err2) {
          remoteLog('ERROR', '❌ Failed to sync inventory quantities from INVPRICE too:', err2.message);
       }
    }

    // 1. Fetch ALL Invoice IDs first
    remoteLog('INFO', `\n🔍 Fetching ALL invoice IDs since ${config.startDate}...`);
    
    // TEST MODE: Filter for specific invoice if needed
    const TEST_INVOICE = null; // Set to null to disable test mode
    let invoiceQuery = `SELECT INVOICE, CUCD, CUCD_S, SITENO, KEYMOD FROM HINVOICE WHERE INVDATE >= '${config.startDate}' ORDER BY SITENO, INVOICE`;
    
    if (TEST_INVOICE) {
      remoteLog('INFO', `🧪 TEST MODE: Fetching only invoice ${TEST_INVOICE}`);
      invoiceQuery = `SELECT INVOICE, CUCD, CUCD_S, SITENO, KEYMOD FROM HINVOICE WHERE INVOICE = ${TEST_INVOICE}`;
    }

    const allInvoices = await connection.query(invoiceQuery);
    
    if (allInvoices.length === 0) {
      remoteLog('WARN', '❌ No invoices found since start date.');
      return;
    }

    // Filter out ZZ invoices and Transfer (TR) invoices
    // UPDATE: User wants to import ALL invoices and filter in the backend/frontend based on KEYMOD.
    // So we remove the filters here.
    const validInvoices = allInvoices;
    // const validInvoices = allInvoices.filter(inv => {
    //     if (zzCustomerIds.has(String(inv.CUCD))) return false;
    //     if (inv.KEYMOD === 'TR') return false;
    //     return true;
    // });
    // remoteLog('INFO', `ℹ️  Filtered out ${allInvoices.length - validInvoices.length} ZZ/TR invoices.`);
    remoteLog('INFO', `ℹ️  Importing ALL invoices (filtering disabled).`);

    // Limit removed for full sync
    const limitedInvoices = validInvoices;

    remoteLog('INFO', `✅ Found ${limitedInvoices.length} valid invoices (from ${allInvoices.length} total).`);
    remoteLog('INFO', `🚀 Starting Parallel Sync (Batch Size: ${config.batchSize}, Concurrency: ${config.concurrency})...`);

    const batches = [];
    for (let i = 0; i < limitedInvoices.length; i += config.batchSize) {
      batches.push(limitedInvoices.slice(i, i + config.batchSize));
    }

    const totalBatches = batches.length;
    const promises = batches.map((batch, index) => {
      return limit(() => processBatch(connection, batch, index, totalBatches));
    });

    await Promise.all(promises);

    remoteLog('INFO', '\n💾 Saving sync cache...');
    saveCache();

    remoteLog('INFO', '\n🏁 Full Sync Completed!');

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