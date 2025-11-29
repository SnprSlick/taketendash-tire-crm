# Business Insights Feature Plan

## Goal
Create a "Business Insights" module that analyzes existing sales, inventory, and service data to provide actionable suggestions for improving inventory management, hiring decisions, and gross margins.

## Proposed Metrics & Insights

### 1. Inventory Optimization (Tires)
**Problem:** Knowing when to order and managing cash flow tied to stock.

*   **Metric: Velocity-Based Reorder Point**
    *   **Data Source:** `InvoiceLineItem` (Sales History), `TireMasterInventory` (Current Stock).
    *   **Logic:** Calculate average daily sales velocity (30/90 day windows).
    *   **Insight:** "Restock Alert: [Product] at [Store] will run out in ~5 days based on current velocity of [X]/day."
*   **Metric: Dead Stock / Slow Movers**
    *   **Data Source:** `TireMasterInventory` vs `InvoiceLineItem`.
    *   **Logic:** Identify items with `Quantity > 4` but `0 Sales` in the last 90 days.
    *   **Insight:** "Capital Alert: $[Value] is tied up in [Product] which hasn't sold in 3 months. Consider a promotion or transfer to another store."
*   **Metric: GMROI (Gross Margin Return on Investment)**
    *   **Data Source:** `InvoiceLineItem` (Profit) / `TireMasterInventory` (Avg Inventory Value).
    *   **Logic:** `(Gross Profit) / (Avg Inventory Cost)`.
    *   **Insight:** "High Performer: [Brand] tires are generating $2.50 profit for every $1 invested in inventory."

### 2. Workforce Planning (Hiring)
**Problem:** Knowing when to hire to meet demand without overstaffing.

*   **Metric: Technician Utilization Rate**
    *   **Data Source:** `ServiceRecord` (`laborHours`) vs Standard Work Week (40h).
    *   **Logic:** `Sum(LaborHours) / (Active Techs * 40h)`.
    *   **Insight:** "Hiring Signal: Technician utilization at [Store] has exceeded 90% for 4 consecutive weeks. Capacity is strained."
*   **Metric: Revenue Per Employee (RPE)**
    *   **Data Source:** `Invoice` (`grossProfit`) / `Employee` count.
    *   **Logic:** Track trend of GP generated per FTE (Full Time Equivalent).
    *   **Insight:** "Efficiency Drop: Revenue per employee dropped 15% this month despite stable sales. Check for overstaffing or scheduling inefficiencies."

### 3. Profitability & Margin Improvement
**Problem:** Maximizing profit, not just revenue.

*   **Metric: Margin Leakage Detection**
    *   **Data Source:** `InvoiceLineItem` (`grossProfitMargin`).
    *   **Logic:** Flag transactions or categories where Margin < Target (e.g., Tires < 15%, Service < 60%).
    *   **Insight:** "Margin Alert: [Category] margins at [Store] dropped to [X]% (Target: [Y]%). Investigate supplier cost changes or discounting behavior."
*   **Metric: Service Attachment Rate (Upsell)**
    *   **Data Source:** `Invoice` (containing Tires) vs `InvoiceLineItem` (containing Alignments/Road Hazard).
    *   **Logic:** `% of Tire Invoices that include an Alignment`.
    *   **Insight:** "Opportunity: Only 35% of tire customers at [Store] bought an alignment. Increasing to 50% adds $[Amount] monthly profit."

## Implementation Strategy
1.  **Backend:** Create an `InsightsService` that runs these calculations on-demand (or cached daily).
2.  **Frontend:** Create an `InsightsDashboard` with cards for "Urgent Actions" (Restock, Margin Alerts) and "Strategic Trends" (Hiring, GMROI).
