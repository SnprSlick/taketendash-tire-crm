# Live Data Sync Guide: SQL Anywhere to TakeTenDash

## Overview
Since the TireMaster database (SQL Anywhere) is on a separate machine/network, we will use a **"Push Agent"** architecture.

1.  **The Agent (Source Machine)**: A lightweight Node.js script runs on the computer with the ODBC connection. It queries the database, formats the data, and sends it out.
2.  **The Transport**: Data is sent securely via HTTPS (JSON payload) to your TakeTenDash application.
3.  **The Receiver (TakeTenDash)**: A new API endpoint receives the data and updates the PostgreSQL database.

## Phase 1: Offline Testing (Current Step)
We need to verify we can connect to and query the SQL Anywhere database using the ODBC DSN 'TireMaster'.

### Prerequisites on the Source Machine
1.  **Node.js**: Install Node.js (LTS version) on the external computer.
2.  **ODBC Driver**: Ensure the SQL Anywhere ODBC driver is installed and the DSN 'TireMaster' is configured and working (test with Windows ODBC Data Source Administrator).

### Setup Instructions
1.  Copy the `scripts/tm-extractor.js` file to a new folder on the Source Machine (e.g., `C:\TireMasterSync`).
2.  Open a terminal (Command Prompt or PowerShell) in that folder.
3.  Initialize a project and install the ODBC bridge:
    ```powershell
    npm init -y
    npm install odbc axios
    ```
4.  **Update Table Names**: The script `tm-extractor.js` has been updated with the correct table names found in your PDF:
    *   Invoices: `HINVOICE`
    *   Details: `TRANS`
    *   Customers: `CUSTOMER`
    *   Inventory: `INV`
    *   Inventory Price: `INVPRICE`
    *   Inventory Cost: `INVCOST`
    *   Inventory Category: `INVCAT`
    *   Employees: `EMPLOYEE`
    *   Vehicles: `VEHICLE`
5.  Run the test script:
    ```powershell
    node tm-extractor.js
    ```

## Phase 2: Automation
Once the queries are finalized, we will update the script to:
1.  Run automatically (via Windows Task Scheduler).
2.  Fetch only changed data (using `LastModified` timestamps).
3.  POST the data to your Railway URL.
