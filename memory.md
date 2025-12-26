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


### Rollback (2025-12-23)
- **Action**: Rolled back to commit `930dfaa` ("updated inventory and brands working correctly"), discarding uncommitted changes.
- **Reason**: User request to return to the last commit state.

### Fixes (2025-12-23)
- **Prisma Client Sync**: Regenerated Prisma Client (`npx prisma generate`) to resolve TypeScript errors after rollback. The rollback restored the schema but the generated client in `node_modules` was out of sync.

### Debugging & Fixes (2025-12-23)
- **Issue**: User reported invoice #7-275629 showing up as a "TR invoice" (Transfer) and suspected "Unknown Customer" invoices are also TRs.
- **Investigation**:
  - "Unknown Customer" is created when the sync client filters out a customer (or fails to find them) but the invoice is still synced.
  - The invoice sync logic filters invoices based on excluded customers.
  - If a customer is excluded, their invoices *should* be excluded.
  - However, if the customer name didn't match the exclusion list previously, it was synced.
- **Fix**: Updated `scripts/tiremaster_sync_client.js` to add 'TRANSFER', 'TR', 'INTER-STORE', 'INTERCOMPANY' to the exclusion list for both Customers and Salespeople.
- **Debug Tool**: Created `scripts/debug-invoice.js` to allow the user to inspect specific invoices and their customer data directly from the ODBC connection.

### Fixes (2025-12-23) - Part 2
- **Issue**: Invoice #7-275629 (and likely others) appearing as "Unknown Customer" because they are Transfer (TR) invoices, which should be excluded.
- **Fix**: Updated `scripts/tiremaster_sync_client.js` to:
  - Fetch `KEYMOD` column in the initial invoice query.
  - Filter out invoices where `KEYMOD === 'TR'`.
- **Debug**: Updated `scripts/debug-invoice.js` to print full invoice object to debug missing "Total" field.

### Fixes (2025-12-23) - Part 3
- **Issue**: Inventory sync failed with `[odbc] Error executing the sql statement` when fetching quantities.
- **Cause**: `PARTNO` values were being passed to SQL `IN (...)` clause without quotes (e.g., `IN (123-456)` instead of `IN ('123-456')`).
- **Fix**: Updated `scripts/tiremaster_sync_client.js` to properly quote and escape `PARTNO` values in all inventory queries (`INV`, `INVLOC`, and `INVPRICE` fallback).

## TireMaster Keymods Reference
| Code | Description | Notes |
|------|-------------|-------|
| **(Blank)** | Normal sale invoice | |
| **CC** | Credit card invoice | Posts to AR account for credit card company (e.g., ZZ-Visa). Treated as cash sale. |
| **DC** | Disbursement of cash | "Paidout" - money taken from till for expense. |
| **DE** | Deposits | Partial payments or prepayments (layaway/special orders). |
| **EC** | Easy check | Check written in check register. |
| **FC** | Finance charge | Applied to outstanding balance. |
| **GS** | Government support sale | |
| **IC** | Inventory correction | Quantity adjustment. |
| **IR** | Inventory return | |
| **JE** | Journal entry | Day end closing (Inventory Adj Vendor) or Manual entry. |
| **NA** | National account sale | |
| **PO** | Vendor charge | Created by completing/pricing a purchase order. |
| **PY** | Payment to vendor | For PO or manual vendor charge. |
| **RO** | Received on Account (ROA) | Payment from charge customer or early pay discount. |
| **SA** | Scheduled appointments | |
| **ST** | Sales tax adjustment | |
| **TR** | Transfer sale invoice | **Excluded from Sync** |
| **VC** | Vendor charge | Return to vendor or manual charge. |
| **VR** | Vendor return | Discontinued in 6.0.2. |
| **XX** | Balance Adjustment | Beginning balance or AR journal entry. |

