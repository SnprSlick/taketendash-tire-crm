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
