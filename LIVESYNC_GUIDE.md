# Live Sync Setup Guide

This guide explains how to run the data extraction script on the computer hosting the TireMaster database (SQL Anywhere).

## Prerequisites on the External Computer

1.  **Node.js**: You must have Node.js installed.
    *   Download: [https://nodejs.org/](https://nodejs.org/) (LTS version recommended)
2.  **ODBC Driver**: The computer must have the SQL Anywhere ODBC driver installed and a System DSN configured (usually named `TireMaster`).

## Setup Steps

1.  **Create a Folder**: Create a new folder (e.g., `tm-sync`) on the external computer.
2.  **Copy Script**: Copy the `tiremaster_sync_client.js` file into this folder.
3.  **Initialize Project**:
    Open a command prompt/terminal in that folder and run:
    ```bash
    npm init -y
    ```
4.  **Install Dependencies**:
    Run the following command to install the required libraries:
    ```bash
    npm install odbc axios
    ```

## Configuration

Open `tiremaster_sync_client.js` in a text editor (Notepad, VS Code, etc.) and update the **CONFIGURATION** section at the top:

```javascript
const config = {
  dsn: 'TireMaster',           // Name of your ODBC DSN
  user: 'dba',                 // Database username
  password: 'sql',             // Database password
  backendUrl: 'http://192.168.1.XXX:3001/api/v1/live-sync', // <--- IMPORTANT: Update this IP!
  startDate: '2025-11-01',     // Date to start syncing from
  batchSize: 50,
};
```

*   **backendUrl**: Replace `localhost` or `192.168.1.XXX` with the actual IP address of the computer running the TakeTenDash backend.
    *   To find your Mac's IP: System Settings > Network > Wi-Fi (or Ethernet) > Details.

## Running the Sync

1.  Ensure the TakeTenDash backend is running on your Mac (`npm run start:dev` in the `backend` folder).
2.  On the external computer, run:
    ```bash
    node tiremaster_sync_client.js
    ```

## Troubleshooting

*   **ODBC Errors**: If you see "Data source name not found", check your ODBC Data Source Administrator (32-bit vs 64-bit) and ensure the DSN name matches exactly.
*   **Connection Refused**: If the script cannot connect to the backend, check:
    *   The IP address is correct.
    *   Both computers are on the same network.
    *   The Mac's firewall is not blocking port 3001.
