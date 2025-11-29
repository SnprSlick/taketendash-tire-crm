import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TireAnalyticsFilterDto } from './dto/tire-analytics-filter.dto';
import { Prisma, TireQuality } from '@prisma/client';

@Injectable()
export class TireAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getTireAnalytics(filter: TireAnalyticsFilterDto) {
    const { startDate, endDate, brands, qualities, types, sizes, storeId, groupBy } = filter;

    const where: Prisma.InvoiceLineItemWhereInput = {
      invoice: {
        status: 'ACTIVE', // Only active invoices
        ...(startDate && endDate ? {
          invoiceDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          }
        } : {}),
        ...(storeId ? { storeId } : {}),
      },
      tireMasterProduct: {
        isTire: true, // Only tires
        ...(brands?.length ? { brand: { in: brands } } : {}),
        ...(qualities?.length ? { quality: { in: qualities } } : {}),
        ...(types?.length ? { type: { in: types } } : {}),
        ...(sizes?.length ? { size: { in: sizes } } : {}),
      }
    };

    // We need to aggregate sales data
    // Since Prisma doesn't support complex multi-level grouping with relations easily in one go,
    // we might need to fetch and aggregate or use raw query.
    // For performance on large datasets, raw query is often better, but let's try Prisma's groupBy first if possible.
    // Prisma groupBy on InvoiceLineItem doesn't allow joining with TireMasterProduct for grouping keys directly in the same way SQL does.
    
    // Let's use raw query for flexibility and performance here.
    
    const startDateObj = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDateObj = endDate ? new Date(endDate) : new Date();

    // Build dynamic SQL parts
    let brandFilter = '';
    let qualityFilter = '';
    let typeFilter = '';
    let sizeFilter = '';
    let storeFilter = '';

    const params: any[] = [startDateObj, endDateObj];
    let paramIndex = 3; // $1 and $2 are dates

    if (brands?.length) {
      brandFilter = `AND p."brand" IN (${brands.map(() => `$${paramIndex++}`).join(',')})`;
      params.push(...brands);
    }
    if (qualities?.length) {
      qualityFilter = `AND p."quality" IN (${qualities.map(() => `$${paramIndex++}::"TireQuality"`).join(',')})`;
      params.push(...qualities);
    }
    if (types?.length) {
      typeFilter = `AND p."type" IN (${types.map(() => `$${paramIndex++}::"TireType"`).join(',')})`;
      params.push(...types);
    }
    if (sizes?.length) {
      sizeFilter = `AND p."size" IN (${sizes.map(() => `$${paramIndex++}`).join(',')})`;
      params.push(...sizes);
    }
    if (storeId) {
      storeFilter = `AND i.store_id = $${paramIndex++}`;
      params.push(storeId);
    }

    // Determine grouping
    let groupField = 'p."brand"'; // Default
    let groupAlias = 'brand';
    
    switch (groupBy) {
      case 'brand': groupField = 'p."brand"'; groupAlias = 'brand'; break;
      case 'quality': groupField = 'p."quality"'; groupAlias = 'quality'; break;
      case 'type': groupField = 'p."type"'; groupAlias = 'type'; break;
      case 'size': groupField = 'p."size"'; groupAlias = 'size'; break;
      case 'product': groupField = 'p."tireMasterSku"'; groupAlias = 'productCode'; break;
    }

    const query = `
      SELECT 
        ${groupField} as "${groupAlias}",
        COUNT(ili.id) as "transactionCount",
        SUM(ili.quantity) as "unitsSold",
        SUM(ili.line_total) as "totalRevenue",
        SUM(ili.gross_profit) as "totalProfit"
      FROM invoice_line_items ili
      JOIN "tire_master_products" p ON ili.tire_master_product_id = p.id
      JOIN invoices i ON ili.invoice_id = i.id
      WHERE 
        i.invoice_date >= $1 
        AND i.invoice_date <= $2
        AND i.status = 'ACTIVE'
        AND p."isTire" = true
        AND p."brand" != 'Unknown'
        AND p."quality" IN ('PREMIUM', 'STANDARD', 'ECONOMY')
        ${brandFilter}
        ${qualityFilter}
        ${typeFilter}
        ${sizeFilter}
        ${storeFilter}
      GROUP BY ${groupField}
      ORDER BY "unitsSold" DESC
    `;

    const results = await this.prisma.$queryRawUnsafe(query, ...params);
    
    // Calculate margins and velocity
    const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 3600 * 24)) || 1;

    return (results as any[]).map(r => ({
      ...r,
      transactionCount: Number(r.transactionCount),
      unitsSold: Number(r.unitsSold),
      totalRevenue: Number(r.totalRevenue),
      totalProfit: Number(r.totalProfit),
      margin: Number(r.totalRevenue) > 0 ? (Number(r.totalProfit) / Number(r.totalRevenue)) * 100 : 0,
      velocity: Number(r.unitsSold) / daysDiff // Units per day
    }));
  }

  async getFilterOptions() {
    // Return available brands, types, qualities, sizes for the frontend filters
    const [brands, types, sizes, stores] = await Promise.all([
      this.prisma.tireMasterProduct.findMany({
        where: { 
          isTire: true,
          quality: { in: ['PREMIUM', 'STANDARD', 'ECONOMY'] }
        },
        select: { brand: true },
        distinct: ['brand'],
        orderBy: { brand: 'asc' }
      }),
      this.prisma.tireMasterProduct.findMany({
        where: { isTire: true },
        select: { type: true },
        distinct: ['type'],
        orderBy: { type: 'asc' }
      }),
      this.prisma.tireMasterProduct.findMany({
        where: { isTire: true },
        select: { size: true },
        distinct: ['size'],
        orderBy: { size: 'asc' }
      }),
      this.prisma.store.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
      })
    ]);

    return {
      brands: brands.map(b => b.brand).filter(b => b !== 'Unknown' && b !== ''),
      types: types.map(t => t.type),
      sizes: sizes.map(s => s.size),
      qualities: Object.values(TireQuality).filter(q => q !== 'UNKNOWN'),
      stores
    };
  }

  async getTireSalesTrends(filter: TireAnalyticsFilterDto) {
    const { startDate, endDate, brands, qualities, types, sizes, storeId, groupBy } = filter;

    const startDateObj = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDateObj = endDate ? new Date(endDate) : new Date();

    // Build dynamic SQL parts
    let brandFilter = '';
    let qualityFilter = '';
    let typeFilter = '';
    let sizeFilter = '';
    let storeFilter = '';

    const params: any[] = [startDateObj, endDateObj];
    let paramIndex = 3; // $1 and $2 are dates

    if (brands?.length) {
      brandFilter = `AND p."brand" IN (${brands.map(() => `$${paramIndex++}`).join(',')})`;
      params.push(...brands);
    }
    if (qualities?.length) {
      qualityFilter = `AND p."quality" IN (${qualities.map(() => `$${paramIndex++}::"TireQuality"`).join(',')})`;
      params.push(...qualities);
    }
    if (types?.length) {
      typeFilter = `AND p."type" IN (${types.map(() => `$${paramIndex++}::"TireType"`).join(',')})`;
      params.push(...types);
    }
    if (sizes?.length) {
      sizeFilter = `AND p."size" IN (${sizes.map(() => `$${paramIndex++}`).join(',')})`;
      params.push(...sizes);
    }
    if (storeId) {
      storeFilter = `AND i.store_id = $${paramIndex++}`;
      params.push(storeId);
    }

    // Determine grouping
    let groupField = 'p."brand"'; // Default
    let groupAlias = 'brand';
    
    switch (groupBy) {
      case 'brand': groupField = 'p."brand"'; groupAlias = 'brand'; break;
      case 'quality': groupField = 'p."quality"'; groupAlias = 'quality'; break;
      case 'type': groupField = 'p."type"'; groupAlias = 'type'; break;
      case 'size': groupField = 'p."size"'; groupAlias = 'size'; break;
      case 'product': groupField = 'p."tireMasterSku"'; groupAlias = 'productCode'; break;
    }

    // Determine time interval based on duration
    const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 3600 * 24));
    let interval = 'week'; // Default to week as requested
    if (daysDiff > 180) interval = 'month'; // If > 6 months, use month
    if (daysDiff <= 7) interval = 'day'; // If <= 7 days, keep day

    // Group by date (interval) and the selected dimension
    const query = `
      SELECT 
        DATE_TRUNC('${interval}', i.invoice_date) as "date",
        ${groupField} as "${groupAlias}",
        SUM(ili.quantity) as "unitsSold"
      FROM invoice_line_items ili
      JOIN "tire_master_products" p ON ili.tire_master_product_id = p.id
      JOIN invoices i ON ili.invoice_id = i.id
      WHERE 
        i.invoice_date >= $1 
        AND i.invoice_date <= $2
        AND i.status = 'ACTIVE'
        AND p."isTire" = true
        AND p."brand" != 'Unknown'
        AND p."quality" IN ('PREMIUM', 'STANDARD', 'ECONOMY')
        ${brandFilter}
        ${qualityFilter}
        ${typeFilter}
        ${sizeFilter}
        ${storeFilter}
      GROUP BY DATE_TRUNC('${interval}', i.invoice_date), ${groupField}
      ORDER BY "date" ASC
    `;

    const results = await this.prisma.$queryRawUnsafe(query, ...params);

    return (results as any[]).map(r => ({
      date: r.date,
      [groupAlias]: r[groupAlias],
      unitsSold: Number(r.unitsSold)
    }));
  }
}
