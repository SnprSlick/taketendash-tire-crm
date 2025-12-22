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
  startDate: '2025-01-01',     // Sync data from this date
  batchSize: 2000,             // Records per API request (Increased for speed)
  concurrency: 10,             // Max concurrent batches
  cacheFile: path.join(__dirname, 'sync_cache.json'),
};

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
    console.log(`📂 Loading sync cache from ${config.cacheFile}...`);
    syncCache = JSON.parse(fs.readFileSync(config.cacheFile, 'utf8'));
    // Ensure structure
    if (!syncCache.customers) syncCache.customers = {};
    if (!syncCache.inventory) syncCache.inventory = {};
    if (!syncCache.invoices) syncCache.invoices = {};
  } catch (err) {
    console.error('⚠️ Failed to load cache, starting fresh:', err.message);
  }
}

function calculateHash(obj) {
  return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');
}

function saveCache() {
  try {
    fs.writeFileSync(config.cacheFile, JSON.stringify(syncCache, null, 2));
  } catch (err) {
    console.error('⚠️ Failed to save cache:', err.message);
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

async function fetchAndSync(connection, type, query, description, cacheOptions = null, transformFn = null) {
  try {
    // 1. Fetch Data (ODBC)
    // Note: ODBC queries on a single connection must be sequential. 
    // We rely on the main loop to manage this, or we accept that node-odbc might queue them.
    // To be safe and robust, we'll assume this might block other fetches, which is fine.
    const result = await connection.query(query);
    
    if (result.length === 0) return;

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
        // console.log(`      ⏩ All ${result.length} ${type} skipped (unchanged)`);
        return;
      }
      
      if (dataToSync.length < result.length) {
        // console.log(`      ℹ️  Syncing ${dataToSync.length}/${result.length} ${type} (others unchanged)`);
      }
    }

    // 3. Send Data (API) - This is where parallelism shines
    const payload = {};
    payload[type] = dataToSync;

    try {
      await axios.post(`${config.backendUrl}/${type}`, payload);
      // console.log(`      ✅ Synced ${dataToSync.length} ${type}`);

      // 4. Update Cache
      if (cacheOptions) {
        const { keyField, cacheMap } = cacheOptions;
        dataToSync.forEach(item => {
          syncCache[cacheMap][item[keyField]] = calculateHash(item);
        });
      }

    } catch (err) {
      console.error(`      ❌ Failed to sync ${type}: ${err.message}`);
      if (err.response) console.error('         Server:', err.response.data);
      throw err; // Re-throw to mark batch as failed
    }
  } catch (err) {
    console.error(`      ❌ Error in ${description}: ${err.message}`);
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
        'ACCOUNTING'
  ];
  // const customerIds = [...new Set(batch.map(inv => inv.CUCD).filter(id => id != null))]; // No longer needed per-batch

  console.log(`\n📦 Processing Batch ${batchIndex + 1}/${totalBatches} (${batch.length} invoices)`);

  try {
    // A. Sync Customers - SKIPPED (Done globally)
    /*
    if (customerIds.length > 0) {
      const customerQuery = `SELECT CUCD, NAME, ADDRESS1, ADDRESS2, CITY, STATE, ZIP, BPHONE, EMail, CREDIT, TERMS, ACTIVE FROM CUSTOMER WHERE CUCD IN (${customerIds.join(',')})`;
      await fetchAndSync(connection, 'customers', customerQuery, 'Customers', null);
    }
    */

    // B. Fetch Details to find Products
    const detailsQuery = `SELECT t.INVOICE, t.LINENUM, t.SITENO, t.PARTNO, t.DESCR, t.QTY, t.AMOUNT, t.COST, t.FETAX, t.LABOR 
                          FROM TRANS t 
                          WHERE t.INVOICE IN (${invoiceIds})`;
    
    const details = await connection.query(detailsQuery);
    
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
        // console.log(`      ℹ️  Skipping ${invoicesToSkip.size} internal/accounting invoices in this batch.`);
    }

    // Filter details to exclude skipped invoices
    const filteredDetails = details.filter(d => !invoicesToSkip.has(d.INVOICE));
    
    // DEBUG LOGGING FOR TEST INVOICE
    if (details.length > 0 && details[0].INVOICE == 62783) {
        console.log('\n🔍 DEBUG: Raw Details for Invoice 62783:');
        details.forEach(d => {
            console.log(`   Line ${d.LINENUM}: Part=${d.PARTNO}, Qty=${d.QTY}, Amount=${d.AMOUNT}, Labor=${d.LABOR}, FET=${d.FETAX}, Cost=${d.COST}`);
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
    const invoiceSyncQuery = `SELECT INVOICE, CUCD, INVDATE, TAX, NOTAXABLE, TAXABLE, SITENO, BSALES FROM HINVOICE WHERE INVOICE IN (${invoiceIds})`;
    
    const invoiceTransform = (inv) => {
      // Skip if in skip list
      if (invoicesToSkip.has(inv.INVOICE)) return null;

      // Map BSALES (Employee ID) to Salesperson Name
      if (inv.BSALES && employeeMap[inv.BSALES]) {
        inv.SALESMAN = employeeMap[inv.BSALES];
        
        // Check if Salesperson is in exclusion list
        const salesmanUpper = inv.SALESMAN.toUpperCase();
        for (const excluded of EXCLUDED_NAMES) {
            if (salesmanUpper.includes(excluded)) {
                return null; // Skip this invoice
            }
        }
      } else {
        inv.SALESMAN = null;
      }
      delete inv.BSALES; // Remove BSALES as it's not in the DTO
      return inv;
    };

    await fetchAndSync(connection, 'invoices', invoiceSyncQuery, 'Invoices', null, invoiceTransform);

    // E. Sync Details (Send the details we already fetched)
    // Note: Details are tricky to cache individually because they don't have a single unique ID in the query result easily (INVOICE + LINENUM + SITENO).
    // Also, if we skip the invoice, we probably skip details.
    // For now, we'll just sync details if we synced the invoice or if we want to be safe.
    // Optimization: Only sync details for invoices that were NOT skipped?
    // But fetchAndSync filters the array. We don't easily know which invoices were skipped in step D without checking cache again.
    // Let's just send details. The backend upsert handles it.
    if (filteredDetails.length > 0) {
        const payload = { details: filteredDetails };
        await axios.post(`${config.backendUrl}/details`, payload);
    }

    process.stdout.write(`   ✨ Batch ${batchIndex + 1} Complete\r`);

  } catch (error) {
    console.error(`   ❌ Batch ${batchIndex + 1} Failed:`, error.message);
  }
}

async function main() {
  let connection;
  try {
    console.log(`🔌 Connecting to ODBC DSN: ${config.dsn}...`);
    const connectionString = `DSN=${config.dsn};UID=${config.user};PWD=${config.password}`;
    // Use a pool if possible, but standard connect is safer if driver is old.
    // We will use a single connection and rely on the event loop.
    connection = await odbc.connect(connectionString);
    console.log('✅ Connected to Database!');

    // 0. Fetch Employees for Mapping
    console.log('\n👥 Fetching Employees...');
    try {
      const employees = await connection.query('SELECT ECUCD, NAME FROM EMPLOYEE');
      employees.forEach(emp => {
        employeeMap[emp.ECUCD] = emp.NAME;
      });
      console.log(`✅ Loaded ${employees.length} employees.`);
    } catch (err) {
      console.warn('⚠️ Failed to fetch employees, salesperson mapping will be skipped:', err.message);
    }

    // 0.5. Fetch ALL Customers
    console.log('\n👥 Fetching ALL Customers...');
    const zzCustomerIds = new Set();
    
    const EXCLUDED_NAMES = [
        'JAMES MATHERS',
        'DARLA KAY TARRANT',
        'KALEE GILBERT',
        'STEVE WITZKE',
        'EMILY R ISRAEL',
        'ELI STEWARD',
        'INTERNAL',
        'ACCOUNTING'
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
      console.log(`ℹ️  Identified ${zzCustomerIds.size} ZZ/Internal customers to exclude.`);

      console.log(`✅ Found ${allCustomers.length} customers. Syncing...`);
      
      // Filter customers to sync
      const validCustomers = allCustomers.filter(c => !zzCustomerIds.has(String(c.CUCD)));
      console.log(`ℹ️  Syncing ${validCustomers.length} valid customers (excluding ${zzCustomerIds.size} ZZ/Internal).`);

      const customerBatches = [];
      for (let i = 0; i < validCustomers.length; i += config.batchSize) {
        customerBatches.push(validCustomers.slice(i, i + config.batchSize));
      }

      const customerPromises = customerBatches.map((batch, i) => {
        return limit(async () => {
          const ids = batch.map(c => c.CUCD).join(',');
          const query = `SELECT CUCD, NAME, ADDRESS1, ADDRESS2, CITY, STATE, ZIP, BPHONE, EMail, CREDIT, TERMS, ACTIVE FROM CUSTOMER WHERE CUCD IN (${ids})`;
          await fetchAndSync(connection, 'customers', query, `Customers Batch ${i+1}/${customerBatches.length}`, null);
          process.stdout.write(`   ✨ Synced Customers Batch ${i+1}/${customerBatches.length}\r`);
        });
      });
      await Promise.all(customerPromises);
      console.log('\n✅ All Customers Synced.');
    } catch (err) {
      console.error('❌ Failed to sync customers:', err.message);
    }

    // 0.6. Fetch ALL Inventory
    console.log('\n📦 Fetching ALL Inventory...');
    try {
      const allInventory = await connection.query('SELECT PARTNO FROM INV');
      console.log(`✅ Found ${allInventory.length} inventory items. Syncing...`);

      const inventoryBatches = [];
      for (let i = 0; i < allInventory.length; i += config.batchSize) {
        inventoryBatches.push(allInventory.slice(i, i + config.batchSize));
      }

      const inventoryPromises = inventoryBatches.map((batch, i) => {
        return limit(async () => {
          const ids = batch.map(p => p.PARTNO).join(',');
          const query = `SELECT PARTNO, INVNO, MFG, SIZE, CAT, NAME, WEIGHT, ACTIVE, VENDPARTNO FROM INV WHERE PARTNO IN (${ids})`;
          await fetchAndSync(connection, 'inventory', query, `Inventory Batch ${i+1}/${inventoryBatches.length}`, null);
          process.stdout.write(`   ✨ Synced Inventory Batch ${i+1}/${inventoryBatches.length}\r`);
        });
      });
      await Promise.all(inventoryPromises);
      console.log('\n✅ All Inventory Synced.');
    } catch (err) {
      console.error('❌ Failed to sync inventory:', err.message);
    }

    // 1. Fetch ALL Invoice IDs first
    console.log(`\n🔍 Fetching ALL invoice IDs since ${config.startDate}...`);
    
    // TEST MODE: Filter for specific invoice if needed
    const TEST_INVOICE = null; // Set to null to disable test mode
    let invoiceQuery = `SELECT INVOICE, CUCD, SITENO FROM HINVOICE WHERE INVDATE >= '${config.startDate}' ORDER BY SITENO, INVOICE`;
    
    if (TEST_INVOICE) {
      console.log(`🧪 TEST MODE: Fetching only invoice ${TEST_INVOICE}`);
      invoiceQuery = `SELECT INVOICE, CUCD, SITENO FROM HINVOICE WHERE INVOICE = ${TEST_INVOICE}`;
    }

    const allInvoices = await connection.query(invoiceQuery);
    
    if (allInvoices.length === 0) {
      console.log('❌ No invoices found since start date.');
      return;
    }

    // Filter out ZZ invoices
    const validInvoices = allInvoices.filter(inv => !zzCustomerIds.has(String(inv.CUCD)));
    console.log(`ℹ️  Filtered out ${allInvoices.length - validInvoices.length} ZZ invoices.`);

    // Limit removed for full sync
    const limitedInvoices = validInvoices;

    console.log(`✅ Found ${limitedInvoices.length} valid invoices (from ${allInvoices.length} total).`);
    console.log(`🚀 Starting Parallel Sync (Batch Size: ${config.batchSize}, Concurrency: ${config.concurrency})...`);

    const batches = [];
    for (let i = 0; i < limitedInvoices.length; i += config.batchSize) {
      batches.push(limitedInvoices.slice(i, i + config.batchSize));
    }

    const totalBatches = batches.length;
    const promises = batches.map((batch, index) => {
      return limit(() => processBatch(connection, batch, index, totalBatches));
    });

    await Promise.all(promises);

    console.log('\n💾 Saving sync cache...');
    saveCache();

    console.log('\n🏁 Full Sync Completed!');

  } catch (error) {
    console.error('❌ Fatal Error:', error);
  } finally {
    if (connection) {
      await connection.close();
      console.log('🔌 Connection closed.');
    }
  }
}

main();