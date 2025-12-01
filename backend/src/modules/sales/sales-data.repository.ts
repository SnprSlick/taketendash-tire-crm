import { Injectable } from '@nestjs/common';
import { BaseRepository, BaseEntity } from '../../common/base.repository';
import { PrismaService } from '../../prisma/prisma.service';

export interface SalesDataEntity extends BaseEntity {
  salesDate: Date;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  paymentMethod: string;
  customerId?: string;
  employeeId?: string;
  category: string;
  description?: string;
  itemsSold: number;
  laborHours?: number;
  partsCost?: number;
  laborCost?: number;
  invoiceNumber?: string;
}

export interface SalesAnalytics {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  salesByCategory: { category: string; total: number; revenue: number }[];
  salesByEmployee: { employeeId: string; total: number; revenue: number }[];
  salesByMonth: { month: string; total: number; revenue: number }[];
  recentSales: SalesDataEntity[];
}

@Injectable()
export class SalesDataRepository extends BaseRepository<SalesDataEntity> {
  constructor(prisma: PrismaService) {
    super(prisma, 'salesData');
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<SalesDataEntity[]> {
    return this.findMany({
      where: {
        salesDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { salesDate: 'desc' },
    });
  }

  async getSalesByCustomer(customerId: string): Promise<SalesDataEntity[]> {
    return this.findMany({
      where: { customerId },
      orderBy: { salesDate: 'desc' },
    });
  }

  async getSalesByEmployee(employeeId: string): Promise<SalesDataEntity[]> {
    return this.findMany({
      where: { employeeId },
      orderBy: { salesDate: 'desc' },
    });
  }

  async getSalesAnalytics(startDate?: Date, endDate?: Date, storeId?: string, allowedStoreIds?: string[]): Promise<SalesAnalytics> {
    const whereClause: any = {};

    if (startDate && endDate) {
      whereClause.salesDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (storeId) {
      whereClause.invoice = { storeId };
    } else if (allowedStoreIds) {
      if (allowedStoreIds.length > 0) {
        whereClause.invoice = { storeId: { in: allowedStoreIds } };
      } else {
        // No access
        return {
          totalSales: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          salesByCategory: [],
          salesByEmployee: [],
          salesByMonth: [],
          recentSales: [],
        };
      }
    }

    // Get all sales data for the period
    const salesData = await this.findMany({
      where: whereClause,
      orderBy: { salesDate: 'desc' },
    });

    // Calculate basic metrics
    const totalSales = salesData.length;
    const totalRevenue = salesData.reduce((sum, sale) => sum + sale.netAmount, 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Sales by category
    const categoryMap = new Map<string, { total: number; revenue: number }>();
    salesData.forEach(sale => {
      const existing = categoryMap.get(sale.category) || { total: 0, revenue: 0 };
      categoryMap.set(sale.category, {
        total: existing.total + 1,
        revenue: existing.revenue + sale.netAmount,
      });
    });

    const salesByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      ...data,
    }));

    // Sales by employee
    const employeeMap = new Map<string, { total: number; revenue: number }>();
    salesData.forEach(sale => {
      if (sale.employeeId) {
        const existing = employeeMap.get(sale.employeeId) || { total: 0, revenue: 0 };
        employeeMap.set(sale.employeeId, {
          total: existing.total + 1,
          revenue: existing.revenue + sale.netAmount,
        });
      }
    });

    const salesByEmployee = Array.from(employeeMap.entries()).map(([employeeId, data]) => ({
      employeeId,
      ...data,
    }));

    // Sales by month (last 12 months)
    const monthMap = new Map<string, { total: number; revenue: number }>();
    salesData.forEach(sale => {
      const month = sale.salesDate.toISOString().substring(0, 7); // YYYY-MM
      const existing = monthMap.get(month) || { total: 0, revenue: 0 };
      monthMap.set(month, {
        total: existing.total + 1,
        revenue: existing.revenue + sale.netAmount,
      });
    });

    const salesByMonth = Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));

    // Recent sales (last 10)
    const recentSales = salesData.slice(0, 10);

    return {
      totalSales,
      totalRevenue,
      averageOrderValue,
      salesByCategory,
      salesByEmployee,
      salesByMonth,
      recentSales,
    };
  }

  async getTodaysSales(): Promise<SalesDataEntity[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return this.getSalesByDateRange(startOfDay, endOfDay);
  }

  async getMonthToDateSales(): Promise<SalesDataEntity[]> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return this.getSalesByDateRange(startOfMonth, today);
  }
}