### Improvements (2025-12-23)
- **Invoice Import**: Updated `scripts/tiremaster_sync_client.js` to import **ALL** invoices (removed filters for ZZ-customers and TR invoices).
- **Schema Update**: Added `keymod` field to `Invoice` and `TireMasterSalesOrder` models to track transaction types.
- **Backend Logic**:
  - Updated `LiveSyncService` to save `KEYMOD` from sync payload.
  - Updated `TireMasterService` and `TireMasterController` to support filtering sales orders by `keymod`.
  - Updated `InvoiceController` (Salesperson Reports) to **exclude non-sales keymods** (TR, IC, etc.) by default, ensuring analytics only reflect actual sales.
- **Next Steps**:
  - Frontend needs to be updated to show the `KEYMOD` column and allow filtering.
  - Run the sync client to populate the new data (including previously skipped invoices).

### Frontend Updates (2025-12-23)
- **Invoices List (Integration)**:
  - Added `Type` (KEYMOD) column to the table.
  - Added a filter dropdown with options: "Sales Only" (Default), "All Invoices", "Transfers (TR)", "Inventory Corrections (IC)", "Purchase Orders (PO)".
  - "Sales Only" filters for invoices with empty KEYMOD or specific sales types (CC, NA, GS, FC, ST).
- **Salesperson Report**:
  - Added "Sales Only" toggle switch to the header.
  - Default is ON (filtering out non-sales transactions like transfers).
  - Toggling OFF shows all transactions including transfers, allowing for full data visibility when needed.

### Fixes (2025-12-23) - Part 4
- **Issue**: Backend error `The column 'tire_master_sales_orders.keymod' does not exist in the current database`.
- **Cause**: Added `keymod` to `schema.prisma` but forgot to apply changes to the database.
- **Fix**: Ran `npx prisma db push` to synchronize the database schema with the Prisma schema.

### Fixes (2025-12-23) - Part 5
- **Issue**: Reports and analytics were showing empty data (except for graphs) after enabling "Sales Only" filter.
- **Cause**: The database contains `keymod` values with whitespace (e.g., `'  '`) for normal sales, which were not included in the filter list `('', 'CC', 'NA', ...)`.
- **Fix**: Updated `InvoiceController` and `TireMasterService` to include `'  '` (two spaces) in the "Sales Only" filter condition.

