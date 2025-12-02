import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  // --- Inventory Insights ---

  async getInventoryRiskAnalysis(storeId?: string, outlookDays: number = 30, daysOutOfStockThreshold: number = 0) {
    const lookbackDays = 180;
    
    // Build store filter for main query and CTEs
    let storeFilter = Prisma.sql``;
    let invoiceStoreFilter = Prisma.sql``;
    let inventoryStoreFilter = Prisma.sql``;
    
    if (storeId) {
      storeFilter = Prisma.sql`AND inv.store_id = ${storeId}`;
      invoiceStoreFilter = Prisma.sql`AND i.store_id = ${storeId}`;
      inventoryStoreFilter = Prisma.sql`AND s.id = ${storeId}`;
    }

    // Query to get product inventory and sales velocity
    const inventoryData = await this.prisma.$queryRaw<Array<{
      productId: string;
      productName: string;
      brand: string;
      pattern: string;
      size: string;
      type: string;
      sku: string;
      manufacturerCode: string;
      storeId: string;
      storeName: string;
      quantity: number;
      soldLast90Days: number;
      dailyVelocity: number;
      lastSaleDate: Date | null;
      soldInLast90Days: number;
    }>>`
      WITH Inventory AS (
        SELECT
          tmi."productId" as product_id,
          s.id as store_id,
          s.name as store_name,
          tmi."availableQty" as quantity
        FROM "tire_master_inventory" tmi
        JOIN "tire_master_locations" tml ON tmi."locationId" = tml.id
        JOIN "stores" s ON tml."tireMasterCode" = s.code
        WHERE 1=1 ${inventoryStoreFilter}
      ),
      LastSales AS (
        SELECT
          ili."tire_master_product_id" as product_id,
          i."store_id",
          MAX(i."invoice_date") as last_sale_date
        FROM "invoice_line_items" ili
        JOIN "invoices" i ON ili."invoice_id" = i.id
        WHERE i."invoice_date" >= NOW() - INTERVAL '365 days'
        ${invoiceStoreFilter}
        GROUP BY ili."tire_master_product_id", i."store_id"
      ),
      Sales180 AS (
        SELECT
          ili."tire_master_product_id" as product_id,
          i."store_id",
          SUM(ili.quantity) as total_sold_180
        FROM "invoice_line_items" ili
        JOIN "invoices" i ON ili."invoice_id" = i.id
        WHERE i."invoice_date" >= NOW() - INTERVAL '180 days'
        ${invoiceStoreFilter}
        GROUP BY ili."tire_master_product_id", i."store_id"
      ),
      SalesPrior AS (
        SELECT
          ls.product_id,
          ls.store_id,
          SUM(ili.quantity) as sold_90_days_prior
        FROM LastSales ls
        JOIN "invoices" i ON i.store_id = ls.store_id
        JOIN "invoice_line_items" ili ON ili.invoice_id = i.id AND ili.tire_master_product_id = ls.product_id
        WHERE i.invoice_date >= ls.last_sale_date - INTERVAL '90 days'
        AND i.invoice_date <= ls.last_sale_date
        GROUP BY ls.product_id, ls.store_id
      )
      SELECT
        p.id as "productId",
        COALESCE(p.description, CONCAT(p.brand, ' ', p.pattern, ' ', p.size)) as "productName",
        p.brand,
        p.pattern,
        p.size,
        p.type,
        p."tireMasterSku" as sku,
        p."manufacturer_code" as "manufacturerCode",
        inv.store_id as "storeId",
        inv.store_name as "storeName",
        inv.quantity,
        COALESCE(s180.total_sold_180, 0) as "soldLast90Days",
        COALESCE(s180.total_sold_180, 0) / 180.0 as "dailyVelocity",
        ls.last_sale_date as "lastSaleDate",
        COALESCE(sp.sold_90_days_prior, 0) as "soldInLast90Days"
      FROM "tire_master_products" p
      JOIN Inventory inv ON p.id = inv.product_id
      LEFT JOIN LastSales ls ON p.id = ls.product_id AND inv.store_id = ls.store_id
      LEFT JOIN Sales180 s180 ON p.id = s180.product_id AND inv.store_id = s180.store_id
      LEFT JOIN SalesPrior sp ON p.id = sp.product_id AND inv.store_id = sp.store_id
      WHERE p."isTire" = true
      AND p.quality IN ('PREMIUM', 'STANDARD', 'ECONOMY')
    `;

    // Fetch avg quantities for min stock calculation
    const productIds = inventoryData.map(i => i.productId);
    const avgQuantities = productIds.length > 0 ? await this.prisma.$queryRaw<Array<{ productId: string; avgQty: number }>>`
      SELECT 
        ili."tire_master_product_id" as "productId",
        AVG(ili.quantity) as "avgQty"
      FROM "invoice_line_items" ili
      WHERE ili."tire_master_product_id" IN (${Prisma.join(productIds)})
      GROUP BY ili."tire_master_product_id"
    ` : [];
    
    const avgQtyMap = new Map<string, number>();
    avgQuantities.forEach(q => avgQtyMap.set(q.productId, Number(q.avgQty)));

    const getRoundedInstallQty = (qty: number) => {
      if (qty < 2) return 2;
      if (qty > 8) return 10;
      if (qty > 6) return 8;
      if (qty > 2) return 4;
      return 2;
    };

    // Process data to calculate risk and suggestions
    const analysis = inventoryData.map(item => {
      const dailyVelocity = Number(item.dailyVelocity);
      const quantity = Number(item.quantity);
      const daysOfSupply = dailyVelocity > 0 ? quantity / dailyVelocity : (quantity > 0 ? 999 : 0);
      
      let status = 'OK';
      let suggestion = '';
      let suggestedOrder = 0;

      // Calculate days out of stock if quantity is 0
      let daysOutOfStock = 0;
      if (quantity <= 0 && item.lastSaleDate) {
        const lastSale = new Date(item.lastSaleDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastSale.getTime());
        daysOutOfStock = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Calculate Min Stock Level
      const rawAvgQty = avgQtyMap.get(item.productId) || 
        (item.type === 'PASSENGER' || item.type === 'LIGHT_TRUCK' ? 4 : 2);
      const minStockLevel = getRoundedInstallQty(rawAvgQty);

      // Risk Logic
      if (dailyVelocity > 0) {
        const neededVelocity = Math.ceil(dailyVelocity * outlookDays);
        const targetInventory = Math.max(neededVelocity, minStockLevel);
        
        if (quantity < targetInventory) {
          suggestedOrder = targetInventory - quantity;
          
          // Ensure we don't suggest tiny orders unless it's critical?
          // User said: "If the restock is 1 or less ignore"
          if (suggestedOrder <= 1) {
            suggestedOrder = 0;
          } else {
            if (quantity <= 0) status = 'Out of Stock';
            else status = 'Low Stock';
            suggestion = `Order ${suggestedOrder} units (Target: ${targetInventory}, Min: ${minStockLevel})`;
          }
        }
      }
      
      if (status === 'OK' && daysOfSupply > 180 && quantity > 4) { // Threshold for overstock
        status = 'Overstock';
        suggestion = 'Consider transfer or promotion';
      }

      return {
        ...item,
        dailyVelocity,
        quantity,
        currentStock: quantity,
        daysOfSupply,
        status,
        suggestion,
        suggestedOrder,
        daysOutOfStock,
        soldInLast90Days: Number(item.soldInLast90Days),
        minStockLevel
      };
    });

    // Filter by days out of stock if threshold provided
    if (daysOutOfStockThreshold > 0) {
      // Return items that are OOS within threshold OR items that are Low Stock (about to go out)
      // For OOS items, ensure they have been sold recently (daysOutOfStock > 0 implies a lastSaleDate exists)
      const filtered = analysis.filter(item => 
        (item.quantity <= 0 && item.daysOutOfStock < daysOutOfStockThreshold && item.daysOutOfStock > 0 && item.suggestedOrder > 1) ||
        (item.quantity > 0 && item.status === 'Low Stock' && item.suggestedOrder > 1)
      );

      // Sort by suggestedOrder DESC
      return filtered.sort((a, b) => b.suggestedOrder - a.suggestedOrder);
    }

    return analysis;
  }

  async getCrossStoreTransfers(storeId?: string) {
    const getRoundedInstallQty = (qty: number) => {
      if (qty < 2) return 2;
      if (qty > 8) return 10;
      if (qty > 6) return 8;
      if (qty > 2) return 4;
      return 2;
    };

    // Get inventory analysis for ALL stores
    const allInventory = await this.getInventoryRiskAnalysis(undefined, 30);
    
    // Get average install quantity per product (Global)
    const productIds = Array.from(new Set(allInventory.map(i => i.productId)));
    
    // Fetch average install quantity
    // We use a raw query to aggregate across all invoices
    const avgQuantities = productIds.length > 0 ? await this.prisma.$queryRaw<Array<{ productId: string; avgQty: number }>>`
      SELECT 
        ili."tire_master_product_id" as "productId",
        AVG(ili.quantity) as "avgQty"
      FROM "invoice_line_items" ili
      WHERE ili."tire_master_product_id" IN (${Prisma.join(productIds)})
      GROUP BY ili."tire_master_product_id"
    ` : [];
    
    const avgQtyMap = new Map<string, number>();
    avgQuantities.forEach(q => avgQtyMap.set(q.productId, Number(q.avgQty)));

    // Group by product
    const productMap = new Map<string, typeof allInventory>();
    allInventory.forEach(item => {
      if (!productMap.has(item.productId)) {
        productMap.set(item.productId, []);
      }
      productMap.get(item.productId)?.push(item);
    });

    const transfers: any[] = [];
    const candidateTransfers: any[] = [];

    productMap.forEach((items, productId) => {
      // Source candidates: Must have at least 8 units (initial filter, refined later by minStock)
      const sources = items.filter(i => i.quantity >= 8);
      
      // Target candidates: Must be Low Stock AND have sales velocity (historically sold well)
      const targets = items.filter(i => i.status === 'Low Stock' && i.dailyVelocity > 0);

      if (sources.length > 0 && targets.length > 0) {
        // Match them up
        targets.forEach(target => {
          // If specific store requested, only show transfers TO that store
          if (storeId && target.storeId !== storeId) return;

          sources.forEach(source => {
            if (source.storeId === target.storeId) return; 

            // Rule: Move from Low Velocity to High Velocity (or if Source is Overstocked)
            // If Source sells faster than Target, only move if Source has > 90 days supply
            if (source.dailyVelocity > target.dailyVelocity && source.daysOfSupply < 90) {
              return;
            }

            // Calculate Minimum Stock Level based on average install quantity
            // Default to 4 for Passenger/LT, 2 for others if no history
            const rawAvgQty = avgQtyMap.get(source.productId) || 
              (source.type === 'PASSENGER' || source.type === 'LIGHT_TRUCK' ? 4 : 2);
            
            const avgInstallQty = getRoundedInstallQty(rawAvgQty);
            const minStockLevel = avgInstallQty;

            // Calculate how much source can spare
            // Must keep: Max(60 days supply, minStockLevel)
            const sourceNeedsVelocity = Math.ceil(source.dailyVelocity * 60);
            const sourceNeeds = Math.max(sourceNeedsVelocity, minStockLevel);
            
            const sourceExcess = source.quantity - sourceNeeds;

            // We only transfer if source has excess
            if (sourceExcess <= 0) return;

            let transferAmount = Math.min(
              sourceExcess,
              target.suggestedOrder
            );

            // Logic: Move in sets of 2 OR to achieve even inventory
            if (source.quantity % 2 !== 0 && target.quantity % 2 !== 0) {
              // Both Odd -> Move Odd amount to make both Even
              if (transferAmount % 2 === 0) {
                transferAmount -= 1;
              }
            } else {
              // Otherwise -> Move Even amount (sets of 2)
              if (transferAmount % 2 !== 0) {
                transferAmount -= 1;
              }
            }

            // Final Threshold: A move under 4 should never be suggested
            if (transferAmount >= 4) {
              candidateTransfers.push({
                target,
                source,
                transferAmount,
                items,
                minStockLevel // Pass for info
              });
            }
          });
        });
      }
    });

    // Enrich candidates with history
    for (const candidate of candidateTransfers) {
      const { target, source, transferAmount, items, minStockLevel } = candidate;
      
      // Fetch 180 day history for source and target
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

      const [sourceHistory, targetHistory] = await Promise.all([
        this.prisma.$queryRaw<Array<{ date: Date; quantity: number }>>`
          SELECT i.invoice_date as date, SUM(ili.quantity) as quantity
          FROM invoice_line_items ili
          JOIN invoices i ON ili.invoice_id = i.id
          WHERE ili.tire_master_product_id = ${target.productId}
          AND i.store_id = ${source.storeId}
          AND i.invoice_date >= ${sixMonthsAgo}
          GROUP BY i.invoice_date
          ORDER BY i.invoice_date ASC
        `,
        this.prisma.$queryRaw<Array<{ date: Date; quantity: number }>>`
          SELECT i.invoice_date as date, SUM(ili.quantity) as quantity
          FROM invoice_line_items ili
          JOIN invoices i ON ili.invoice_id = i.id
          WHERE ili.tire_master_product_id = ${target.productId}
          AND i.store_id = ${target.storeId}
          AND i.invoice_date >= ${sixMonthsAgo}
          GROUP BY i.invoice_date
          ORDER BY i.invoice_date ASC
        `
      ]);

      const formatHistory = (data: Array<{ date: Date; quantity: number }>) => {
        const historyMap = new Map<string, number>();
        // Initialize last 180 days with 0
        for (let i = 0; i < 180; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          historyMap.set(d.toISOString().split('T')[0], 0);
        }
        
        data.forEach(item => {
          const date = new Date(item.date).toISOString().split('T')[0];
          if (historyMap.has(date)) {
            historyMap.set(date, Number(item.quantity));
          }
        });

        return Array.from(historyMap.entries())
          .map(([date, quantity]) => ({ date, quantity }))
          .sort((a, b) => a.date.localeCompare(b.date));
      };

      const sourceHistoryFormatted = formatHistory(sourceHistory);
      const targetHistoryFormatted = formatHistory(targetHistory);

      // Calculate 60-day velocity for confidence scoring
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

      const get60DayQty = (history: { date: string; quantity: number }[]) => {
        return history
          .filter(h => h.date >= sixtyDaysAgoStr)
          .reduce((sum, h) => sum + h.quantity, 0);
      };

      const source60DayQty = get60DayQty(sourceHistoryFormatted);
      const target60DayQty = get60DayQty(targetHistoryFormatted);

      // Daily velocity over last 60 days
      const source60DayDailyVelocity = source60DayQty / 60;
      const target60DayDailyVelocity = target60DayQty / 60;
      
      const velocityDiff = target60DayDailyVelocity - source60DayDailyVelocity;
      
      // Confidence Score: 0.6 diff = 100%
      let confidenceScore = Math.min((velocityDiff / 0.6) * 100, 100);

      // 30-Day Outlook & Precedence Logic
      // Calculate Days of Supply after transfer using 180-day velocity (source.dailyVelocity)
      const sourceDaysAfter = source.dailyVelocity > 0 
        ? (source.quantity - transferAmount) / source.dailyVelocity 
        : 999;

      const targetDaysAfter = target.dailyVelocity > 0
        ? (target.quantity + transferAmount) / target.dailyVelocity
        : 999;

      // If Source drops below 35 days (Critical Zone)
      if (sourceDaysAfter < 35) {
        // If Source is faster than Target, Source keeps precedence -> Kill transfer
        if (source.dailyVelocity > target.dailyVelocity) {
          confidenceScore = 0;
        }
      }

      // If Source drops below 30 days (Hard Floor), apply penalty even if Target is faster
      // "Guarantees at least a 30 day outlook"
      if (sourceDaysAfter < 30) {
         confidenceScore *= 0.5;
      }
      
      let confidenceLevel = 'Low';
      if (confidenceScore >= 80) confidenceLevel = 'High';
      else if (confidenceScore >= 50) confidenceLevel = 'Medium';

      transfers.push({
        productId: target.productId,
        productName: target.productName,
        sku: target.sku,
        manufacturerCode: target.manufacturerCode,
        brand: target.brand,
        pattern: target.pattern,
        size: target.size,
        sourceStoreId: source.storeId,
        sourceStoreName: source.storeName,
        targetStoreId: target.storeId,
        targetStoreName: target.storeName,
        quantity: transferAmount,
        sourceVelocity: source.dailyVelocity,
        targetVelocity: target.dailyVelocity,
        sourceHistory: sourceHistoryFormatted,
        targetHistory: targetHistoryFormatted,
        confidenceLevel,
        confidenceScore: Number(confidenceScore.toFixed(0)),
        velocityDiff: Number(velocityDiff.toFixed(2)),
        sourceDaysOfSupply: Number(source.daysOfSupply.toFixed(1)),
        targetDaysOfSupply: Number(target.daysOfSupply.toFixed(1)),
        sourceDaysAfterTransfer: Number(sourceDaysAfter.toFixed(1)),
        targetDaysAfterTransfer: Number(targetDaysAfter.toFixed(1)),
        avgInstallQty: getRoundedInstallQty(avgQtyMap.get(target.productId) || (target.type === 'PASSENGER' || target.type === 'LIGHT_TRUCK' ? 4 : 2)),
        reason: `Transfer ${transferAmount} units from ${source.storeName} to ${target.storeName}. ${target.storeName} sells ${velocityDiff.toFixed(2)} more units/day (60-day avg) than ${source.storeName}. Min stock level: ${minStockLevel}.`,
        allStoresInventory: items.map((i: any) => ({
          storeName: i.storeName,
          quantity: i.quantity,
          status: i.status
        })).sort((a: any, b: any) => b.quantity - a.quantity)
      });
    }

    return transfers.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  async getDeadStock(storeId?: string) {
    // Items with Quantity > 4 but 0 Sales in last 90 days
    const days = 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. Get all inventory with quantity > 4
    let locationId: string | undefined;
    if (storeId) {
      const store = await this.prisma.store.findUnique({ where: { id: storeId } });
      if (store) {
        const loc = await this.prisma.tireMasterLocation.findUnique({ where: { tireMasterCode: store.code } });
        locationId = loc?.id;
      }
    }

    const inventory = await this.prisma.tireMasterInventory.findMany({
      where: {
        quantity: { gt: 4 },
        product: {
          isTire: true,
          quality: { not: 'UNKNOWN' }
        },
        ...(locationId ? { locationId } : {})
      },
      include: {
        product: true,
        location: true
      }
    });

    if (inventory.length === 0) return [];

    const productIds = inventory.map(i => i.productId);

    // 2. Check sales for these products in the last 90 days
    let storeFilter = Prisma.sql``;
    if (storeId) {
      storeFilter = Prisma.sql`AND i.store_id = ${storeId}`;
    }

    const sales = await this.prisma.$queryRaw<Array<{ productId: string }>>`
      SELECT DISTINCT ili."tire_master_product_id" as "productId"
      FROM "invoice_line_items" ili
      JOIN "invoices" i ON ili."invoice_id" = i.id
      WHERE i."invoice_date" >= ${startDate}
      AND i."status" = 'ACTIVE'
      AND ili."tire_master_product_id" IN (${Prisma.join(productIds)})
      ${storeFilter}
    `;

    const soldProductIds = new Set(sales.map(s => s.productId));

    // 3. Filter inventory that has NO sales
    const deadStock = inventory
      .filter(inv => !soldProductIds.has(inv.productId))
      .map(inv => ({
        type: 'DEAD_STOCK',
        productId: inv.productId,
        productName: inv.product.description || `${inv.product.brand} ${inv.product.pattern} ${inv.product.size}`,
        sku: inv.product.tireMasterSku,
        manufacturerCode: inv.product.manufacturerCode,
        brand: inv.product.brand,
        storeName: inv.location.name,
        quantity: inv.quantity,
        value: Number(inv.product.laborPrice || 0) * inv.quantity, 
        message: `Dead Stock: ${inv.quantity} units of ${inv.product.description} haven't sold in 90 days.`
      }));

    return deadStock.sort((a, b) => b.value - a.value);
  }

  // --- Workforce Insights ---

  async getTechnicianUtilization(storeId?: string) {
    // Utilization = Billed Hours / (Active Techs * 40h/week)
    const weeks = 4;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));

    // 1. Get Active Technicians count per store (or specific store)
    const whereEmployee: Prisma.EmployeeWhereInput = {
      isMechanic: true,
      status: 'ACTIVE'
    };
    
    if (storeId) {
      whereEmployee.stores = { some: { id: storeId } };
    }

    const technicians = await this.prisma.employee.findMany({
      where: whereEmployee,
      include: { stores: true }
    });

    const techCount = technicians.length;
    if (techCount === 0) return { utilization: 0, message: 'No active technicians found.' };

    // Create a list of mechanic names to filter labor
    const techNames = technicians.map(t => `${t.firstName} ${t.lastName}`.toUpperCase());

    // 2. Get Labor Records from MechanicLabor table
    let storeFilter = Prisma.sql``;
    if (storeId) {
      storeFilter = Prisma.sql`AND i.store_id = ${storeId}`;
    }

    const laborRecords = await this.prisma.$queryRaw<Array<{ category: string; quantity: number; labor: number }>>`
      SELECT ml.category, ml.quantity, ml.labor
      FROM "mechanic_labor" ml
      JOIN "invoices" i ON ml.invoice_number = i.invoice_number
      WHERE i.invoice_date >= ${startDate}
      AND i.status = 'ACTIVE'
      ${storeFilter}
      AND ml.mechanic_name IN (${Prisma.join(techNames)})
    `;

    // Calculate Billed Hours
    // Logic:
    // - For known "Hourly" categories, use quantity as hours.
    // - For others, use Labor Revenue / $50 (Assumed Rate) to estimate hours.
    
    const HOURLY_CATEGORIES = [
      'MTPL Medium Truck-Repairs/Labor',
      'SRVT Service Truck',
      'LUBL Lube Parts/Labor',
      'LSTR LABOR-TRANSMISSION',
      'ALHD HD ALIGNMENT',
      'ALFE Alignments & Front End',
      'AL4 4 Wheel Alignment',
      'ALD Alignment - Dually',
      'SRVL Service Truck Labor',
      'SUBO Sublet Outside Labor',
      'SVPL Service Parts/Labor',
      'MISC MISC PARTS\\SERVICE\\LAB',
      'LTMS TIRE MISC-LABOR',
      'LTSR TIRE MISC-SERVICE/REPAIR'
    ];

    let totalBilledHours = 0;
    const ESTIMATED_RATE = 50; // $50/hr for estimation

    for (const record of laborRecords) {
      const qty = Number(record.quantity);
      const labor = Number(record.labor);

      if (HOURLY_CATEGORIES.includes(record.category)) {
        // Use quantity as hours, but ensure it's positive
        if (qty > 0) {
          totalBilledHours += qty;
        } else if (labor > 0) {
          // Fallback if quantity is weird but revenue exists
          totalBilledHours += labor / ESTIMATED_RATE;
        }
      } else {
        // For other categories (e.g. Flat Repair, Balancing), estimate from revenue
        if (labor > 0) {
          totalBilledHours += labor / ESTIMATED_RATE;
        }
      }
    }
    
    const capacity = techCount * 40 * weeks; 
    
    const utilization = capacity > 0 ? (totalBilledHours / capacity) * 100 : 0;

    let insight = 'Optimal';
    if (utilization > 90) insight = 'Overworked - Consider Hiring';
    if (utilization < 60) insight = 'Underutilized - Check Scheduling';

    return {
      metric: 'Technician Utilization (4 Weeks)',
      value: Number(utilization.toFixed(1)),
      unit: '%',
      techCount,
      totalBilledHours: Number(totalBilledHours.toFixed(1)),
      capacityHours: capacity,
      insight,
      message: `Technician utilization is ${utilization.toFixed(1)}%. (Based on billed hours vs capacity)`
    };
  }

  // --- Margin Insights ---

  async getMarginLeakage(storeId?: string) {
    // Analyze GP% by Category for last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    let storeFilter = Prisma.sql``;
    if (storeId) {
      storeFilter = Prisma.sql`AND i.store_id = ${storeId}`;
    }

    const margins: Array<{ category: string; revenue: number; profit: number }> = await this.prisma.$queryRaw`
      SELECT 
        ili."category",
        SUM(ili.line_total) as "revenue",
        SUM(ili.gross_profit) as "profit"
      FROM "invoice_line_items" ili
      JOIN "invoices" i ON ili."invoice_id" = i.id
      WHERE i."invoice_date" >= ${startDate}
      AND i."status" = 'ACTIVE'
      ${storeFilter}
      GROUP BY ili."category"
    `;

    const alerts = [];
    const thresholds: Record<string, number> = {
      'TIRES': 15,
      'SERVICES': 60,
      'PARTS': 30,
      'OTHER': 20
    };

    for (const m of margins) {
      const revenue = Number(m.revenue);
      const profit = Number(m.profit);
      if (revenue === 0) continue;

      const margin = (profit / revenue) * 100;
      const target = thresholds[m.category] || 20;

      if (margin < target) {
        alerts.push({
          type: 'MARGIN_LEAKAGE',
          category: m.category,
          currentMargin: Number(margin.toFixed(1)),
          targetMargin: target,
          revenue,
          profit,
          message: `Low Margin Alert: ${m.category} margin is ${margin.toFixed(1)}% (Target: ${target}%).`
        });
      }
    }

    return alerts.sort((a, b) => a.currentMargin - b.currentMargin);
  }

  async getAttachmentRates(storeId?: string) {
    // % of Tire Invoices that include an Alignment
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    let storeFilter = Prisma.sql``;
    if (storeId) {
      storeFilter = Prisma.sql`AND i.store_id = ${storeId}`;
    }

    const tireInvoices = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT DISTINCT i.id
      FROM "invoices" i
      JOIN "invoice_line_items" ili ON i.id = ili."invoice_id"
      WHERE i."invoice_date" >= ${startDate}
      AND i."status" = 'ACTIVE'
      AND ili."category" = 'TIRES'
      ${storeFilter}
    `;

    const totalTireInvoices = tireInvoices.length;
    if (totalTireInvoices === 0) return { rate: 0, message: 'No tire invoices found in last 30 days.' };

    const invoiceIds = tireInvoices.map(inv => inv.id);

    const alignmentCountResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT ili."invoice_id") as "count"
      FROM "invoice_line_items" ili
      WHERE ili."invoice_id" IN (${Prisma.join(invoiceIds)})
      AND (
        ili."description" ILIKE '%Alignment%' 
        OR ili."product_code" ILIKE '%ALIGN%'
      )
    `;

    const alignmentCount = Number(alignmentCountResult[0].count);
    const rate = (alignmentCount / totalTireInvoices) * 100;

    return {
      metric: 'Alignment Attachment Rate',
      value: Number(rate.toFixed(1)),
      unit: '%',
      totalTireInvoices,
      invoicesWithAlignment: alignmentCount,
      potentialRevenue: (totalTireInvoices - alignmentCount) * 89.99, 
      message: `Alignment attachment rate is ${rate.toFixed(1)}%. ${totalTireInvoices - alignmentCount} missed opportunities.`
    };
  }

  async getTopTiresByCategory(storeId?: string) {
    const lookbackDays = 180; // 6 months history
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    let storeFilter = Prisma.sql``;
    let inventoryStoreFilter = Prisma.sql``;
    if (storeId) {
      storeFilter = Prisma.sql`AND i.store_id = ${storeId}`;
      const store = await this.prisma.store.findUnique({ where: { id: storeId } });
      if (store) {
        inventoryStoreFilter = Prisma.sql`AND s.id = ${storeId}`;
      }
    }

    // 1. Get Top 3 Products per Category (Type) based on Quantity Sold in last 180 days
    // Also fetch current inventory quantity to calculate Outlook
    const topProducts = await this.prisma.$queryRaw<Array<{
      type: string;
      productId: string;
      productName: string;
      totalSold: number;
      currentQuantity: number;
      rank: number;
    }>>`
      WITH ProductSales AS (
        SELECT 
          p.type,
          p.id as "productId",
          COALESCE(p.description, CONCAT(p.brand, ' ', p.pattern, ' ', p.size)) as "productName",
          SUM(ili.quantity) as "totalSold"
        FROM "invoice_line_items" ili
        JOIN "invoices" i ON ili."invoice_id" = i.id
        JOIN "tire_master_products" p ON ili."tire_master_product_id" = p.id
        WHERE i."invoice_date" >= ${startDate}
        AND i."status" = 'ACTIVE'
        AND p."isTire" = true
        AND (p."tireMasterSku" < 'OP01' OR p."tireMasterSku" > 'OP20')
        AND p.type NOT IN ('OTHER', 'LAWN_GARDEN', 'ATV_UTV', 'AGRICULTURAL', 'INDUSTRIAL', 'OTR')
        ${storeFilter}
        GROUP BY p.type, p.id, p.description, p.brand, p.pattern, p.size
      ),
      ProductInventory AS (
        SELECT
          tmi."productId",
          SUM(tmi."availableQty") as "currentQuantity"
        FROM "tire_master_inventory" tmi
        JOIN "tire_master_locations" tml ON tmi."locationId" = tml.id
        JOIN "stores" s ON tml."tireMasterCode" = s.code
        WHERE 1=1
        ${inventoryStoreFilter}
        GROUP BY tmi."productId"
      ),
      RankedSales AS (
        SELECT 
          ps.*,
          COALESCE(pi."currentQuantity", 0) as "currentQuantity",
          ROW_NUMBER() OVER (PARTITION BY ps.type ORDER BY ps."totalSold" DESC) as rank
        FROM ProductSales ps
        LEFT JOIN ProductInventory pi ON ps."productId" = pi."productId"
      )
      SELECT * FROM RankedSales WHERE rank <= 3
    `;

    // 2. For each top product, get MONTHLY sales history for the last 180 days
    const productIds = topProducts.map(p => p.productId);
    
    if (productIds.length === 0) return {};

    const salesHistory = await this.prisma.$queryRaw<Array<{
      productId: string;
      date: string; // YYYY-MM
      quantity: number;
    }>>`
      SELECT 
        ili."tire_master_product_id" as "productId",
        TO_CHAR(i."invoice_date", 'YYYY-MM') as "date",
        SUM(ili.quantity) as "quantity"
      FROM "invoice_line_items" ili
      JOIN "invoices" i ON ili."invoice_id" = i.id
      WHERE i."invoice_date" >= ${startDate}
      AND i."status" = 'ACTIVE'
      AND ili."tire_master_product_id" IN (${Prisma.join(productIds)})
      ${storeFilter}
      GROUP BY ili."tire_master_product_id", TO_CHAR(i."invoice_date", 'YYYY-MM')
      ORDER BY "date" ASC
    `;

    // 3. Structure the response
    const result: Record<string, any[]> = {};

    topProducts.forEach(p => {
      // Normalize type name for display (e.g., PASSENGER -> Passenger)
      const typeName = p.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
      
      if (!result[typeName]) result[typeName] = [];
      
      // Build history array (fill missing months with 0)
      const historyMap = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7); // YYYY-MM
        historyMap.set(key, 0);
      }

      salesHistory
        .filter(h => h.productId === p.productId)
        .forEach(h => historyMap.set(h.date, Number(h.quantity)));

      const history = Array.from(historyMap.entries()).map(([date, quantity]) => ({ date, quantity }));

      // Calculate Outlook (Days of Supply)
      const dailyVelocity = Number(p.totalSold) / lookbackDays;
      const daysOfSupply = dailyVelocity > 0 ? Number(p.currentQuantity) / dailyVelocity : 999;

      result[typeName].push({
        productId: p.productId,
        productName: p.productName,
        totalSold: Number(p.totalSold),
        currentQuantity: Number(p.currentQuantity),
        daysOfSupply: Number(daysOfSupply.toFixed(1)),
        rank: Number(p.rank),
        history
      });
    });

    return result;
  }
}
