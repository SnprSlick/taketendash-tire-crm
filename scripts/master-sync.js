const { spawn } = require('child_process');
const path = require('path');

const scripts = [
  {
    name: 'Inventory Sync',
    path: path.join(__dirname, 'tiremaster_inventory_sync_client.js'),
    cwd: __dirname
  },
  {
    name: 'Invoice & Customer Sync',
    path: path.join(__dirname, 'tiremaster_sync_client.js'),
    cwd: __dirname
  },
  {
    name: 'Data Rehydration',
    path: path.join(__dirname, '../backend/rehydrate-invoices.js'),
    cwd: path.join(__dirname, '../backend')
  }
];

async function runScript(script) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Starting ${script.name} ===`);
    console.log(`Path: ${script.path}`);
    
    const child = spawn('node', [script.path], {
      cwd: script.cwd,
      stdio: 'inherit', // Pipe output directly to console
      env: { ...process.env }
    });

    child.on('error', (err) => {
      console.error(`Failed to start ${script.name}:`, err);
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n=== ${script.name} Completed Successfully ===`);
        resolve();
      } else {
        console.error(`\n=== ${script.name} Failed with code ${code} ===`);
        reject(new Error(`${script.name} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const startTime = Date.now();
  console.log(`Starting Master Sync Process at ${new Date().toISOString()}`);

  try {
    for (const script of scripts) {
      await runScript(script);
    }
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`\n✅ All sync processes completed successfully in ${duration} minutes.`);
    
  } catch (error) {
    console.error('\n❌ Master Sync Process Failed:', error.message);
    process.exit(1);
  }
}

main();
