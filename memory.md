# Project Memory

## Current Status (Live Sync Update)
- **Admin User**: Re-created default admin user (`admin` / `password`) after database clear. Role set to `ADMINISTRATOR`.
- **Database**: Schema updated with `TireMasterCategory`, `TireMasterBrand` models and `TireType` enum (added SERVICES, PARTS).
- **Sync Clients**:
  - `tiremaster_sync_client.js`: Main sync (Customers, Invoices).
  - `tiremaster_inventory_sync_client.js`: Inventory sync (Categories, Brands, Products, Inventory).
- **Backend**: Running on port 3001.
- **Next Steps**: Run the inventory sync client to populate categories, brands, and inventory.

### Recent Fixes
- Added `SERVICES` and `PARTS` to `TireType` enum in Prisma schema to match `LiveSyncService` logic.
- Regenerated Prisma Client and pushed schema changes to DB.
- Fixed TypeScript errors in `LiveSyncService` related to missing enum values and models.
- Created `tiremaster_inventory_sync_client.js` to handle inventory sync separately.


## Recent Issues
- **Invoice Mismatch**: Invoices were missing items or had wrong totals. Fixed by using composite IDs and correcting revenue calc.
- **Negative Profit**: Caused by incorrect cost/revenue mapping. Fixed.
- **Sorting**: User wants to sort by Site #. Updated sync client query.
- **Customer Names**: "Bill to" vs "Customer". Updated logic to prioritize `COMPANY` > `NAME` > `CONTACT`.

## Next Steps
- User will run the sync client on the external computer.
- Verify data in Dashboard and Reports.

## Recent Sessions Summary