### Analytics Update (2025-12-23)
- **Requirement**: Filter out irrelevant keymods (like Transfers 'TR', Inventory Corrections 'IC') from ALL analytics pages to show "Sales Only".
- **Implementation**:
  - Updated `InvoiceController.getAnalyticsSummary` (Sales Dashboard) to filter by `keymod IN ('', '  ', 'NA', 'GS', 'FC', 'ST')` or `NULL`.
  - Updated `TireAnalyticsService` (Tire Analytics) to apply the same keymod filter.
  - Updated `SalesDataRepository` (General Sales Analytics) to apply the same keymod filter.
  - Updated `InventoryService` (Inventory Velocity) to apply the same keymod filter.
  - Updated `MechanicService` (Mechanic Performance) to apply the same keymod filter.
  - Updated `InvoiceController` report endpoints (`getSalespersonReport`, `getCustomerReport`, `getMonthlyReport`, `getCustomerDetails`) to apply the "Sales Only" filter by default, with an optional `filterKeymods=false` query param to disable it.
  - **Update (2025-12-23)**: Removed `CC` (Credit Card) from the allowed keymods list, treating it as a non-sales transaction per user request.
  - **Update (2025-12-23)**: Updated frontend components (`SalesCharts`, `MechanicAnalytics`, `TireAnalyticsDashboard`) to force 2 decimal places for all currency values, ensuring consistency (e.g., `$10.50` instead of `$10.5`).
  - **Update (2025-12-23)**: Added comma separators to large numbers and currency values in charts and tables (e.g., `$1,234.56` instead of `$1234.56`) for better readability, specifically in `SalesCharts` (Average Order, Y-Axis) and `MechanicAnalytics` (Charts, Table).
  - **Update (2025-12-23)**: Adjusted "Total Revenue" in `SalesCharts` to show 0 decimal places (e.g., `$1,234`) as requested. Ensured tooltips on sales trend graph explicitly use `Number(value).toLocaleString` to guarantee comma formatting.
  - **Update (2025-12-23)**: Made the "Sales Trend" percentage dynamic in `SalesCharts`. It now calculates the growth percentage based on the first and last data points of the displayed period, instead of showing a static "12.5%".
  - **Update (2025-12-23)**: Updated all metric cards in `SalesCharts` (Total Invoices, Total Revenue, Average Order, Profit Margin) to display dynamic trend percentages calculated from the chart data (comparing the last data point to the first data point of the selected period), replacing static placeholder values.
  - **Update (2025-12-23)**: Fixed an issue in `TireMasterCsvParser` where contact names (e.g., "Joseph Garrison") were overwriting company names (e.g., "Generations Transport") during import. Modified the parser to lock the customer name once found for an invoice block and ignore subsequent name-like rows until the invoice is processed.
  - **Update (2025-12-23)**: Updated `scripts/tiremaster_sync_client.js` to include `COMPANY` and `CONTACT` fields in the customer sync query. This ensures that the backend `LiveSyncService` can correctly prioritize the Company Name over the Contact Name (e.g., "Generations Transport" vs "Joseph Garrison") when syncing from the external TireMaster database.
  - **Verification (2025-12-23)**: Confirmed that the `CUSTOMER` table in TireMaster contains `COMPANY` and `CONTACT` columns (referenced from `TireMaster DatabaseTables.pdf` and previous schema checks). The sync logic now correctly prioritizes `COMPANY` > `NAME` > `CONTACT` to resolve the issue where individual names were appearing instead of company names.
  - **Update (2025-12-23)**: Updated `LiveSyncService` to prioritize looking up `InvoiceCustomer` by `customerCode` (TireMaster ID) instead of just `name`. This prevents "double writing" (creating duplicate customers) when a customer's name changes (e.g., from "Joseph" to "Generations Transport"). It now updates the existing customer record's name instead of creating a new one.
  - **Fix (2025-12-23)**: Resolved Prisma unique constraint errors (`P2002`) in `LiveSyncService` caused by customer name collisions. Implemented robust logic to handle name updates:
    - If a name collision occurs with a legacy record (no `customerCode`), the legacy record is merged into the correct one.
    - If a name collision occurs with another valid customer (different `customerCode`), the ID is appended to the name (e.g., "John Smith (101)") to ensure uniqueness.
    - If creating a new customer and the name is taken by a legacy record, the legacy record is claimed and updated with the correct code.
  - **Fix (2025-12-23)**: Fixed `Invalid this.prisma.invoiceCustomer.findUnique() invocation` error in `LiveSyncService`. The `InvoiceCustomer` model uses a named unique constraint (`unique_invoice_customer_name`), so `findUnique` requires the compound selector syntax (`where: { unique_invoice_customer_name: { name: ... } }`) instead of the direct field selector.
  - **Fix (2025-12-23)**: Switched from `findUnique` to `findFirst` for customer name collision checks in `LiveSyncService`. This bypasses the strict type requirements of `findUnique` with named constraints (which was causing TypeScript errors) while still correctly identifying existing records by name.
  - **Refactor (2025-12-23)**: Updated `LiveSyncService` customer update logic to use a "check-then-act" pattern instead of "act-then-catch". This prevents `P2002` (Unique Constraint) errors from being logged to the console, as collisions are now detected and handled gracefully before the update is attempted.
  - **Update (2025-12-23)**: Changed customer name priority in `LiveSyncService` to `NAME > COMPANY > CONTACT` based on user feedback that `NAME` is the correct field to use (verified via inspection of invoice 3-331381).
  - **Update (2025-12-23)**: Updated `LiveSyncService` and `tiremaster_sync_client.js` to use a composite key (`CUCD-SITENO`) for customers. This resolves issues where different store locations for the same customer (same `CUCD` but different `SITENO`) were being merged or overwriting each other.
    - Added `SITENO` to `TireMasterCustomerDto` and `CUCD_S` to `TireMasterInvoiceDto`.
    - Updated sync client to fetch `SITENO` from `CUSTOMER` and `CUCD_S` from `HINVOICE`.
    - Updated backend to construct unique `tireMasterCode` as `${CUCD}-${SITENO}`.
    - Updated invoice sync to look up customers using `${CUCD}-${CUCD_S}`.
  - **Fix (2025-12-23)**: Fixed `ReferenceError: customerCode is not defined` in `LiveSyncService.syncToInvoiceTable`. The `customerCode` variable was being used but not defined in that method scope. Added logic to recalculate `customerCode` from the invoice object.
  - **Fix (2025-12-23)**: Added `SITENO` to `TireMasterCustomerDto` in `backend/src/live-sync/dto/sync-dtos.ts` to resolve TypeScript error `Property 'SITENO' does not exist on type 'TireMasterCustomerDto'`.
  - **Fix (2025-12-23)**: Fixed incorrect property access in `LiveSyncService.syncToInvoiceTable`. Changed `tmCustomer.name` to `tmCustomer.companyName` to correctly retrieve the customer name from the passed Prisma object. This resolves the issue where customers were being saved as "Customer 12345" instead of their actual name.
  - **Update (2025-12-23)**: Adjusted customer name priority in `LiveSyncService` to `COMPANY > NAME > CONTACT`. This ensures that for National Accounts (like UHAUL), the business name in `COMPANY` is used instead of the individual contact name in `NAME`. For customers where `COMPANY` is empty (like Generations Transport), it correctly falls back to `NAME`.
  - **Correction (2025-12-23)**: Reverted customer name priority to `NAME > COMPANY > CONTACT` after user verification showed that the `NAME` field correctly contains the business name (e.g., "UHAUL EMERGENCY ROAD SERVICE") and `COMPANY` is often undefined. The previous issue with incorrect names was likely due to sync failures preventing the update.
  - **Update (2025-12-24)**: Implemented "Import All Data" strategy.
    - Added `metadata` JSON field to `TireMasterSalesOrder`, `TireMasterSalesOrderItem`, `Invoice`, and `InvoiceLineItem` in Prisma schema.
    - Updated `scripts/tiremaster_sync_client.js` to fetch all columns (`SELECT *`) from `HINVOICE` and `TRANS` tables and store the full row object in a `raw_data` field.
    - Updated `LiveSyncService` to save this `raw_data` into the `metadata` column.
    - This allows for future display adjustments using any available source data without requiring a re-import.
  - **Update (2025-12-24)**: Implemented "Import All Data" strategy for Inventory.
    - Added `metadata` JSON field to `TireMasterProduct` and `TireMasterInventory` in Prisma schema.
    - Updated `scripts/tiremaster_inventory_sync_client.js` to fetch all columns (`SELECT *`) from `INV` and `INVLOC`/`INVPRICE` tables and store the full row object in a `raw_data` field.
    - Updated `LiveSyncService` to save this `raw_data` into the `metadata` column.
    - This enables "hot swapping" of inventory data fields (e.g. adding new columns to display) without re-syncing.
  - **Update (2025-12-24)**: Implemented "Import All Data" strategy for Customers.
    - Added `metadata` JSON field to `TireMasterCustomer` in Prisma schema.
    - Updated `scripts/tiremaster_sync_client.js` to fetch all columns (`SELECT *`) from `CUSTOMER` table and store the full row object in a `raw_data` field.
    - Updated `LiveSyncService` to save this `raw_data` into the `metadata` column.
    - This ensures that Invoices, Inventory, and Customers now all support the "hot swap" strategy.
  - **Fix (2025-12-24)**: Addressed "quiet failure" of sync client.
    - Reduced `batchSize` from 2000 to 500 in `tiremaster_sync_client.js` to prevent payload size issues with `SELECT *`.
    - Added `maxBodyLength: Infinity` and `maxContentLength: Infinity` to Axios configuration in `tiremaster_sync_client.js`.
    - Added global `unhandledRejection` and `uncaughtException` handlers to both sync clients to log crashes.
  - **Fix (2025-12-24)**: Fixed `BadRequestException` (Validation Error) in sync clients.
    - The backend's `ValidationPipe` with `forbidNonWhitelisted: true` was rejecting payloads because `SELECT *` included columns not defined in the DTOs.
    - Updated `tiremaster_sync_client.js` and `tiremaster_inventory_sync_client.js` to filter the root object to only include allowed DTO fields.
    - The full raw data is still preserved in the `raw_data` field (which is allowed in the DTO), ensuring the "hot swap" capability works without validation errors.
  - **Fix (2025-12-24)**: Fixed missing data in Sales Dashboard.
    - The dashboard filters invoices by `keymod`. Invoices with `keymod = 'CC'` (Credit Card?) were being excluded.
    - Updated `backend/src/controllers/invoice.controller.ts` to include `'CC'` in all keymod filters (analytics, reports, etc.).
  - **Performance (2025-12-24)**: Restored sync client performance.
    - Increased `batchSize` back to 2000 and `concurrency` to 5 in both `tiremaster_sync_client.js` and `tiremaster_inventory_sync_client.js`.
  - **Enhancement (2025-12-26)**: Mirrored Tire Master data on Sales Dashboard.
    - Updated `backend/src/controllers/invoice.controller.ts` to return `siteNo` and `keymod` in `getInvoices`.
    - Added `keymod` filtering support to `getInvoices` endpoint.
    - Updated `frontend/src/app/dashboard/sales/reports/page.tsx` to display `Site #` and `Type` columns.
    - Added Keymod filter dropdown (Sales Only, All, TR, IC, PO) to Sales Reports page to match Tire Master functionality.
