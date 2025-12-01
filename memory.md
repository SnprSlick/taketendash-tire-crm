# Project Memory

## Recent Sessions Summary

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

## Next Steps