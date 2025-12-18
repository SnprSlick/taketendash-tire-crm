import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TireAnalyticsFilterDto } from './dto/tire-analytics-filter.dto';
import { Prisma, TireQuality } from '@prisma/client';
import { classifyProduct, classifyBrandQuality } from '../../utils/tire-classifier';

@Injectable()
export class TireAnalyticsService {
  private readonly logger = new Logger(TireAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async runClassification() {
    this.logger.log('Starting tire classification...');

    // Fetch all products
    const products = await this.prisma.tireMasterProduct.findMany({
      select: {
        id: true,
        tireMasterSku: true,
        description: true,
        size: true,
        type: true,
        isTire: true,
        brand: true,
        manufacturerCode: true,
        quality: true
      }
    });

    this.logger.log(`Found ${products.length} products to classify.`);

    let updates = 0;
    let tiresFound = 0;

    for (const product of products) {
      const classification = classifyProduct({
        tireMasterSku: product.tireMasterSku,
        description: product.description,
        size: product.size
      });

      let quality: TireQuality = TireQuality.UNKNOWN;
      
      // Only classify quality if it's a tire
      if (classification.isTire) {
        tiresFound++;
        quality = classifyBrandQuality(product.brand, product.manufacturerCode);
      }

      // Only update if classification or quality changed
      if (
        product.type !== classification.type || 
        product.isTire !== classification.isTire ||
        product.quality !== quality
      ) {
        await this.prisma.tireMasterProduct.update({
          where: { id: product.id },
          data: {
            type: classification.type,
            isTire: classification.isTire,
            quality: quality
          }
        });
        updates++;
      }
    }

    this.logger.log(`Classification complete. Updated ${updates} products. Found ${tiresFound} tires.`);
    return {
      totalProducts: products.length,
      tiresFound,
      updates
    };
  }

  async getTireAnalytics(filter: TireAnalyticsFilterDto, allowedStoreIds?: string[]) {
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
    } else if (allowedStoreIds) {
      if (allowedStoreIds.length > 0) {
        storeFilter = `AND i.store_id IN (${allowedStoreIds.map(() => `$${paramIndex++}`).join(',')})`;
        params.push(...allowedStoreIds);
      } else {
        storeFilter = `AND 1=0`;
      }
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

  async getFilterOptions(allowedStoreIds?: string[]) {
    // Return available brands, types, qualities, sizes for the frontend filters
    const storeWhere: any = {};
    if (allowedStoreIds) {
      storeWhere.id = { in: allowedStoreIds };
    }

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
        where: storeWhere,
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

  async getTireSalesTrends(filter: TireAnalyticsFilterDto, allowedStoreIds?: string[]) {
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
    } else if (allowedStoreIds) {
      if (allowedStoreIds.length > 0) {
        storeFilter = `AND i.store_id IN (${allowedStoreIds.map(() => `$${paramIndex++}`).join(',')})`;
        params.push(...allowedStoreIds);
      } else {
        storeFilter = `AND 1=0`;
      }
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