672.     - **Update**: Excluded 'CC' (Credit Card) keymod from "Sales Only" filter in `InvoiceController` to prevent internal accounts like 'ZZ-VISA/MASTERCARD' from appearing in sales analytics and top customer lists.
  - **Fix (2025-12-26)**: Fixed missing data on Sales Dashboard.
    - Identified that historical `TireMasterSalesOrder` records were not synced to the `Invoice` table and lacked `metadata` (raw DTO).
    - Created `backend/rehydrate-invoices.js` to rehydrate `Invoice` and `InvoiceLineItem` tables from `TireMasterSalesOrder` entities, mapping fields directly and handling customer name collisions.
    - Rehydrated ~1900 recent invoices (Dec 2025) to populate the dashboard immediately.
    - **Update (2025-12-26)**: Started full-year rehydration (approx. 69,000 records) in background.
      - Optimized script to skip already processed records (offset 7600) to resume progress.
      - Increased batch size to 1000 (from 200) to speed up processing.
      - **Fix**: Handled `Unique constraint failed on the fields: ('name')` error by finding the existing customer if creation fails.
      - **Retry**: Restarted script to scan all records (skipping existing ones) to catch any missed invoices due to previous errors.
      - **Fix (Profit Calculation)**: Identified that `COST` was missing from `TireMasterSalesOrderItem` metadata, causing 100% profit.
        - Updated `scripts/tiremaster_sync_client.js` to fetch cost fields (`NEXTCOST`, `LASTCOST`, `EDL`, `DBILL`) from Inventory and handle case-insensitive `TRANS` columns.
        - Updated `LiveSyncService.ts` and `rehydrate-invoices.js` to fallback to Product Cost (from metadata) if Transaction Cost is missing.
        - Updated `rehydrate-invoices.js` to re-process invoices with suspicious profit (100% profit).
        - Restarted rehydration script to fix existing invoices.
      - Log file: `backend/rehydrate.log`.
  - **Fix (2025-12-23)**: Fixed `[odbc] Error executing the sql statement` in `scripts/tiremaster_sync_client.js` by quoting `CUCD` values in the SQL `IN` clause. This handles cases where customer codes might be treated as strings or contain non-numeric characters.
  - **Fix (2025-12-23)**: Fixed `p.PARTNO.replace is not a function` error in `scripts/tiremaster_sync_client.js` by explicitly casting `PARTNO` to a string before calling `.replace()`. This resolves the crash during inventory quantity sync.
  - **Update (2025-12-23)**: Successfully updated `scripts/tiremaster_sync_client.js` to include `CUCD_S` in all invoice queries (`invoiceSyncQuery` and initial fetch). This ensures the backend receives the necessary data to link invoices to the correct customer store location.
  - **Update (2025-12-26)**: Updated `scripts/tiremaster_sync_client.js` to limit sync to December 2025 (`startDate: '2025-12-01'`) for faster testing as requested.