### Live Data Sync (New Feature)
- **Branch**: `feat/live-sync`
- **Goal**: Implement live data syncing from external database (replacing CSV imports).
- **Status**: Initial setup. Running locally offline first.
- **Implementation**:
  - Created `LiveSyncModule`, `LiveSyncController`, `LiveSyncService`.
  - Defined DTOs for `customers`, `inventory`, `vehicles`, `invoices`, `details`.
  - Updated Prisma schema to add `tireMasterId` to `TireMasterProduct` for linking.
  - Implemented upsert logic for all entities.
  - Exposed endpoints:
    - `POST /live-sync/customers`
    - `POST /live-sync/inventory`
    - `POST /live-sync/vehicles` (Stubbed)
    - `POST /live-sync/invoices`
    - `POST /live-sync/details`
  - **Note**: Vehicle sync is stubbed due to missing link to internal Customer model.
  - **Fix**: Added `@Transform` to `TERMS`, `ZIP`, `BPHONE` in `TireMasterCustomerDto` to handle non-string values from ODBC.
  - **Fix**: Added check for null `PARTNO` in `syncInvoiceItems` to prevent `findUnique` error.
  - **Fix**: Added SKU collision handling in `syncInventory`. If `INVNO` is duplicate for different `PARTNO`, appends `PARTNO` to SKU.
  - **Fix**: Updated `syncInvoices` to create a placeholder "Unknown Customer" if the referenced customer is missing, ensuring invoices are not skipped.
  - **Strategy**: Refactored `tiremaster_sync_client.js` to use a "Point of Truth" strategy:
    1. Fetch ALL invoice IDs since start date.
    2. Process in batches of 50.
    3. For each batch, extract and sync referenced Customers and Products *before* syncing the Invoices and Details.
    4. This ensures referential integrity and handles large datasets efficiently.
  - **Frontend**: Updated `TireMasterIntegrationPage` to display counts for Customers and Invoices in the "Data Overview" card.
  - **Frontend**: Added `CustomersList` and `InvoicesList` components to view synced data in tables.
  - **Backend**: Updated `TireMasterService.checkIntegrationHealth` to return `totalCustomers` and `totalInvoices`.
  - **Backend**: Added `getCustomers` endpoint to `TireMasterController` and `TireMasterService`.
  - **Optimization**: Rewrote `tiremaster_sync_client.js` to use parallel batch processing (Concurrency: 5, Batch Size: 100) for faster sync.
  - **Validation**: Added client-side validation to `tiremaster_sync_client.js` using a local JSON cache (`sync_cache.json`) to skip sending unchanged records (Customers, Inventory, Invoices) to the backend, reducing network load and processing time.
  - **Utility**: Created `backend/scripts/clear-tiremaster-data.ts` to wipe all Tire Master related data from the database for a fresh sync.
  - **Fix**: Updated `LiveSyncService` to force recalculation of invoice totals from line items (`TRANS` table) whenever they differ from the header (`HINVOICE` table), resolving discrepancies where headers showed $0 or negative values.
  - **Fix**: Updated `InvoicesList` frontend component to correctly map API fields (`totalAmount`, `orderNumber`) to the display, fixing the issue where the Total column showed $0 due to undefined properties.
  - **Feature**: Added sorting capability to the Tire Master invoices page (sort by Invoice #, Date, Customer, Total, Status).
  - **Feature**: Added `Site #` and `Salesperson` columns to the Tire Master invoices list.
    - Updated Prisma schema to include `siteNo` and `salesperson` in `TireMasterSalesOrder`.
    - Updated `tiremaster_sync_client.js` to fetch `SITENO` and `SALESMAN`.
    - Updated `LiveSyncService` to save these fields.
    - Updated `InvoicesList` to display and sort by these fields.
  - **Fix**: Updated `LiveSyncService` to use composite keys (`INVOICE-SITENO`) for `TireMasterSalesOrder` and `Invoice` to prevent cross-site collisions.
  - **Fix**: Corrected profit calculation in `LiveSyncService`. The `COST` field from TireMaster is the *extended cost* (total line cost), not unit cost. Removed the multiplication by quantity which was causing extremely negative profits.
  - **Fix**: Updated `LiveSyncService` to prevent overwriting invoice totals with 0 when line items are missing/zero.
  - **Fix**: Repaired existing zero-total invoices using `repair-zero-totals.js`.
  - **Fix**: Linked existing invoices to stores using `link-invoices-to-sites.js`.
  - **Fix**: Cleared all invoice data to prepare for a fresh, correct sync.
  - **Optimization**: Increased sync client batch size to 500 for faster processing.

### Railway Migration
- **Issue**: User wanted to migrate local database to Railway. Previous script targeted Docker container, but data was in local host Postgres.
- **Fix**: Created `scripts/migrate-local-to-railway.sh` to dump from local host `tire_crm_dev` database.
- **Status**: Backup created successfully. Documentation updated.

### Tire Identification & Classification
- **Issue**: User reported "no tires" showing after re-upload. Tire classification was missing or reset.
- **Fix**: 
  - Ran `backend/scripts/classify-tires.ts` manually to fix existing data (7249 tires identified).
  - Updated `InventoryImportService` to run `classifyProduct` during inventory import, ensuring new/updated items are correctly classified.
  - Added manual trigger endpoint `POST /api/v1/analytics/tires/classify` in `TireAnalyticsController` (and service logic) to allow admins to re-run classification from the UI/API.
  - Ran classification script against Railway production database using public URL (identified 3095 tires).
- **Status**: Immediate data fixed. Import process enhanced. Manual trigger available.

### Employee Management
- **Import Logic**: Updated employee import to parse roles and assign `isMechanic` boolean.
- **Store Assignment**: Added logic to assign employees to stores based on invoice history.
- **Mechanic Page**: Fixed "Show Inactive" and "Show Non-Mechanics" toggles.

### Store Dashboard
- **New Feature**: Created a dedicated Store Dashboard.
- **Analytics**: Added Year-to-Date (YTD) Gross Profit and Revenue stats.
- **Comparison**: Added charts to compare store performance (Gross Profit focused).
- **Employee List**: Added collapsible employee lists per store.
- **Navigation**: Updated nav menu to prioritize Stores.

### Tire Analytics
- **Filters**: Added quality filters (Premium, Standard, Economy).
- **UI**: Highlighted selected date range in filter bar.
- **Bug Fix**: Fixed issue where imported brands were missing (removed strict quality filter for some views, re-added for others).

### Inventory Analytics
- **Optimization**: Refactored `InventoryAnalytics` to load historical graph data only when a row is expanded to improve page load performance.

### Business Insights (New Feature)
- **Module**: Created `InsightsModule` with `InsightsService` and `InsightsController`.
- **Dashboard**: Created `InsightsDashboard` frontend using Tailwind CSS.
- **Metrics**:
  - **Restock Alerts**: Identify items with low quantity. Updated filter to show items out of stock for < 30/60/90/365 days (recent OOS). Added velocity-based outlook (30/60/90/180 days).
  - **Urgent Actions**: Updated logic to include both "Low Stock" (about to go out) and "Recently Out of Stock" (OOS < 90 days) items when the 90-day OOS filter is active. Defaulted the view to this 90-day outlook.
  - **Urgent Actions**: Added "Last Sold Date" and "Quantity Sold in 90 Days Prior to Last Sale" to the display for better context on dead stock candidates.
  - **Cross-Store Transfers**: Added logic to suggest moving inventory from overstocked stores to stores with demand. Implemented "Even Inventory" logic (sets of 2 or balancing odd quantities).
  - **Overstock Alerts**: Identify items with high quantity and low sales.
  - **Labor Efficiency**: Analyze technician utilization.
  - **Margin Leakage**: Identify invoices with low margins.
  - **Attachment Rates**: Track alignment sales with tire invoices.
- **Refinement**: Filtered inventory insights to only include items where `isTire: true` and `quality` is not 'UNKNOWN'.
  - **Fix**: Updated Technician Utilization to use `MechanicLabor` table. Improved calculation to use `quantity` (hours) for known labor categories and estimate hours from revenue ($50/hr) for others. This fixes the 0% utilization issue.
  - **Fix**: Ensured product names are populated (fallback to Brand Pattern Size if description is missing). Added SKU and Manufacturer Part Number (PN) to dashboard cards.
  - **Visualization**: Enhanced Cross-Store Transfer cards to show a visual flow with arrows and a grid of inventory levels for all stores to provide better context.
  - **Table View**: Refactored Strategic Opportunities (Cross-Store Transfers) into an expandable table. Added detailed reasoning, velocity comparison, and visual transfer flow within the expanded row.
  - **Logic Refinement**: Updated Cross-Store Transfer logic:
    - Source Quantity >= 8 (Strict).
    - Target Low Stock & Velocity > 0.
    - Transfer Amount >= 4 (Strict).
    - Prioritize Low Velocity -> High Velocity transfers (don't move if Source Velocity > Target Velocity unless Source is massively overstocked).
    - Ensure even inventory numbers after transfer.
  - **Visualization**: Added 90-day velocity line charts for both source and target stores in the expanded transfer view to visualize historical movement.
  - **Refinement**: Increased velocity calculation window to 180 days. Updated charts to show 6-month history with a 30-day moving average for smoother trends.
  - **UI**: Updated velocity display in Strategic Opportunities table to show "units/mo" (monthly velocity) instead of daily, for better readability.
  - **Confidence Scoring**: 
    - Based on daily velocity differential over 60 days.
    - 0.6 units/day differential = 100% confidence.
    - Formula: `min((velocityDiff / 0.6) * 100, 100)`
  - **Sorting**: Transfer opportunities are sorted by Confidence Score in descending order (Highest Confidence first).
  - **Transfer Logic**:
    - **Minimum Stock**: Calculated based on average install quantity per invoice. Always rounds up to the next even number (e.g., 3.1 -> 4, 4.1 -> 6).
    - **Source Protection**: Source store must retain at least `minStock` (and 60 days of supply).
    - **Transfer Thresholds**: 
      - Source must have >= 8 units.
      - Transfer amount must be >= 4 units.
      - Transfers occur in sets of 2 or to achieve even inventory.
    - **Tire Type**: Logic defaults to 4 units for Passenger/LT tires if no history exists.
  - **UI**: Moved confidence rating badge to the main table row (before expansion) for better visibility. Added "Confidence" column to the table.
  - **Outlook**: Added "Est. Days of Supply" (30-day outlook) for both Source and Target stores in the expanded transfer view. Also shows "Post-Transfer Supply" to visualize the impact of the move.
72.   - **Metrics**: Added "Typical Install Quantity" (avg tires per invoice) to the transfer reasoning to justify minimum stock levels.
  - **Refinement**: Updated "Typical Install Quantity" rounding logic:
    - < 2 -> 2
    - > 2 -> 4
    - > 6 -> 8
    - > 8 -> 10
  - **Precedence Logic**: If Source store drops below 30 days of supply after transfer, confidence is penalized (halved). If Source drops below 35 days AND has higher velocity than Target, transfer is killed (Confidence = 0).
  - **Top 3 Tires per Category**:
    - Created a new section showing top 3 performing tires for each category (Passenger, Light Truck, etc.).
    - Displays combined line charts for the top 3 tires to compare trends over the last 6 months.
    - Charts aggregated by month.
    - Filtered out internal part numbers (OP01-OP20).
    - **UI**: Resized charts to be smaller (minimized, sparkline style) and moved to left column.
    - **Filter**: Excluded "Other", "Lawn & Garden", "ATV / UTV", "Agricultural", "Industrial", and "OTR" categories (case-insensitive).
    - **Layout**: Moved "Top Performing Tires" section to the top of the page, displayed as a horizontal row of cards (grid layout) instead of a sidebar column.
    - **Fix**: Fixed syntax error in `InsightsDashboard` (unexpected token `div` caused by misplaced comment/code).
    - **Fix**: Moved `COLORS` constant definition outside the component function to avoid potential parsing issues.
    - **Fix**: Uncommented `useEffect` hooks to enable data fetching.
    - **Layout**: Updated "Top Performing Tires" to use a horizontal flex row with scrolling (`overflow-x-auto`) to ensure it stays as a single row.
    - **Filter**: Ensured excluded categories are filtered out in the frontend rendering loop.
    - **Fix**: Removed extra closing `</div>` tag in `InsightsDashboard`.


  - **Table View**:
    - Refactored "Inventory at Risk" (Urgent Actions) display from cards to a color-coded table.
    - Applied to both the main dashboard widget and the "View All" modal.
    - **Columns**: Product, Store, Status, Velocity, Last Sold, Order Qty.
    - **Styling**: Rows are color-coded (Red for Out of Stock, Yellow for Low Stock) using the same logic as the previous cards.
    - **Sorting**: Preserved the sorting logic (Stocked items first, then by Order Qty).

## Current State
- Backend server is running (manually started by user).
- Frontend is updated with new dashboards and fixes.
- `memory.md` created to track progress.

### Authentication & Admin Panel (New Feature)
- **Branch**: `feat/auth-admin-panel`
- **Goal**: Implement a login system and an admin panel for user management.
- **Plan**:
  - Set up authentication (likely JWT based).
  - Create User model (if not fully robust).
  - Create Login/Register pages.
  - Create Admin Dashboard for managing users.

### RBAC and Store Filtering (Completed)
- **Goal**: Ensure users can only access data for their assigned stores (unless Admin/Corporate).
- **Implementation**:
  - **Backend**:
    - Created `@User()` decorator to extract user from request.
    - Updated `StoreController` to filter stores by user assignment.
    - Updated `InvoiceController` to filter invoices and reports by store access.
    - Updated `MechanicController` to filter mechanic analytics by store access.
    - Updated `SalesAnalyticsController` to filter sales analytics by store access.
    - Updated `TireAnalyticsController` to filter tire analytics by store access.
    - Updated `InventoryController` to filter inventory analytics by store access.
    - Updated `ReconciliationController` to restrict access to Admin/Corporate and filter batches.
    - Updated `ServiceRemindersController` to restrict generation/sending to authorized roles.
    - Updated `LargeAccountsController` to restrict write operations and filter by Account Manager.
  - **Frontend**:
    - `DashboardLayout` already filters the store selector based on user access.
  - **Fixes**:
    - Fixed TypeScript error in `StoreController` where required `@User()` parameter followed optional `@Query()` parameters.
- **Result**: Backend now strictly enforces access control based on user roles and assigned stores.

### UI Improvements
- **Logout**: Added a logout button to the user dropdown and improved its accessibility.
- **Z-Index Fix**: Fixed an issue where the user dropdown was hidden behind other elements by adjusting the header's z-index.
- **Header Update**: Changed "Sign Out" from a dropdown item to a permanent button in the header for better visibility and accessibility.
- **Header Update**: Moved "Config" and "Admin" buttons to the header (left of Sign Out).
- **Store Selector**:
  - **Fix**: Updated `DashboardLayout` to correctly label the "All Stores" option.
    - For Admin/Corporate/Wholesale roles: Labeled as "Corporate".
    - For other roles (e.g., Store Manager): Labeled as "All Stores".
  - **Logic**: Ensured `allowedStores` filter includes `WHOLESALE` role.
  - **Functionality**: Verified that selecting a store filters data on dashboard pages via `StoreContext` and `storeId` query parameter.

### Bug Fixes
- **401 Unauthorized Error**: Fixed an issue where the Store Manager role (and others) received 401 errors on analytics endpoints.
  - **Cause**: Frontend API calls in `StoresPage`, `MechanicPage`, `MechanicAnalytics`, `MechanicTable`, `MechanicImport`, and `InsightsDashboard` were missing the `Authorization` header.
  - **Fix**: Updated all relevant components to retrieve the JWT token from `AuthContext` and include it in the `Authorization: Bearer <token>` header for all `fetch` requests.
  - **Additional Fixes**: Extended the Authorization header fix to:
    - `StoreDetailPage` (Store details, stats, analytics, employees)
    - `SalesDashboardPage` (Sales analytics)
    - `SalesReportsPage` (Detailed reports)
    - `ReconciliationPage` (Stats, batches, upload, clear)
    - `ReconciliationDetailPage` (Batch details, rescan)
    - `InventoryPage` (Stats, locations, inventory list)
    - `InventoryAnalytics` (Locations, analytics data, history)
    - `TireMasterIntegrationPage` (Sync status)
    - `TireMasterInventory` (Location inventory)
    - `ReconciliationCenter` (Tire Master reconciliation)
    - `SalespersonDetailPage` (Salesperson reports)
    - `CustomerDetailPage` (Customer reports)
    - **Build Fix**: Fixed duplicate import of `useStore` in `CustomerDetailPage` which was causing build failures.
  - **Mechanic Page Filtering**:
    - **Issue**: Mechanic performance page was showing data for all stores instead of the selected store.
    - **Fix**: Updated `MechanicController` and `MechanicService` to accept `storeId` and filter `mechanic_labor` records by joining with `invoices` table. Updated `MechanicTable` frontend component to pass `selectedStoreId` to the API.
  - **Inventory Page 401**:
    - **Issue**: Inventory page was returning 401 Unauthorized.
    - **Fix**: Updated `InventoryPage` to ensure API calls are only made when `token` is available (added check in `useEffect`).
  - **Store Detail Page Analytics**:
    - **Issue**: Analytics and stats were not populating on the Store Detail page, although technicians were visible.
    - **Fix**: Updated `StoreDetailPage` to include `token` in the `useEffect` dependency array and ensure API calls are only made when `token` is available. This prevents race conditions where the fetch might occur before the token is ready.
    - **Enhancement**: Updated default view to "Year to Date" (YTD).
    - **Enhancement**: Updated backend `getAnalytics` to aggregate data by month when the date range exceeds 180 days (e.g., YTD view), ensuring the chart displays monthly breakpoints instead of daily noise.
  - **Sales & Reconciliation Pages**:
    - **Issue**: Similar issues where data fetching might fail or return 401 if token wasn't ready.
    - **Fix**: Updated `SalesDashboardPage`, `SalesReportsPage`, and `ReconciliationPage` to include `token` in dependency arrays and check for its existence before fetching.

### Role-Based Access Control (RBAC) Refinement
- **Store Manager Restrictions**:
  - **Requirement**: Store Managers should only see Analytics, Reports, Mechanics, and Tires. All other pages (Stores, Insights, Reconciliation, Inventory, Restock, Brands, Config) should be hidden and inaccessible.
  - **Implementation**:
    - **Navigation**: Updated `DashboardLayout` to conditionally render `NavItem` components based on `user.role`. Hidden items for `STORE_MANAGER` role.
    - **Route Protection**: Added logic in `DashboardLayout`'s `useEffect` to redirect `STORE_MANAGER` users to `/dashboard/sales` if they attempt to access restricted paths (`/stores`, `/insights`, `/dashboard/reconciliation`, `/dashboard/inventory`, `/brands`, `/tire-master`).
  - **Tire Analytics 401**:
    - **Issue**: Tire analytics page was returning 401 Unauthorized.
    - **Fix**: Updated `TireAnalyticsApiService` to accept an optional token in its methods. Updated `TireAnalyticsDashboard` to retrieve the token from `useAuth` and pass it to the service methods.
  - **Inventory Analytics 401**:
    - **Issue**: Inventory analytics page was returning 401 Unauthorized.
    - **Fix**: Updated `InventoryAnalytics` component to include `token` in `useEffect` dependencies and ensure API calls are only made when `token` is available. Added `Authorization` header to `fetchLocations` and `fetchAnalytics`.
  - **Sales Dashboard & Reports 401**:
    - **Issue**: Sales dashboard and reports pages were returning 401 Unauthorized.
    - **Fix**: Updated `SalesDashboardPage` and `SalesReportsPage` to include `token` in `useEffect` dependencies and ensure API calls are only made when `token` is available. Added `Authorization` header to `fetchAnalyticsData` and `fetchReport`.
  - **Sales Reports Table Alignment**:
    - **Issue**: "Labor" and "Parts" columns were missing from the Salespeople report table header, causing misalignment.
    - **Fix**: Added `SortableHeader` for "Labor" and "Parts" in `SalesReportsPage`.
  - **Tires Page 401 & Navigation**:
    - **Issue**: Tires page was returning 401 Unauthorized. Navigation buttons were left-aligned.
    - **Fix**: Updated `TireAnalyticsApiService` to warn if token is missing. Updated `TireAnalyticsDashboard` to log token status and ensure `loadData` is called with a valid token.
    - **UI**: Centered navigation buttons in `DashboardLayout`.
  - [x] **Corporate Role Restrictions**:
    - [x] Hide 'Config' page from Corporate role
- [x] Restrict Wholesale role navigation to Restock, Insights, and Tires in `DashboardLayout`.

- [x] **Salesperson Access Control**:
  - [x] Updated `User` model to link to `Employee` (Salesperson).
  - [x] Updated `UsersService` and `UsersController` to support linking employees.
  - [x] Updated `AuthService` to return `employeeId` in login response.
  - [x] Updated `CreateUserModal` and `EditUserModal` to allow searching and linking employees.
  - [x] Updated `DashboardLayout` to restrict Salesperson navigation to their specific report page.
  - [x] Fix missing `useEffect` import in `CreateUserModal` component
  - [x] Fixed salesperson search in Create/Edit User modals by improving token handling and removing unnecessary quote replacement logic.
  - [x] Fix salesperson redirection to use name instead of ID
    - Updated `AuthService` to return `employeeName`
    - Updated `AuthContext` to include `employeeName`
    - Updated `DashboardLayout` to use `employeeName` for redirection URL
  - [x] Fix salesperson report access to restrict to own report
    - Updated `DashboardLayout` to redirect Salespeople away from generic reports page.
    - Updated `AuthContext` to validate token and refresh user data on mount, ensuring `employeeName` is up to date.
    - Added fallback to `firstName lastName` if `employeeName` is missing in `DashboardLayout`.
  - [x] Fix salesperson report lookup by ID
    - Updated `InvoiceController.getSalespersonDetails` and `getSalespersonCommissions` to check if the provided name is an ID (CUID format).
    - If it is an ID, it looks up the employee name from the database and uses that for the report query.
    - This handles cases where the frontend might navigate using the ID instead of the name.
  - [x] Fix salesperson report access control (restrict to own report)
    - Updated `InvoiceController` to enforce that users with `SALESPERSON` role can only access the report matching their linked `employeeName`.
    - Added `ForbiddenException` if a salesperson tries to access another salesperson's report.
  - [x] Fix "Salesperson not found" error handling and display
    - Updated `SalespersonDetailPage` to display API error messages (e.g., "Salesperson not found", "You can only view your own report") instead of a generic "Salesperson not found" state when data is missing.
    - Added error state management to the component.
  - [x] Fix "authentication required" error on salesperson report page by ensuring token is available before fetching
    - Updated `SalespersonDetailPage` to include `token` in `useCallback` dependencies and `useEffect` conditions.
    - This prevents the API call from firing with a null token during initial page load or hydration.
  - [x] Fix "authentication required" error on customer report page
    - Applied similar fix to `CustomerDetailPage` to ensure token is available before fetching.
  - [x] Fix "authentication required" error on invoice detail page
    - Applied similar fix to `InvoiceDetailPage` to ensure token is available before fetching.
  - [x] Fix salesperson data visibility (allow viewing data across all stores)
    - Updated `InvoiceController.getSalespersonDetails` and `getSalespersonCommissions` to bypass store restriction for `SALESPERSON` role when no specific store is requested.
    - This allows salespeople to see their total performance across all stores they have sales in, rather than just their assigned store.
    - **Fix**: Updated `InvoiceController` to explicitly ignore the `storeId` query parameter for `SALESPERSON` role when viewing their own report. This ensures that even if the frontend sends a default store ID, the backend queries all stores for that salesperson's data.
  - [x] Remove "Back to Reports" button for Salesperson role
    - Updated `SalespersonDetailPage` to hide the "Back to Reports" button if the user has the `SALESPERSON` role.
    - This prevents confusion as salespeople do not have access to the main reports list.
  - [x] Fix customer detail view for Salesperson role
    - Updated `InvoiceController.getCustomerDetails` to:
      - Ignore `storeId` filter for `SALESPERSON` role (showing cross-store history).
      - Add `salesperson` filter for `SALESPERSON` role (showing only sales made by that salesperson to the customer).
    - This ensures salespeople see the complete history of their relationship with the customer, matching the requirement "statistics from the salesperson and that customer".

- [x] **Mechanic Dashboard (New Feature)**:
  - [x] Created detailed mechanic dashboard page (`/dashboard/mechanic/[name]`).
    - Features: Efficiency Gauge, Key Metrics (Labor, Parts, GP, Hours), Performance Charts, Recent Jobs Table.
  - [x] Updated `MechanicController` and `MechanicService` with `getMechanicDetails` endpoint.
    - Returns summary stats, invoices, and chart data filtered by mechanic name and store access.
  - [x] Updated `DashboardLayout` for Mechanic role:
    - Redirects `MECHANIC` role to their specific dashboard.
    - Shows "My Dashboard" link for mechanics.
    - Hides other navigation items.
  - [x] Updated `MechanicTable` and `MechanicAnalytics` to link mechanic names to the new dashboard.
  - [x] Fixed TypeScript error in `MechanicService` where `totalParts` was used before declaration.
  - [x] Fixed mechanic login redirection to specific dashboard
    - Updated `AuthContext` to redirect mechanics to their dashboard upon login.
    - Updated `DashboardLayout` to strictly redirect mechanics away from other dashboard pages (including `/dashboard/sales`).
  - [x] Fixed mechanic name matching logic
    - Updated `MechanicService.getMechanicDetails` to handle name variations (e.g., "Andrew R Sparks" vs "Andrew Sparks").
    - Implemented fallback search: if exact match fails, searches for a mechanic name containing the last name and first name of the requested user.
    - This resolves the issue where assigned mechanics saw no data due to slight name discrepancies between the user account and the mechanic labor records.
  - [x] Fix mechanic dashboard data discrepancy (allow mechanics to view data across all stores)
    - Updated `MechanicController.getMechanicDetails` to bypass store restriction for `MECHANIC` role.
    - This allows mechanics to see their total performance across all stores, resolving discrepancies with the admin view which aggregates all stores.
  - [x] Fix mechanic dashboard data discrepancy (efficiency, labor/hr, profit/hr) by aligning calculation logic with Admin Panel (using active period instead of requested range).
  - [x] Fix mechanic dashboard data discrepancy (set default view to All Time)
    - Updated `MechanicDashboardPage` to default to "All Time" view to match Admin Panel logic.
    - Added "All Time" option to the date range dropdown.
    - Updated `fetchMechanicDetails` to handle "all" date range by not sending `startDate` filter.

- [x] **UI Improvements**:
  - [x] Header: Changed "Sign Out" to a permanent button.
  - [x] Header: Moved "Config" and "Admin" buttons to the header (left of Sign Out).
  - [x] Store Selector:
    - [x] Hide selector if user only has access to one store.
    - [x] Auto-select the single store for restricted users.
    - [x] Ensure "All Stores" vs "Corporate" label is correct based on role.
    - [x] Ensure selector shows all assigned stores for multi-store users.
    - [x] Fix store selector for multi-store users
      - Updated `StoreContext` to include Authorization header in `/api/v1/stores` fetch request.
      - This ensures that `stores` are correctly fetched and filtered by the backend based on the user's access.
      - `DashboardLayout` relies on `stores` from `StoreContext` to populate the dropdown.
  - [x] Login Page: Replaced lock icon with application logo.

### Insights Dashboard Improvements
- **Inventory Risk (Urgent Actions)**:
  - **Color Coding**:
    - **Low Stock**: Yellow/Amber styling (for items with quantity > 0 but low days of supply).
    - **Out of Stock**: Red styling (for items with quantity <= 0).
  - **Sorting**:
    - **Primary**: Stock Status (Low Stock items appear *before* Out of Stock items).
    - **Secondary**: Suggested Order Quantity (Descending).
  - **Backend Update**: Updated `InsightsService.getInventoryRiskAnalysis` to explicitly set `status = 'Out of Stock'` when quantity is <= 0, enabling precise frontend styling.
  - **Frontend Update**: Updated `InsightsDashboard` to implement the new sorting and dynamic styling logic for both the main dashboard card and the "View All" modal.
  - **Urgent Actions Modal**:
    - **Status Text**: Removed empty parentheses `()` when stock is 0 or undefined. Now shows "xd supply" or "Out of Stock (xd)".
    - **OOS Toggle**: Added a checkbox to filter the list to show "Out of Stock Only".
    - **Outlook Selector**: Added a dropdown to change the outlook period (30/60/90/180 days) directly within the modal.
    - **Stock Column**: Added "Stock" column to show current quantity.
    - **Group Filter**: Added "Group" filter dropdown to filter by product category (e.g., Light Truck, Passenger).
    - **Filtering**: Updated logic to support both OOS toggle and Category filter simultaneously.
    - **Refinement**:
      - **Group by SKU**: Updated modal to group alerts by SKU. If multiple stores have alerts for the same SKU, they are displayed under a single product header.
      - **Size Filter**: Added a "Size" filter dropdown to the modal.
      - **OOS Logic**: Refined "Out of Stock Only" toggle to check `currentStock <= 0` for accuracy.
      - **Modal Width**: Increased modal width to `max-w-7xl` for better readability.
      - **Sorting Refinement**: Updated sorting to prioritize In-Stock items first, followed by Out-of-Stock items.
      - **Display Refinement**: Explicitly labeled items as "Out of Stock" or "X In Stock" for clarity.
      - **Fix**: Fixed "undefined in stock" error by mapping `quantity` to `currentStock` in `InsightsService`.
  - [x] Update Urgent Actions modal:
    - [x] Sort by most suggested tires to order (descending) by default.
    - [x] Filter out Out of Stock items if suggested order is less than 6.
    - [x] Update alert counts to reflect filtered results.
    - [x] Explicitly sort grouped alerts by max suggested order.
    - [x] Filter out items with supply exceeding outlook days.
  - [x] **Config Page Import 401**:
    - **Issue**: Import functionality on the Config page was returning 401 Unauthorized.
    - **Fix**: Updated `ImportCenter` and `CsvImportClientPage` components to include the `Authorization` header in all fetch requests (`/api/v1/csv-import/...` and `/api/v1/invoices/...`).

### Live Sync Fixes (2025-12-19)
- **Negative Profit Fix**: Identified that `TRANS.COST` from TireMaster is the **Total Cost** (Extended Cost), not Unit Cost. Updated `LiveSyncService` to calculate Unit Cost as `Total Cost / Quantity`. This resolves the issue of massive negative profits.
- **Database Reset**: Cleared all TireMaster-related data (Invoices, Sales Data, Inventory, Customers, etc.) to ensure a clean state for the new sync logic.
- **Sync Client**: 
    - Verified configuration: Excludes "ZZ-VISA/MASTERCARD" customers.
    - **Data Quality**: Added exclusion logic for Internal/Accounting customers: "GOODYEAR TIRE & RUBBER", "TAKE TEN", "MADDEN,JAMES".
    - **Data Quality**: Added exclusion logic for Accounting transactions (invoices with "INVENTORY COST", "FE TAX RECEIVED", "PAYROLL", etc.).
    - Verified configuration: Runs full sync (no test mode).
    - Verified configuration: Batch size 2000, Concurrency 10.
- **Status**: Backend is running on port 3001. Database is empty (including test data) and ready for the user to run the sync client on the external machine.
- **Current Status**: Database cleared on 2025-12-19. Ready for fresh sync.
- **Next Steps**: Run the sync client to populate data.

### Auth Fixes (2025-12-22)
- **Admin User**: Reset `admin` user password to `admin123`.
- **Admin Role**: Updated `admin` user role to `ADMINISTRATOR` (Fixed from 'system administrator' to match frontend check).
- **Auth Module**: Fixed `AuthModule` and `JwtStrategy` to correctly load `JWT_SECRET` using `ConfigService` / `registerAsync` to avoid race conditions with environment variable loading.
- **Port Conflict**: Moved backend to port `3002` due to `EADDRINUSE` on `3001` (likely a zombie process or conflict).
- **Frontend Config**: Updated `frontend/.env.local` to point to port `3002`.
- **Verification**: Verified login and token validation works correctly on port 3002.
- **Port Reset**: Reset backend port to `3001` and updated frontend config accordingly (User manual restart).
- **Status**: Backend running on port 3001.
- **Git Push**: Pushed changes to `feat/live-sync` branch (2025-12-22).

## Inventory Sync Fixes
- Fixed missing `TireMasterInventoryDataDto` import in `live-sync.service.ts`.
- Verified `LiveSyncController` has `inventory-quantities` endpoint.
- Verified `tiremaster_sync_client.js` fetches inventory quantities from `INVLOC` (or `INVPRICE`).
- Verified frontend `InventoryPage` expects data structure provided by `InventoryService`.
- Restarted backend to apply changes.

- **Inventory Sync Client Split**:
  - Created `scripts/tiremaster_inventory_sync_client.js` to handle inventory syncing separately from invoices.
  - Fixed `p-limit` dependency issue by inlining custom implementation, removing the need for external package installation.
  - This allows for independent updates of inventory levels without re-syncing all invoices.
  - Logic includes fetching products from `INV` and quantities from `INVLOC` (with fallback to `INVPRICE`).

- **Fix Inventory Sync API Errors**:
  - Updated `tiremaster_inventory_sync_client.js` to sanitize `null` values from the payload before sending to the backend. This prevents `class-validator` errors for optional fields that are null in the database.
  - Verified `p-limit` implementation in the script.
  - **Fix Inventory Sync Client**:
    - Updated API URL to `10.10.11.204`.
    - Fixed SQL quoting for `PARTNO` in `IN` clauses to prevent ODBC errors.
    - Fixed `p.PartNO.replace is not a function` error by casting `PARTNO` to String before calling `.replace()`.
- [x] Fix SQL quoting for PARTNO in inventory sync client (escaped single quotes)
- [x] **Fix Inventory Sync**:
  - Created `scripts/tiremaster_inventory_sync_client.js` to sync inventory separately.
  - Fixed `p-limit` dependency issue by implementing a custom concurrency limiter.
  - Fixed SQL quoting for `PartNO`.
  - Fixed API URL (added IP).
  - Fixed "error executing sql statement" by prioritizing `INVPRICE` table over `INVLOC` and adding robust error handling/fallback.

### Remote Logging & Final Setup (2025-12-22)
- **Remote Logging**: Enabled. Sync clients (`tiremaster_sync_client.js` and `tiremaster_inventory_sync_client.js`) now send logs to `/api/v1/live-sync/logs`.
- **Backend**: `LiveSyncController` updated to accept logs and print them to the backend console.
- **Port**: Backend confirmed running on port 3001. Sync clients configured to use port 3001.
- **Status**: Ready for user to run sync clients on the external machine. Logs will appear in the backend terminal.

### Inventory Sync Fixes (2025-12-22)
- **Backend Fix**: Fixed `TireType` enum error in `LiveSyncService` (removed invalid `SERVICES` and `PARTS` checks).
- **Sync Client Update**: Updated `tiremaster_inventory_sync_client.js` with verification logic to detect missing products.
  - Logs "Batch mismatch" warnings if fetched items count != requested batch size.
  - Logs sample IDs for debugging.
  - Refactored `fetchAndSync` to accept pre-fetched data to avoid re-execution.
- **Category Sync Fix**: Updated `tiremaster_inventory_sync_client.js` to correctly map `CatType` to a number (or null) to satisfy backend validation, resolving 400 Bad Request errors.

### Inventory Sync Debugging (2025-12-22)
- **Missing Tables**: User reported `MFG` and `CODES` tables not found.
- **Fix**: Updated `tiremaster_inventory_sync_client.js` to:
  - List all tables in the database (via `systable`) to help identify correct table names.
  - Try `MANUFACTURER` and `BRAND` tables as fallbacks for brand data.
  - Log potential brand table candidates.
- **Brand Table Search**: Created `scripts/find-brand-table.js` to help locate the correct tables for Brands and Categories by searching for "Bridgestone" and inspecting SKU '000019'.
  - **Update**: Fixed connection string to use `DSN=TireMaster` to match the working sync client environment.
  - **Action**: User needs to run `node scripts/find-brand-table.js` on the external computer and report the output.
  - **Success**: User confirmed `MFGCODE` table contains brand info (Code='BRI', Descr='bridgestone'). Updated `tiremaster_inventory_sync_client.js` to use this table.

