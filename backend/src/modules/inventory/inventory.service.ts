import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TireType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalProducts = await this.prisma.tireMasterProduct.count({
      where: { isActive: true }
    });

    const inventoryStats = await this.prisma.tireMasterInventory.aggregate({
      _sum: {
        quantity: true,
      },
      where: {
        quantity: { gt: 0 }
      }
    });

    const locations = await this.prisma.tireMasterLocation.findMany({
      where: { isActive: true },
      select: { id: true, name: true, tireMasterCode: true }
    });

    return {
      totalProducts,
      totalQuantity: inventoryStats._sum.quantity || 0,
      locationsCount: locations.length
    };
  }

  async getInventory(params: {
    page?: number;
    limit?: number;
    search?: string;
    locationId?: string;
    type?: string;
    size?: string;
    inStock?: boolean;
  }) {
    const { page = 1, limit = 50, search, locationId, type, size, inStock } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.TireMasterProductWhereInput = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { tireMasterSku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { size: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (size) {
      where.size = { contains: size, mode: 'insensitive' };
    }

    if (type && Object.values(TireType).includes(type as TireType)) {
      where.type = type as TireType;
    }

    if (inStock) {
      where.inventory = {
        some: {
          quantity: { gt: 0 },
          ...(locationId ? { locationId } : {})
        }
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.tireMasterProduct.findMany({
        where,
        include: {
          inventory: {
            where: locationId ? { locationId } : undefined,
            include: {
              location: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { tireMasterSku: 'asc' }
      }),
      this.prisma.tireMasterProduct.count({ where })
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getLocations() {
    const locations = await this.prisma.tireMasterLocation.findMany({
      where: { 
        isActive: true,
        tireMasterCode: { not: '1' } // Exclude Corporate Store 1
      },
      orderBy: { tireMasterCode: 'asc' }
    });

    const stores = await this.prisma.$queryRaw<Array<{ code: string, name: string }>>`SELECT code, name FROM stores`;

    return locations.map(loc => {
      const store = stores.find(s => s.code === loc.tireMasterCode);
      return {
        ...loc,
        name: store ? store.name : loc.name
      };
    });
  }

  async getSalesAnalytics(params: { 
    days?: number; 
    storeId?: string; 
    minVelocity?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    size?: string;
    page?: number;
    limit?: number;
    outlook?: number;
  }) {
    const { 
      days = 30, 
      storeId, 
      minVelocity = 0,
      sortBy = 'dailyVelocity',
      sortOrder = 'desc',
      search,
      size,
      page = 1,
      limit,
      outlook = 30
    } = params;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let salesData: Array<{ productId: string; totalSold: number }>;

    if (storeId) {
      // Translate TireMasterLocation ID (storeId) to Store ID
      const location = await this.prisma.tireMasterLocation.findUnique({
        where: { id: storeId }
      });

      let targetStoreId = storeId; // Default to passed ID if translation fails (fallback)

      if (location) {
        const stores = await this.prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM stores WHERE code = ${location.tireMasterCode} LIMIT 1`;
        if (stores.length > 0) {
          targetStoreId = stores[0].id;
        }
      }

      salesData = await this.prisma.$queryRaw`
        SELECT 
          ili."tire_master_product_id" as "productId", 
          SUM(ili.quantity) as "totalSold"
        FROM "invoice_line_items" ili
        JOIN "invoices" i ON ili."invoice_id" = i.id
        WHERE i."invoice_date" >= ${startDate}
        AND i."store_id" = ${targetStoreId}
        AND ili."tire_master_product_id" IS NOT NULL
        GROUP BY ili."tire_master_product_id"
        HAVING SUM(ili.quantity) > 0
      `;
    } else {
      salesData = await this.prisma.$queryRaw`
        SELECT 
          ili."tire_master_product_id" as "productId", 
          SUM(ili.quantity) as "totalSold"
        FROM "invoice_line_items" ili
        JOIN "invoices" i ON ili."invoice_id" = i.id
        WHERE i."invoice_date" >= ${startDate}
        AND ili."tire_master_product_id" IS NOT NULL
        GROUP BY ili."tire_master_product_id"
        HAVING SUM(ili.quantity) > 0
      `;
    }

    const productIds = salesData.map(s => s.productId);

    if (productIds.length === 0) {
      return [];
    }

    // Fetch detailed sales per store for these products
    const detailedSales: Array<{ productId: string; storeId: string; totalSold: number }> = await this.prisma.$queryRaw`
      SELECT 
        ili."tire_master_product_id" as "productId", 
        i."store_id" as "storeId",
        SUM(ili.quantity) as "totalSold"
      FROM "invoice_line_items" ili
      JOIN "invoices" i ON ili."invoice_id" = i.id
      WHERE i."invoice_date" >= ${startDate}
      AND ili."tire_master_product_id" IN (${Prisma.join(productIds)})
      GROUP BY ili."tire_master_product_id", i."store_id"
    `;

    // Fetch daily sales history for the last 365 days
    const historyStartDate = new Date();
    historyStartDate.setDate(historyStartDate.getDate() - 365);

    const dailySalesHistory: Array<{ productId: string; storeId: string; date: Date; quantity: number }> = await this.prisma.$queryRaw`
      SELECT 
        ili."tire_master_product_id" as "productId", 
        i."store_id" as "storeId",
        DATE(i."invoice_date") as "date",
        SUM(ili.quantity) as "quantity"
      FROM "invoice_line_items" ili
      JOIN "invoices" i ON ili."invoice_id" = i.id
      WHERE i."invoice_date" >= ${historyStartDate}
      AND ili."tire_master_product_id" IN (${Prisma.join(productIds)})
      GROUP BY ili."tire_master_product_id", i."store_id", DATE(i."invoice_date")
      ORDER BY DATE(i."invoice_date") ASC
    `;

    // Fetch all locations and stores for mapping
    const allLocations = await this.prisma.tireMasterLocation.findMany({ 
      where: { 
        isActive: true,
        tireMasterCode: { not: '1' } // Exclude Corporate Store 1
      } 
    });
    // Use queryRaw to avoid potential type issues if Store model isn't picked up by TS yet
    const allStores = await this.prisma.$queryRaw<Array<{ id: string, code: string, name: string }>>`SELECT id, code, name FROM stores`;
    const locationStoreMap = new Map<string, string>(); // LocationID -> StoreID
    const locationNameMap = new Map<string, string>(); // LocationID -> Store Name
    const storeIdToNameMap = new Map<string, string>(); // StoreID -> Store Name
    
    for (const loc of allLocations) {
      const store = allStores.find(s => s.code === loc.tireMasterCode);
      if (store) {
        locationStoreMap.set(loc.id, store.id);
        locationNameMap.set(loc.id, store.name);
        storeIdToNameMap.set(store.id, store.name);
      } else {
        locationNameMap.set(loc.id, loc.name);
      }
    }

    const products = await this.prisma.tireMasterProduct.findMany({
      where: {
        id: { in: productIds },
        ...(search ? {
          OR: [
            { tireMasterSku: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
          ]
        } : {}),
        ...(size ? { size: { contains: size, mode: 'insensitive' } } : {})
      },
      include: {
        inventory: {
          include: {
            location: true
          }
        }
      }
    });

    const results = products.map(product => {
      const saleRecord = salesData.find(s => s.productId === product.id);
      const totalSold = Number(saleRecord?.totalSold || 0);
      const dailyVelocity = totalSold / days;
      
      const totalStock = product.inventory.reduce((sum, inv) => sum + Number(inv.quantity), 0);
      
      const daysOfSupply = dailyVelocity > 0 ? totalStock / dailyVelocity : 999;
      
      const targetDays = outlook;
      const neededStock = dailyVelocity * targetDays;
      const suggestedRestock = Math.max(0, neededStock - totalStock);

      // Calculate breakdown per location
      const inventoryBreakdown = allLocations.map(loc => {
        // Find current stock
        const invRecord = product.inventory.find(inv => inv.locationId === loc.id);
        const quantity = Number(invRecord?.quantity || 0);

        // Find sales for this location (via store mapping)
        const storeId = locationStoreMap.get(loc.id);
        let locSold = 0;
        if (storeId) {
          const locSale = detailedSales.find(ds => ds.productId === product.id && ds.storeId === storeId);
          locSold = Number(locSale?.totalSold || 0);
        }

        const locVelocity = locSold / days;
        const locNeeded = locVelocity * targetDays;
        const locRestock = Math.max(0, locNeeded - quantity);

        return {
          location: locationNameMap.get(loc.id) || loc.name,
          quantity,
          velocity: Number(locVelocity.toFixed(2)),
          suggestedRestock: Math.ceil(locRestock)
        };
      }).sort((a, b) => {
        // Sort by Store Name if available, otherwise by quantity
        return a.location.localeCompare(b.location);
      });

      // Sum up the actual restock needed from all locations
      const totalRestockNeeded = inventoryBreakdown.reduce((sum, loc) => sum + loc.suggestedRestock, 0);

      const productHistory = dailySalesHistory
        .filter(h => h.productId === product.id)
        .map(h => ({
          date: h.date instanceof Date ? h.date.toISOString().split('T')[0] : h.date,
          storeName: storeIdToNameMap.get(h.storeId) || 'Unknown',
          quantity: Number(h.quantity)
        }));

      return {
        productId: product.id,
        sku: product.tireMasterSku,
        name: product.description,
        size: product.size,
        brand: product.brand,
        totalSold,
        dailyVelocity,
        currentStock: totalStock,
        daysOfSupply,
        suggestedRestock: totalRestockNeeded,
        inventoryBreakdown,
        salesHistory: productHistory
      };
    });

    const sortedItems = results
      .filter(r => r.dailyVelocity >= minVelocity)
      .sort((a, b) => {
        const valA = a[sortBy] ?? '';
        const valB = b[sortBy] ?? '';
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        
        if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
        if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

    if (limit) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      return sortedItems.slice(startIndex, endIndex);
    }

    return sortedItems;
  }
}