- **Result**: All dashboards and reports now consistently reflect only actual sales transactions, excluding internal transfers and adjustments.

### Sync Client Optimization (2025-12-26)
- **Issue**: `tiremaster_sync_client.js` was silently freezing during "Syncing ALL Customers" step.
- **Cause**: The script was attempting to fetch all columns (`SELECT *`) for 2000 customers in parallel batches of 5, overwhelming the ODBC driver or database connection.
- **Fix**: 
  - Reduced `batchSize` from 2000 to 500.
  - Reduced `concurrency` from 5 to 1.
  - Added a 60-second timeout to the ODBC query execution to prevent indefinite hanging.
  - Added explicit logging ("Starting fetch for...") before the query to identify exactly where it hangs.
  - **Fix (2025-12-26)**: Fixed missing data on Sales Dashboard after sync.
    - Identified that `tiremaster_sync_client.js` populates `TireMasterSalesOrder` but not `Invoice` table directly (rehydration required).
    - Ran `backend/rehydrate-invoices.js` for December 2025 (approx. 4800 records).
    - Verified `Invoice` count increased from 0 to ~4800.
    - Verified data is now available for the Sales Dashboard.

- **Master Sync Script**: Created `scripts/master-sync.js` to orchestrate Inventory Sync, Invoice/Customer Sync, and Data Rehydration in a single process.
  - Runs `scripts/tiremaster_inventory_sync_client.js` (Inventory)
  - Runs `scripts/tiremaster_sync_client.js` (Invoices/Customers - with caching and 2025-01-01 start date)
  - Runs `backend/rehydrate-invoices.js` (Hydration - with batching and skipping existing)
  - Ensures logical order and error handling.
