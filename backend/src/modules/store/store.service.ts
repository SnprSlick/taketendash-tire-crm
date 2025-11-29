import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const stores = await this.prisma.store.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: { employees: true }
        }
      }
    });

    // Calculate YTD stats for each store
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const storesWithStats = await Promise.all(stores.map(async (store) => {
      const revenueResult = await this.prisma.invoice.aggregate({
        where: {
          storeId: store.id,
          invoiceDate: { gte: startOfYear },
          status: 'ACTIVE'
        },
        _sum: { totalAmount: true }
      });

      // For GP, we need to sum line items because invoice.grossProfit might be unreliable
      const gpResult: any[] = await this.prisma.$queryRaw`
        SELECT SUM(ili.gross_profit) as total_gp
        FROM invoice_line_items ili
        JOIN invoices i ON ili.invoice_id = i.id
        WHERE i.store_id = ${store.id}
          AND i.invoice_date >= ${startOfYear}
          AND i.status = 'ACTIVE'::"InvoiceStatus"
      `;

      return {
        ...store,
        stats: {
          revenueYTD: Number(revenueResult._sum.totalAmount || 0),
          grossProfitYTD: Number(gpResult[0]?.total_gp || 0)
        }
      };
    }));

    return storesWithStats;
  }

  async findOne(id: string) {
    return this.prisma.store.findUnique({
      where: { id },
      include: {
        employees: true
      }
    });
  }

  async getStats(id: string, startDate?: Date, endDate?: Date) {
    // Calculate stats for the current month if dates not provided
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Use aggregation for better performance and accuracy
    // We need to join with line items to get accurate GP if invoice.grossProfit is 0
    const stats = await this.prisma.invoice.findMany({
      where: {
        storeId: id,
        invoiceDate: {
          gte: start,
          lte: end
        },
        status: 'ACTIVE'
      },
      include: {
        lineItems: {
          select: {
            lineTotal: true,
            grossProfit: true
          }
        }
      }
    });

    let totalRevenue = 0;
    let totalGrossProfit = 0;

    for (const inv of stats) {
      // Use invoice total if available, otherwise sum line items
      const invTotal = Number(inv.totalAmount);
      totalRevenue += invTotal;

      // Calculate GP from line items if invoice GP is 0 or null
      const invGP = Number(inv.grossProfit || 0);
      if (invGP === 0 && inv.lineItems.length > 0) {
        const lineGP = inv.lineItems.reduce((sum, item) => sum + Number(item.grossProfit || 0), 0);
        totalGrossProfit += lineGP;
      } else {
        totalGrossProfit += invGP;
      }
    }

    const invoiceCount = stats.length;
    const averageTicket = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;

    // Format period string
    const period = startDate && endDate 
      ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
      : 'Month to Date';

    return {
      period,
      totalRevenue,
      totalGrossProfit,
      invoiceCount,
      averageTicket
    };
  }

  async getAnalytics(id: string, startDate?: Date, endDate?: Date) {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 1. Revenue Trend (Daily)
    const trend: any[] = await this.prisma.$queryRaw`
      SELECT 
        TO_CHAR(i.invoice_date, 'YYYY-MM-DD') as date,
        SUM(i.total_amount) as revenue,
        SUM(ili.gross_profit) as gross_profit
      FROM invoices i
      LEFT JOIN invoice_line_items ili ON i.id = ili.invoice_id
      WHERE i.store_id = ${id}
        AND i.invoice_date >= ${start}
        AND i.invoice_date <= ${end}
        AND i.status = 'ACTIVE'::"InvoiceStatus"
      GROUP BY TO_CHAR(i.invoice_date, 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    // 2. Category Breakdown
    const categories: any[] = await this.prisma.$queryRaw`
      SELECT 
        ili.category,
        SUM(ili.gross_profit) as gross_profit
      FROM invoice_line_items ili
      JOIN invoices i ON ili.invoice_id = i.id
      WHERE i.store_id = ${id}
        AND i.invoice_date >= ${start}
        AND i.invoice_date <= ${end}
        AND i.status = 'ACTIVE'::"InvoiceStatus"
      GROUP BY ili.category
      ORDER BY gross_profit DESC
    `;

    return {
      trend: trend.map(t => ({
        date: t.date,
        revenue: Number(t.revenue || 0),
        grossProfit: Number(t.gross_profit || 0)
      })),
      categories: categories.map(c => ({
        category: c.category || 'Uncategorized',
        grossProfit: Number(c.gross_profit || 0)
      }))
    };
  }

  async getComparisonAnalytics(startDate?: Date, endDate?: Date) {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    let truncType = 'day';
    
    if (durationDays > 180) {
      truncType = 'month';
    } else if (durationDays > 32) {
      truncType = 'week';
    }

    // Get GP per store grouped by date truncation
    const results: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT 
        TO_CHAR(DATE_TRUNC('${truncType}', i.invoice_date), 'YYYY-MM-DD') as date,
        s.name as store_name,
        SUM(ili.gross_profit) as gross_profit
      FROM invoices i
      JOIN stores s ON i.store_id = s.id
      JOIN invoice_line_items ili ON i.id = ili.invoice_id
      WHERE i.invoice_date >= $1
        AND i.invoice_date <= $2
        AND i.status = 'ACTIVE'::"InvoiceStatus"
      GROUP BY DATE_TRUNC('${truncType}', i.invoice_date), s.name
      ORDER BY date ASC
    `, start, end);

    // Transform into format: { date: '2025-01-01', 'Store A': 100, 'Store B': 200 }
    const dateMap = new Map<string, any>();

    results.forEach(row => {
      const date = row.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date });
      }
      const entry = dateMap.get(date);
      entry[row.store_name] = Number(row.gross_profit || 0);
    });

    return Array.from(dateMap.values());
  }

  async getEmployees(id: string) {
    return this.prisma.employee.findMany({
      where: {
        stores: {
          some: { id }
        }
      },
      orderBy: { lastName: 'asc' }
    });
  }
}
