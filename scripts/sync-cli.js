const readline = require('readline');
const { spawn } = require('child_process');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const scripts = {
  // inventory: path.join(__dirname, 'tiremaster_inventory_sync_client.js'), // Deprecated, included in main client
  main: path.join(__dirname, 'tiremaster_sync_client.js'),
  rehydrate: path.join(__dirname, '..', 'backend', 'rehydrate-invoices.js')
};

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${path.basename(scriptPath)} ${args.join(' ')}`);
    const child = spawn('node', [scriptPath, ...args], { stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${path.basename(scriptPath)} completed successfully.`);
        resolve();
      } else {
        console.error(`❌ ${path.basename(scriptPath)} failed with code ${code}.`);
        reject(new Error(`Script failed with code ${code}`));
      }
    });
  });
}

async function runMainSync(startDate) {
  const date = startDate || '2025-01-01';
  console.log(`\n🔄 Starting Full Sync (Customers, Inventory, Invoices) from ${date}...`);
  await runScript(scripts.main, [date]);
}

async function runRehydrate(startDate) {
  console.log('\n💧 Starting Rehydration...');
  const args = startDate ? [startDate] : [];
  await runScript(scripts.rehydrate, args);
}

async function main() {
  while (true) {
    console.log('\n=== TireMaster Sync CLI ===');
    console.log('1. Full Sync (Customers, Inventory, Invoices)');
    console.log('2. Rehydrate Only (Process existing data)');
    console.log('0. Exit');

    const answer = await askQuestion('\nSelect an option (0-2): ');

    try {
      switch (answer.trim()) {
        case '1': // Full Sync
          const dateFull = await askQuestion('Enter Start Date (YYYY-MM-DD) [Default: 2025-01-01]: ');
          const startDateFull = dateFull.trim() || '2025-01-01';
          // Main sync handles Customers, Inventory, and Invoices
          await runMainSync(startDateFull);
          // Rehydrate is optional/redundant if sync works, but good for safety or fixing old data
          // await runRehydrate(startDateFull); 
          break;
        case '2': // Rehydrate Only
          const dateRe = await askQuestion('Enter Start Date (YYYY-MM-DD) [Default: 2025-01-01]: ');
          const startDateRe = dateRe.trim() || '2025-01-01';
          await runRehydrate(startDateRe);
          break;
        case '0':
          console.log('Exiting...');
          rl.close();
          process.exit(0);
          break;
        default:
          console.log('Invalid option.');
          break;
      }
    } catch (err) {
      console.error('\n❌ Process failed:', err.message);
    }
    
    // Ask to continue or exit
    const cont = await askQuestion('\nPress Enter to return to menu, or type "exit" to quit: ');
    if (cont.trim().toLowerCase() === 'exit') {
        rl.close();
        process.exit(0);
    }
  }
}

main();