- **Sync CLI**: Moved to `scripts/sync-cli.js` to orchestrate the sync process.
  - Supports Full Sync, Inventory Only, Invoice Only, and Rehydrate Only.
  - Allows specifying a start date for Invoice Sync and Rehydration.
  - Usage: `node scripts/sync-cli.js`

### Performance Tuning (2025-12-26)
- **Requirement**: "Process multiple batches at one time" and "process as quick as possible".
- **Sync Client**:
  - Increased `batchSize` to 1000 (from 500).
  - Increased `concurrency` to 5 (from 1).
  - This restores parallel processing for faster data fetching.
- **Rehydration Script**:
  - Implemented parallel processing within each batch using `p-limit` (concurrency: 20).
  - Previously processed 1000 items sequentially, which was slow.
  - Now processes 20 items concurrently, significantly speeding up the hydration phase.


- **Frontend Enhancements**:
  - Added pagination to "Recent Invoices" list on Salesperson Report page (`frontend/src/app/dashboard/sales/reports/salesperson/[name]/page.tsx`).
  - Added pagination to "Recent Invoices" list on Customer Report page (`frontend/src/app/dashboard/sales/reports/customer/[id]/page.tsx`).
  - Updated `backend/src/controllers/invoice.controller.ts` to support pagination in `getSalespersonDetails` and `getCustomerDetails`.

### Frontend Fixes (2025-12-26)
- **Graph Scaling**:
  - Fixed Y-axis scaling issue on Sales Dashboard (`SalesCharts`), Salesperson Report, and Customer Report charts.
  - Set `domain={[0, 'auto']}` and `padding={{ top: 20 }}` to prevent lines from exceeding the graph area.
- **Pagination**:
  - Verified and ensured pagination controls are present and working on:
    - Salesperson Report Page (`Recent Invoices` table).
    - Customer Report Page (`Recent Invoices` table).
    - Salesperson Commissions Page (`Reconciliation` table).
