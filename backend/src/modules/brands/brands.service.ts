import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async getBrands() {
    // Get all brands that have products
    // We only want brands that came from our import (implied by having products)
    const brands = await this.prisma.tireMasterProduct.groupBy({
      by: ['brand'],
      _count: {
        id: true,
      },
      where: {
        brand: {
          not: '',
        },
        isActive: true,
        NOT: {
          brand: {
            equals: 'unknown',
            mode: 'insensitive',
          },
        },
      },
      orderBy: {
        brand: 'asc',
      },
    });

    return brands.map((b) => ({
      name: b.brand,
      productCount: b._count.id,
    }));
  }

  async getBrandAnalytics(brandName: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    // 1. Overall Stats (Sales, Profit, Units)
    // Using raw query to avoid complex relation filtering issues in Prisma aggregate
    const stats = await this.prisma.$queryRaw<
      { total_sales: number; total_profit: number; total_units: number; transaction_count: number }[]
    >`
      SELECT 
        COALESCE(SUM(ili.line_total), 0) as total_sales,
        COALESCE(SUM(ili.gross_profit), 0) as total_profit,
        COALESCE(SUM(ili.quantity), 0) as total_units,
        COUNT(ili.id) as transaction_count
      FROM invoice_line_items ili
      JOIN invoices i ON ili.invoice_id = i.id
      JOIN tire_master_products tmp ON ili.tire_master_product_id = tmp.id
      WHERE tmp.brand = ${brandName}
      AND i.invoice_date >= ${start}
      AND i.invoice_date <= ${end}
    `;

    // Get current inventory count
    const inventoryStats = await this.prisma.tireMasterInventory.aggregate({
      _sum: {
        quantity: true
      },
      where: {
        product: {
          brand: brandName
        }
      }
    });

    const overview = {
      totalSales: Number(stats[0]?.total_sales || 0),
      totalProfit: Number(stats[0]?.total_profit || 0),
      totalUnits: Number(stats[0]?.total_units || 0),
      transactionCount: Number(stats[0]?.transaction_count || 0),
      inventoryCount: inventoryStats._sum.quantity || 0,
    };

    // 2. Sales Trend (Monthly)
    const monthlyTrend = await this.prisma.$queryRaw<
      { month: string; sales: number; profit: number; units: number }[]
    >`
      SELECT 
        TO_CHAR(i.invoice_date, 'YYYY-MM') as month,
        COALESCE(SUM(ili.line_total), 0) as sales,
        COALESCE(SUM(ili.gross_profit), 0) as profit,
        COALESCE(SUM(ili.quantity), 0) as units
      FROM invoice_line_items ili
      JOIN invoices i ON ili.invoice_id = i.id
      JOIN tire_master_products tmp ON ili.tire_master_product_id = tmp.id
      WHERE tmp.brand = ${brandName}
      AND i.invoice_date >= ${start}
      AND i.invoice_date <= ${end}
      GROUP BY TO_CHAR(i.invoice_date, 'YYYY-MM')
      ORDER BY month ASC
    `;

    // 3. Top SKUs
    const topSkusRaw = await this.prisma.$queryRaw<
      { product_code: string; total_sales: number; total_units: number; total_profit: number }[]
    >`
      SELECT 
        ili.product_code,
        COALESCE(SUM(ili.line_total), 0) as total_sales,
        COALESCE(SUM(ili.quantity), 0) as total_units,
        COALESCE(SUM(ili.gross_profit), 0) as total_profit
      FROM invoice_line_items ili
      JOIN invoices i ON ili.invoice_id = i.id
      JOIN tire_master_products tmp ON ili.tire_master_product_id = tmp.id
      WHERE tmp.brand = ${brandName}
      AND i.invoice_date >= ${start}
      AND i.invoice_date <= ${end}
      GROUP BY ili.product_code
      ORDER BY total_sales DESC
      LIMIT 10
    `;

    // Enrich Top SKUs
    const enrichedTopSkus = await Promise.all(
      topSkusRaw.map(async (sku) => {
        const product = await this.prisma.tireMasterProduct.findFirst({
          where: { tireMasterSku: sku.product_code },
          select: { size: true, pattern: true, description: true },
        });
        return {
          productCode: sku.product_code,
          totalSales: Number(sku.total_sales),
          totalUnits: Number(sku.total_units),
          totalProfit: Number(sku.total_profit),
          product,
        };
      })
    );

    // 4. Size Distribution
    const sizeDistribution = await this.prisma.$queryRaw<
      { size: string; units: number; sales: number }[]
    >`
      SELECT 
        tmp.size,
        COALESCE(SUM(ili.quantity), 0) as units,
        COALESCE(SUM(ili.line_total), 0) as sales
      FROM invoice_line_items ili
      JOIN invoices i ON ili.invoice_id = i.id
      JOIN tire_master_products tmp ON ili.tire_master_product_id = tmp.id
      WHERE tmp.brand = ${brandName}
      AND i.invoice_date >= ${start}
      AND i.invoice_date <= ${end}
      AND tmp.size IS NOT NULL
      AND tmp.size != ''
      GROUP BY tmp.size
      ORDER BY units DESC
      LIMIT 20
    `;

    return {
      overview,
      trends: monthlyTrend.map(t => ({
        month: t.month,
        sales: Number(t.sales),
        profit: Number(t.profit),
        units: Number(t.units)
      })),
      topSkus: enrichedTopSkus,
      sizeDistribution: sizeDistribution.map(s => ({
        size: s.size,
        units: Number(s.units),
        sales: Number(s.sales)
      })),
    };
  }

  async getBrandLeaderboard(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const leaderboard = await this.prisma.$queryRaw<
      { brand: string; total_sales: number; total_profit: number; total_units: number; transaction_count: number }[]
    >`
      SELECT 
        tmp.brand,
        COALESCE(SUM(ili.line_total), 0) as total_sales,
        COALESCE(SUM(ili.gross_profit), 0) as total_profit,
        COALESCE(SUM(ili.quantity), 0) as total_units,
        COUNT(ili.id) as transaction_count
      FROM invoice_line_items ili
      JOIN invoices i ON ili.invoice_id = i.id
      JOIN tire_master_products tmp ON ili.tire_master_product_id = tmp.id
      WHERE i.invoice_date >= ${start}
      AND i.invoice_date <= ${end}
      AND tmp.brand IS NOT NULL
      AND tmp.brand != ''
      AND LOWER(tmp.brand) != 'unknown'
      GROUP BY tmp.brand
      ORDER BY total_sales DESC
      LIMIT 50
    `;

    return leaderboard;
  }

  async getBrandsBySize(size: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const results = await this.prisma.$queryRaw<
      { brand: string; total_sales: number; total_profit: number; total_units: number; average_price: number }[]
    >`
      SELECT 
        tmp.brand,
        COALESCE(SUM(ili.line_total), 0) as total_sales,
        COALESCE(SUM(ili.gross_profit), 0) as total_profit,
        COALESCE(SUM(ili.quantity), 0) as total_units,
        CASE WHEN SUM(ili.quantity) > 0 THEN SUM(ili.line_total) / SUM(ili.quantity) ELSE 0 END as average_price
      FROM invoice_line_items ili
      JOIN invoices i ON ili.invoice_id = i.id
      JOIN tire_master_products tmp ON ili.tire_master_product_id = tmp.id
      WHERE tmp.size = ${size}
      AND i.invoice_date >= ${start}
      AND i.invoice_date <= ${end}
      AND tmp.brand IS NOT NULL
      AND tmp.brand != ''
      AND LOWER(tmp.brand) != 'unknown'
      GROUP BY tmp.brand
      ORDER BY total_units DESC
    `;

    return results;
  }
}