- **Build Fix**:
  - Cleared Next.js cache (`rm -rf .next`) to resolve `Cannot find module` build error.

- **Insights Page Fix**:
  - Identified that `InsightsService` was filtering tires by `quality IN ('PREMIUM', 'STANDARD', 'ECONOMY')`.
  - Since all imported tires have `quality: 'UNKNOWN'`, this filter was excluding all data.
  - Removed the strict quality filter in `getInventoryRiskAnalysis` and `getDeadStock` to allow all tires to be analyzed.
  - Verified that `invoice_line_items` are correctly linked to `tire_master_products`.

## Final Status (2025-12-26)
- **Insights Page**: Fixed. Now correctly displays tire data, brands, and types.
  - Issue was related to `isTire` inference and bind variable limits in `InsightsService`.
  - Fixed by chunking queries in `InsightsService` to avoid PostgreSQL bind variable limits (32767).
  - Fixed `isTire` logic to correctly identify tires based on `TireMasterProduct` fields.
- **Sync Process**: Unified and optimized.
  - Created `scripts/master-sync.js` to orchestrate Inventory Sync, Invoice/Customer Sync, and Data Rehydration.
  - Created `scripts/sync-cli.js` for easy command-line execution with date parameters.
  - Optimized `tiremaster_sync_client.js` and `tiremaster_inventory_sync_client.js` for performance and correct data fetching.
  - `rehydrate-invoices.js` updated to handle profit calculations and customer creation collisions.
- **Sales Dashboard**:
  - Fixed graph Y-axis scaling.
  - Added pagination to Salesperson and Customer report pages.
  - Fixed "Recent Invoices" display.
- **Frontend**:
  - Fixed build errors related to caching.

## Key Scripts
- `scripts/master-sync.js`: Runs the full sync pipeline.
- `scripts/sync-cli.js`: CLI tool for running syncs (e.g., `node scripts/sync-cli.js --date 2025-01-01`).
- `backend/rehydrate-invoices.js`: Rehydrates invoice data from raw JSON to relational tables.

## Recent Fixes
- **InsightsService**: Implemented `chunkArray` helper to split large arrays of IDs when querying the database, preventing "bind message has too many parameters" errors.
- **InvoiceController**: Added pagination and keymod filtering (excluding 'CC' for top customers).
- **TireMaster Sync**: Updated to fetch necessary cost fields and handle case-sensitivity for column names.

- **Inventory Analytics Page Fix**:
  - Fixed `InventoryService.getSalesAnalytics` bind variable limit issue by chunking queries.
  - This resolves the issue where the "Tires" page (Inventory Analytics) was not showing data or failing for large datasets.
  - Verified `InventoryService.getInventory` works correctly with simulation script.

## Next Steps
- Monitor the automated sync to ensure stability over time.

### Tire Inventory & Analytics Fixes (2025-12-26)
- **Issue**: "Tires" page (Inventory) and "Tire Analytics" page were showing no data.
- **Cause 1 (Inventory)**: `TireMasterInventory` component was using mock location IDs (`loc-001`) which didn't match real database UUIDs.
- **Cause 2 (Analytics)**: `TireAnalyticsService` was strictly filtering by `quality IN ('PREMIUM', 'STANDARD', 'ECONOMY')`, excluding all imported tires which defaulted to `UNKNOWN`.
- **Fixes**:
  - **Frontend**: Updated `TireMasterInventory` component to fetch real locations from `/api/v1/inventory/locations` instead of using mock data.
  - **Classification**: Ran `backend/run-classification.js` to classify 14,296 products, identifying 11,317 tires and assigning qualities.
  - **Backend**: Updated `TireAnalyticsService` to remove the hardcoded quality filter, allowing `UNKNOWN` quality tires to be displayed in analytics.
- **Verification**:
  - Verified `InventoryService.getInventory` returns tires correctly with `isTire=true`.
  - Verified `TireMasterInventory` component now fetches real locations.
  - Verified classification script updated database records.

