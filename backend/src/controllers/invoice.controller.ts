import {
  Controller,
  Get,
  Query,
  Param,
  Logger,
  BadRequestException,
  NotFoundException,
  UseGuards,
  ForbiddenException
} from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { User } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * Invoice Controller
 *
 * REST API endpoints for retrieving invoice data from the database.
 * Supports pagination, filtering, and detailed invoice information.
 */

// @ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoiceController {
  private readonly logger = new Logger(InvoiceController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated list of invoices with line items
   */
  @Get()
  // @ApiOperation({ summary: 'Get paginated invoices with line items' })
  // @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  // @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  // @ApiQuery({ name: 'search', required: false, type: String, description: 'Search customer name or invoice number' })
  // @ApiQuery({ name: 'salesperson', required: false, type: String, description: 'Filter by salesperson' })
  // @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter from date (YYYY-MM-DD)' })
  // @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter to date (YYYY-MM-DD)' })
  // @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  // @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  async getInvoices(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('salesperson') salesperson?: string,
    @Query('storeId') storeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy: string = 'invoiceDate',
    @Query('sortOrder') sortOrder: string = 'desc',
    @User() user?: any
  ) {
    try {
      // Validate and parse parameters
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(limit) || 20)); // Max 100 items per page
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};

      // Access Control
      if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
        if (storeId) {
          // Verify access to requested store
          if (!user.stores.includes(storeId)) {
            throw new ForbiddenException('You do not have access to this store');
          }
          where.storeId = storeId;
        } else {
          // Default to all allowed stores
          where.storeId = { in: user.stores };
        }
      } else if (storeId) {
        where.storeId = storeId;
      }

      if (search) {
        where.OR = [
          {
            customer: {
              name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },
          {
            invoiceNumber: {
              contains: search,
              mode: 'insensitive'
            }
          }
        ];
      }

      if (salesperson) {
        where.salesperson = {
          contains: salesperson,
          mode: 'insensitive'
        };
      }

      if (storeId) {
        where.storeId = storeId;
      }

      if (startDate || endDate) {
        where.invoiceDate = {};
        if (startDate) {
          where.invoiceDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.invoiceDate.lte = new Date(endDate);
        }
      }

      // Determine sort order
      const orderBy: any = {};
      const direction = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
      
      if (sortBy === 'customerName') {
        orderBy.customer = { name: direction };
      } else if (['totalAmount', 'invoiceDate', 'invoiceNumber', 'salesperson'].includes(sortBy)) {
        orderBy[sortBy] = direction;
      } else {
        orderBy.invoiceDate = 'desc';
      }

      // Execute queries in parallel for better performance
      const [invoices, total] = await Promise.all([
        this.prisma.invoice.findMany({
          skip,
          take: limitNum,
          where,
          include: {
            customer: true,
            lineItems: {
              orderBy: { lineNumber: 'asc' }
            },
            reconciliationRecords: true
          },
          orderBy
        }),
        this.prisma.invoice.count({ where })
      ]);

      // Transform data to match frontend format
      const transformedInvoices = invoices.map((invoice: any) => {
        const calculatedGrossProfit = invoice.lineItems.reduce((sum: any, item: any) => sum + Number(item.grossProfit || 0), 0);
        const totalAmount = Number(invoice.totalAmount);
        
        // Calculate profit margin safely
        let profitMargin = 0;
        if (totalAmount > 0) {
          profitMargin = (calculatedGrossProfit / totalAmount) * 100;
        }

        // Calculate avg profit per unit
        const totalUnits = invoice.lineItems.reduce((sum: any, item: any) => sum + Number(item.quantity || 0), 0);
        const avgProfitPerUnit = totalUnits > 0 ? calculatedGrossProfit / totalUnits : 0;
        
        // Calculate recon difference
        const isGS = invoice.invoiceNumber.toUpperCase().includes('GS');
        let reconDifference = 0;
        
        if (!isGS) {
          reconDifference = invoice.reconciliationRecords.reduce((sum: any, r: any) => sum + Number(r.difference || 0), 0);
        }

        return {
          id: invoice.id, // Include ID for navigation
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customer.name,
          customerId: invoice.customer.id, // Include Customer ID for navigation
          vehicleInfo: invoice.vehicleInfo || '',
          mileage: invoice.mileage || '0 / 0',
          invoiceDate: invoice.invoiceDate.toISOString(), // Use ISO string for consistent parsing
          salesperson: invoice.salesperson,
          taxAmount: Number(invoice.taxAmount),
          totalAmount: totalAmount,
          grossProfit: calculatedGrossProfit,
          profitMargin: profitMargin, // Add profit margin
          avgProfitPerUnit,
          reconDifference,
          lineItemsCount: invoice.lineItems.length,
          lineItems: invoice.lineItems.map((item: any) => ({
            line: item.lineNumber || 0,
            productCode: item.productCode,
            description: item.description,
            adjustment: item.adjustment,
            quantity: Number(item.quantity),
            partsCost: Number(item.partsCost),
            laborCost: Number(item.laborCost),
            fet: Number(item.fet),
            lineTotal: Number(item.lineTotal),
            cost: Number(item.costPrice),
            grossProfitMargin: Number(item.grossProfitMargin),
            grossProfit: Number(item.grossProfit)
          }))
        };
      });

      const totalPages = Math.ceil(total / limitNum);
      const totalLineItems = transformedInvoices.reduce((sum, inv) => sum + inv.lineItems.length, 0);

      this.logger.log(`Retrieved ${transformedInvoices.length} invoices (page ${pageNum}/${totalPages})`);

      return {
        success: true,
        data: {
          invoices: transformedInvoices,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          },
          summary: {
            totalInvoices: total,
            totalLineItems: totalLineItems,
            displayedInvoices: transformedInvoices.length,
            displayedLineItems: totalLineItems
          }
        }
      };

    } catch (error) {
      this.logger.error(`Failed to retrieve invoices: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to retrieve invoices: ${error.message}`);
    }
  }

  /**
   * Get specific invoice by invoice number
   */
  @Get(':invoiceNumber')
  // @ApiOperation({ summary: 'Get specific invoice by invoice number' })
  // @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  // @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoiceByNumber(
    @Param('invoiceNumber') invoiceNumber: string,
    @User() user?: any
  ) {
    try {
      const invoice: any = await this.prisma.invoice.findUnique({
        where: { invoiceNumber },
        include: {
          customer: true,
          lineItems: {
            orderBy: { lineNumber: 'asc' }
          },
          reconciliationRecords: true
        }
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice ${invoiceNumber} not found`);
      }

      // Access Control
      if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
        if (!user.stores.includes(invoice.storeId)) {
          throw new ForbiddenException('You do not have access to this invoice');
        }
      }

      // Calculate recon totals
      const reconCommission = invoice.reconciliationRecords.reduce((sum, r) => sum + Number(r.commission || 0), 0);
      
      // Logic for GS invoices
      const isGS = invoice.invoiceNumber.toUpperCase().includes('GS');
      let reconDifference = 0;

      if (!isGS) {
        // For other accounts: Use the difference column
        reconDifference = invoice.reconciliationRecords.reduce((sum, r) => sum + Number(r.difference || 0), 0);
      }

      const calculatedGrossProfit = invoice.lineItems.reduce((sum, item) => sum + Number(item.grossProfit || 0), 0);

      // Transform to frontend format
      const transformedInvoice = {
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.name,
        vehicleInfo: invoice.vehicleInfo || '',
        mileage: invoice.mileage || '0 / 0',
        invoiceDate: invoice.invoiceDate.toLocaleDateString('en-US'),
        salesperson: invoice.salesperson,
        taxAmount: Number(invoice.taxAmount),
        totalAmount: Number(invoice.totalAmount),
        reconCommission,
        reconDifference,
        // totalWithRecon removed as requested - recon only affects profit
        adjustedProfit: calculatedGrossProfit + reconDifference,
        lineItemsCount: invoice.lineItems.length,
        lineItems: invoice.lineItems.map(item => ({
          line: item.lineNumber || 0,
          productCode: item.productCode,
          description: item.description,
          adjustment: item.adjustment,
          quantity: Number(item.quantity),
          partsCost: Number(item.partsCost),
          laborCost: Number(item.laborCost),
          fet: Number(item.fet),
          lineTotal: Number(item.lineTotal),
          cost: Number(item.costPrice),
          grossProfitMargin: Number(item.grossProfitMargin),
          grossProfit: Number(item.grossProfit)
        }))
      };

      return {
        success: true,
        data: {
          invoice: transformedInvoice
        }
      };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve invoice ${invoiceNumber}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to retrieve invoice: ${error.message}`);
    }
  }

  /**
   * Get invoice statistics
   */
  @Get('/stats/summary')
  // @ApiOperation({ summary: 'Get invoice statistics' })
  // @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getInvoiceStats() {
    try {
      const [
        totalInvoices,
        totalLineItems,
        recentInvoice,
        dateRange,
        topSalesperson
      ] = await Promise.all([
        this.prisma.invoice.count(),
        this.prisma.invoiceLineItem.count(),
        this.prisma.invoice.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { invoiceDate: true }
        }),
        this.prisma.invoice.aggregate({
          _min: { invoiceDate: true },
          _max: { invoiceDate: true }
        }),
        this.prisma.invoice.groupBy({
          by: ['salesperson'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 1
        })
      ]);

      return {
        success: true,
        data: {
          totalInvoices,
          totalLineItems,
          lastImported: recentInvoice?.invoiceDate,
          dateRange: {
            earliest: dateRange._min.invoiceDate,
            latest: dateRange._max.invoiceDate
          },
          topSalesperson: topSalesperson[0]?.salesperson || null,
          topSalespersonCount: topSalesperson[0]?._count.id || 0
        }
      };

    } catch (error) {
      this.logger.error(`Failed to retrieve statistics: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to retrieve statistics: ${error.message}`);
    }
  }

  /**
   * Get sales analytics summary
   */
  @Get('stats/sales')
  async getAnalyticsSummary(
    @Query('period') period: string = '30',
    @Query('storeId') storeId?: string,
    @User() user?: any
  ) {
    try {
      const days = parseInt(period) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where: any = {
        invoiceDate: {
          gte: startDate
        },
        status: 'ACTIVE'
      };

      // Access Control
      if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
        if (storeId) {
          if (!user.stores.includes(storeId)) {
            throw new ForbiddenException('You do not have access to this store');
          }
          where.storeId = storeId;
        } else {
          where.storeId = { in: user.stores };
        }
      } else if (storeId) {
        where.storeId = storeId;
      }

      // 1. Basic Aggregates
      console.log('Step 1: Basic Aggregates');
      const aggregates = await this.prisma.invoice.aggregate({
        where,
        _sum: {
          totalAmount: true,
          grossProfit: true,
          laborCost: true,
          partsCost: true
        },
        _count: {
          id: true
        }
      });

      let totalRevenue = Number(aggregates._sum.totalAmount || 0);
      let totalProfit = Number(aggregates._sum.grossProfit || 0);
      const totalInvoices = aggregates._count.id || 0;
      const averageOrderValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
      let profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // 2. Category Breakdown (Revenue by Category)
      console.log('Step 2: Category Breakdown');
      // Updated to match Tire Analytics logic for identifying tires
      
      let storeCondition = Prisma.empty;
      if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
        if (storeId) {
          storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
        } else {
          if (user.stores.length > 0) {
            storeCondition = Prisma.sql`AND i.store_id IN (${Prisma.join(user.stores)})`;
          } else {
            storeCondition = Prisma.sql`AND 1=0`;
          }
        }
      } else if (storeId) {
        storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
      }

      const categoryStats = await this.prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN p."isTire" = true AND p."quality" IN ('PREMIUM', 'STANDARD', 'ECONOMY') AND p."brand" != 'Unknown' THEN 'TIRES'
            ELSE ili.category::text
          END as category,
          SUM(line_total) as revenue,
          SUM(ili.gross_profit) as profit,
          SUM(quantity) as quantity
        FROM invoice_line_items ili
        JOIN invoices i ON i.id = ili.invoice_id
        LEFT JOIN "tire_master_products" p ON ili.tire_master_product_id = p.id
        WHERE i.invoice_date >= ${startDate} 
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${storeCondition}
        GROUP BY 1
      `;

      // Recalculate profit if missing from invoice aggregate
      if (totalProfit === 0 && Array.isArray(categoryStats) && categoryStats.length > 0) {
        totalProfit = categoryStats.reduce((acc, curr: any) => {
          return acc + (Number(curr.profit) || 0);
        }, 0);
        profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      }

      // 3. Top Salespeople
      console.log('Step 3: Top Salespeople');
      const whereSalespeople: any = {
        invoiceDate: {
          gte: startDate
        },
        status: 'ACTIVE'
      };

      if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
        if (storeId) {
          whereSalespeople.storeId = storeId;
        } else {
          whereSalespeople.storeId = { in: user.stores };
        }
      } else if (storeId) {
        whereSalespeople.storeId = storeId;
      }

      const topSalespeople = await this.prisma.invoice.groupBy({
        by: ['salesperson'],
        where: whereSalespeople,
        _sum: {
          totalAmount: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            totalAmount: 'desc'
          }
        },
        take: 5
      });

      // 4. Top Customers
      console.log('Step 4: Top Customers');
      // We need to join with customer table, so groupBy on invoice.customerId won't give us names directly.
      // But we can fetch top IDs then fetch names, or use raw query. Raw query is cleaner here.
      const topCustomers = await this.prisma.$queryRaw`
        SELECT 
          c.id,
          c.name,
          COUNT(i.id)::int as invoice_count,
          SUM(i.total_amount) as total_spent
        FROM invoices i
        JOIN invoice_customers c ON c.id = i.customer_id
        WHERE i.invoice_date >= ${startDate} AND i.status = 'ACTIVE'::"InvoiceStatus"
        ${storeCondition}
        GROUP BY c.id, c.name
        ORDER BY total_spent DESC
        LIMIT 5
      `;

      // 5. Sales Trend

      // 5. Sales Trend
      console.log('Step 5: Sales Trend');
      let salesTrend;
      
      if (days > 90) {
        // Group by Month
        salesTrend = await this.prisma.$queryRaw`
          SELECT 
            TO_CHAR(i.invoice_date, 'Mon') as month,
            TO_CHAR(i.invoice_date, 'YYYY-MM') as sort_key,
            SUM(ili.line_total) as revenue,
            SUM(ili.gross_profit) as sales,
            COUNT(DISTINCT i.id)::int as orders
          FROM invoices i
          JOIN invoice_line_items ili ON i.id = ili.invoice_id
          WHERE i.invoice_date >= ${startDate} AND i.status = 'ACTIVE'::"InvoiceStatus"
          GROUP BY TO_CHAR(i.invoice_date, 'Mon'), TO_CHAR(i.invoice_date, 'YYYY-MM')
          ORDER BY sort_key
        `;
      } else {
        // Group by Day
        salesTrend = await this.prisma.$queryRaw`
          SELECT 
            TO_CHAR(i.invoice_date, 'Mon DD') as month,
            TO_CHAR(i.invoice_date, 'YYYY-MM-DD') as sort_key,
            SUM(ili.line_total) as revenue,
            SUM(ili.gross_profit) as sales,
            COUNT(DISTINCT i.id)::int as orders
          FROM invoices i
          JOIN invoice_line_items ili ON i.id = ili.invoice_id
          WHERE i.invoice_date >= ${startDate} AND i.status = 'ACTIVE'::"InvoiceStatus"
          GROUP BY TO_CHAR(i.invoice_date, 'Mon DD'), TO_CHAR(i.invoice_date, 'YYYY-MM-DD')
          ORDER BY sort_key
        `;
      }

      // 6. Generate Insights
      console.log('Step 6: Insights');
      const insights = [];
      
      // Margin Insight
      if (profitMargin < 20) {
        insights.push({
          type: 'WARNING',
          title: 'Low Profit Margins',
          description: `Current profit margin is ${profitMargin.toFixed(1)}%, which is below the target of 20%. Check pricing on recent bulk orders.`,
          impact: 'HIGH'
        });
      } else if (profitMargin > 35) {
        insights.push({
          type: 'OPPORTUNITY',
          title: 'Strong Profitability',
          description: `Margins are healthy at ${profitMargin.toFixed(1)}%. Consider reinvesting in marketing for high-margin categories.`,
          impact: 'POSITIVE'
        });
      }

      // Category Insight
      const tireRevenue = (categoryStats as any[]).find(c => c.category === 'TIRES')?.revenue || 0;
      const serviceRevenue = (categoryStats as any[]).find(c => c.category === 'SERVICES')?.revenue || 0;
      
      if (serviceRevenue > 0 && tireRevenue > 0) {
        const serviceAttachRate = (serviceRevenue / tireRevenue) * 100;
        if (serviceAttachRate < 50) {
           insights.push({
            type: 'OPPORTUNITY',
            title: 'Increase Service Attachment',
            description: `Service revenue is only ${serviceAttachRate.toFixed(1)}% of tire revenue. Focus on selling alignments and balancing with tire sets.`,
            impact: 'MEDIUM'
          });
        }
      }

      return {
        success: true,
        data: {
          basicAnalytics: {
            totalSales: totalInvoices,
            totalRevenue,
            averageOrderValue,
            totalProfit,
            profitMargin
          },
          salesTrend,
          categoryBreakdown: categoryStats,
          topSalespeople,
          topCustomers,
          insights,
          kpis: [
            { name: 'Revenue', value: `$${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`, trend: 'neutral' },
            { name: 'Profit Margin', value: `${profitMargin.toFixed(1)}%`, trend: profitMargin > 30 ? 'up' : 'down' },
            { name: 'Avg Order', value: `$${averageOrderValue.toFixed(0)}`, trend: 'neutral' },
            { name: 'Invoices', value: totalInvoices, trend: 'neutral' }
          ]
        }
      };

    } catch (error) {
      console.error('ANALYTICS ERROR:', error);
      this.logger.error('Failed to get analytics summary', error);
      throw new BadRequestException('Failed to calculate analytics');
    }
  }

  /**
   * Get detailed salesperson performance report
   */
  @Get('reports/salespeople')
  async getSalespersonReport(
    @Query('startDate') startDateStr?: string, 
    @Query('endDate') endDateStr?: string,
    @Query('search') search?: string,
    @Query('storeId') storeId?: string,
    @Query('sortBy') sortBy: string = 'total_revenue',
    @Query('sortOrder') sortOrder: string = 'desc',
    @User() user?: any
  ) {
    try {
      const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
      const endDate = endDateStr ? new Date(endDateStr) : new Date();
      
      // Whitelist sort columns to prevent SQL injection
      const allowedSorts = ['salesperson', 'invoice_count', 'total_revenue', 'total_profit', 'profit_margin', 'avg_ticket', 'avg_profit_per_unit'];
      const sortColumn = allowedSorts.includes(sortBy) ? sortBy : 'total_revenue';
      const orderDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Build search condition
      let searchCondition = Prisma.sql``;
      if (search) {
        searchCondition = Prisma.sql`AND (i.salesperson ILIKE ${`%${search}%`} OR i.invoice_number ILIKE ${`%${search}%`})`;
      }

      // Build store condition
      let storeCondition = Prisma.sql``;
      if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
        if (storeId) {
          if (!user.stores.includes(storeId)) {
            throw new ForbiddenException('You do not have access to this store');
          }
          storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
        } else {
          if (user.stores.length > 0) {
            storeCondition = Prisma.sql`AND i.store_id IN (${Prisma.join(user.stores)})`;
          } else {
            storeCondition = Prisma.sql`AND 1=0`;
          }
        }
      } else if (storeId) {
        storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
      }

      // Build order by clause
      let orderByClause;
      if (['avg_ticket', 'avg_profit_per_unit'].includes(sortColumn)) {
        // Prioritize >= 50 invoices for volatile metrics
        orderByClause = Prisma.sql`ORDER BY CASE WHEN COUNT(DISTINCT i.id) >= 50 THEN 1 ELSE 0 END DESC, ${Prisma.raw(sortColumn)} ${Prisma.raw(orderDirection)}`;
      } else {
        orderByClause = Prisma.sql`ORDER BY ${Prisma.raw(sortColumn)} ${Prisma.raw(orderDirection)}`;
      }

      const report: any[] = await this.prisma.$queryRaw`
        SELECT 
          i.salesperson,
          COUNT(DISTINCT i.id)::int as invoice_count,
          SUM(ili.line_total) as total_revenue,
          SUM(ili.gross_profit) as total_profit,
          COALESCE(SUM(ili.quantity), 0) as total_units,
          CASE 
            WHEN SUM(ili.line_total) > 0 THEN (SUM(ili.gross_profit) / SUM(ili.line_total) * 100)
            ELSE 0 
          END as profit_margin,
          SUM(ili.line_total) / COUNT(DISTINCT i.id) as avg_ticket,
          CASE
            WHEN SUM(ili.quantity) > 0 THEN SUM(ili.gross_profit) / SUM(ili.quantity)
            ELSE 0
          END as avg_profit_per_unit
        FROM invoices i
        JOIN invoice_line_items ili ON i.id = ili.invoice_id
        WHERE i.invoice_date >= ${startDate} 
          AND i.invoice_date <= ${endDate} 
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${searchCondition}
          ${storeCondition}
        GROUP BY i.salesperson
        ${orderByClause}
      `;

      // Fetch labor/parts breakdown separately to avoid join explosion
      const laborStats: any[] = await this.prisma.$queryRaw`
        SELECT 
          i.salesperson,
          SUM(ml.labor) as total_labor,
          SUM(ml.parts) as total_parts
        FROM invoices i
        JOIN mechanic_labor ml ON i.invoice_number = ml.invoice_number
        WHERE i.invoice_date >= ${startDate} 
          AND i.invoice_date <= ${endDate} 
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${searchCondition}
          ${storeCondition}
        GROUP BY i.salesperson
      `;

      // Merge labor stats into report
      const mergedReport = report.map(r => {
        const stats = laborStats.find(s => s.salesperson === r.salesperson);
        return {
          ...r,
          total_labor: stats ? Number(stats.total_labor) : 0,
          total_parts: stats ? Number(stats.total_parts) : 0
        };
      });

      return { success: true, data: mergedReport };
    } catch (error) {
      this.logger.error('Failed to get salesperson report', error);
      throw new BadRequestException('Failed to generate salesperson report');
    }
  }

  /**
   * Get detailed customer performance report
   */
    @Get('reports/customers')
  async getCustomerReport(
    @Query('startDate') startDateStr?: string, 
    @Query('endDate') endDateStr?: string,
    @Query('search') search?: string,
    @Query('storeId') storeId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('sortBy') sortBy: string = 'total_revenue',
    @Query('sortOrder') sortOrder: string = 'desc',
    @User() user?: any
  ) {
    try {
      const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
      const endDate = endDateStr ? new Date(endDateStr) : new Date();
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
      const offset = (pageNum - 1) * limitNum;

      // Whitelist sort columns
      const allowedSorts = ['customer_name', 'invoice_count', 'total_revenue', 'total_profit', 'profit_margin', 'avg_ticket'];
      const sortColumn = allowedSorts.includes(sortBy) ? sortBy : 'total_revenue';
      const orderDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Build search condition
      let searchCondition = Prisma.sql``;
      if (search) {
        searchCondition = Prisma.sql`AND (c.name ILIKE ${`%${search}%`} OR c.customer_code ILIKE ${`%${search}%`})`;
      }

      // Build store condition
      let storeCondition = Prisma.sql``;
      if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
        if (storeId) {
          if (!user.stores.includes(storeId)) {
            throw new ForbiddenException('You do not have access to this store');
          }
          storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
        } else {
          if (user.stores.length > 0) {
            storeCondition = Prisma.sql`AND i.store_id IN (${Prisma.join(user.stores)})`;
          } else {
            storeCondition = Prisma.sql`AND 1=0`;
          }
        }
      } else if (storeId) {
        storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
      }

      // Get total count for pagination
      const countResult = await this.prisma.$queryRaw`
        SELECT COUNT(DISTINCT c.id)::int as count
        FROM invoice_customers c
        JOIN invoices i ON c.id = i.customer_id
        WHERE i.invoice_date >= ${startDate} 
          AND i.invoice_date <= ${endDate} 
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${searchCondition}
          ${storeCondition}
      `;

      const totalCount = countResult[0]?.count || 0;

      const report = await this.prisma.$queryRaw`
        SELECT 
          c.id as customer_id,
          c.name as customer_name,
          COUNT(DISTINCT i.id)::int as invoice_count,
          SUM(ili.line_total) as total_revenue,
          SUM(ili.gross_profit) as total_profit,
          CASE 
            WHEN SUM(ili.line_total) > 0 THEN (SUM(ili.gross_profit) / SUM(ili.line_total) * 100)
            ELSE 0 
          END as profit_margin,
          SUM(ili.line_total) / COUNT(DISTINCT i.id) as avg_ticket,
          MAX(i.invoice_date) as last_purchase_date
        FROM invoice_customers c
        JOIN invoices i ON c.id = i.customer_id
        JOIN invoice_line_items ili ON i.id = ili.invoice_id
        WHERE i.invoice_date >= ${startDate} 
          AND i.invoice_date <= ${endDate} 
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${searchCondition}
          ${storeCondition}
        GROUP BY c.id, c.name
        ORDER BY ${Prisma.raw(sortColumn)} ${Prisma.raw(orderDirection)}
        LIMIT ${limitNum} OFFSET ${offset}
      `;

      return {
        success: true,
        data: report,
        meta: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      };
    } catch (error) {
      this.logger.error('Failed to get customer report', error);
      throw new BadRequestException('Failed to generate customer report');
    }
  }
  @Get('reports/monthly')
  async getMonthlyReport(
    @Query('year') yearStr?: string,
    @Query('storeId') storeId?: string,
    @User() user?: any
  ) {
    try {
      const year = parseInt(yearStr) || new Date().getFullYear();
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      let storeCondition = Prisma.sql``;
      if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
        if (storeId) {
          if (!user.stores.includes(storeId)) {
            throw new ForbiddenException('You do not have access to this store');
          }
          storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
        } else {
          if (user.stores.length > 0) {
            storeCondition = Prisma.sql`AND i.store_id IN (${Prisma.join(user.stores)})`;
          } else {
            storeCondition = Prisma.sql`AND 1=0`;
          }
        }
      } else if (storeId) {
        storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
      }

      const report = await this.prisma.$queryRaw`
        SELECT 
          TO_CHAR(i.invoice_date, 'YYYY-MM') as month_key,
          TO_CHAR(i.invoice_date, 'Month') as month_name,
          COUNT(DISTINCT i.id)::int as invoice_count,
          SUM(ili.line_total) as total_revenue,
          SUM(ili.gross_profit) as total_profit,
          CASE 
            WHEN SUM(ili.line_total) > 0 THEN (SUM(ili.gross_profit) / SUM(ili.line_total) * 100)
            ELSE 0 
          END as profit_margin
        FROM invoices i
        JOIN invoice_line_items ili ON i.id = ili.invoice_id
        WHERE i.invoice_date >= ${startDate} AND i.invoice_date <= ${endDate} AND i.status = 'ACTIVE'::"InvoiceStatus"
        ${storeCondition}
        GROUP BY TO_CHAR(i.invoice_date, 'YYYY-MM'), TO_CHAR(i.invoice_date, 'Month')
        ORDER BY month_key
      `;

      return { success: true, data: report };
    } catch (error) {
      this.logger.error('Failed to get monthly report', error);
      throw new BadRequestException('Failed to generate monthly report');
    }
  }

  /**
   * Get specific customer details
   */
  @Get('reports/customers/:id')
  async getCustomerDetails(
    @Param('id') id: string,
    @Query('year') yearStr?: string,
    @Query('storeId') storeId?: string,
    @User() user?: any
  ) {
    try {
      const year = parseInt(yearStr) || new Date().getFullYear();
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      let storeCondition = Prisma.sql``;
      if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
        if (storeId) {
          if (!user.stores.includes(storeId)) {
            throw new ForbiddenException('You do not have access to this store');
          }
          storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
        } else {
          if (user.stores.length > 0) {
            storeCondition = Prisma.sql`AND i.store_id IN (${Prisma.join(user.stores)})`;
          } else {
            storeCondition = Prisma.sql`AND 1=0`;
          }
        }
      } else if (storeId) {
        storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
      }

      // 1. Customer Info & Totals
      const customerInfo = await this.prisma.invoiceCustomer.findUnique({
        where: { id },
        include: {
          _count: {
            select: { invoices: true }
          }
        }
      });

      if (!customerInfo) {
        throw new NotFoundException('Customer not found');
      }

      // 2. Monthly Stats
      const monthlyStats = await this.prisma.$queryRaw`
        SELECT 
          TO_CHAR(i.invoice_date, 'YYYY-MM') as month_key,
          TO_CHAR(i.invoice_date, 'Month') as month_name,
          COUNT(DISTINCT i.id)::int as invoice_count,
          SUM(ili.line_total) as total_revenue,
          SUM(ili.gross_profit) as total_profit,
          CASE 
            WHEN SUM(ili.line_total) > 0 THEN (SUM(ili.gross_profit) / SUM(ili.line_total) * 100)
            ELSE 0 
          END as profit_margin
        FROM invoices i
        JOIN invoice_line_items ili ON i.id = ili.invoice_id
        WHERE i.customer_id = ${id} 
          AND i.invoice_date >= ${startDate} 
          AND i.invoice_date <= ${endDate} 
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${storeCondition}
        GROUP BY TO_CHAR(i.invoice_date, 'YYYY-MM'), TO_CHAR(i.invoice_date, 'Month')
        ORDER BY month_key
      `;

      // 3. Recent Invoices
      const recentInvoices = await this.prisma.$queryRaw`
        SELECT 
          i.id,
          i.invoice_number as "invoiceNumber",
          i.invoice_date as "invoiceDate",
          i.total_amount as "totalAmount",
          COALESCE(SUM(ili.gross_profit), 0) as "grossProfit",
          i.salesperson,
          i.vehicle_info as "vehicleInfo"
        FROM invoices i
        LEFT JOIN invoice_line_items ili ON i.id = ili.invoice_id
        WHERE i.customer_id = ${id} 
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${storeCondition}
        GROUP BY i.id
        ORDER BY i.invoice_date DESC
        LIMIT 20
      `;

      // 4. Top Categories
      const topCategories = await this.prisma.$queryRaw`
        SELECT 
          ili.category,
          SUM(ili.line_total) as total_revenue,
          SUM(ili.quantity) as total_quantity
        FROM invoices i
        JOIN invoice_line_items ili ON i.id = ili.invoice_id
        WHERE i.customer_id = ${id} 
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${storeCondition}
        GROUP BY ili.category
        ORDER BY total_revenue DESC
        LIMIT 5
      `;

      return {
        success: true,
        data: {
          customer: customerInfo,
          monthlyStats,
          recentInvoices,
          topCategories
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get details for customer ${id}`, error);
      throw new BadRequestException('Failed to get customer details');
    }
  }

  /**
   * Get specific salesperson details
   */
  @Get('reports/salespeople/:name')
  async getSalespersonDetails(
    @Param('name') name: string,
    @Query('year') yearStr?: string,
    @Query('storeId') storeId?: string,
    @User() user?: any
  ) {
    try {
      const decodedName = decodeURIComponent(name);
      let salespersonName = decodedName;

      // Check if name is an ID (simple heuristic: length 25 and alphanumeric)
      if (decodedName.length === 25 && !decodedName.includes(' ')) {
         const employee = await this.prisma.employee.findUnique({
           where: { id: decodedName }
         });
         if (employee) {
           salespersonName = `${employee.firstName} ${employee.lastName}`;
           this.logger.log(`Resolved salesperson ID ${decodedName} to name ${salespersonName}`);
         }
      }

      this.logger.log(`Getting details for salesperson: ${salespersonName}, year: ${yearStr}, storeId: ${storeId}, user: ${user?.username}`);
      
      // Restrict Salesperson to their own report
      if (user && user.role === 'SALESPERSON') {
         if (!user.employeeName) {
             this.logger.warn(`Salesperson ${user.username} has no linked employee record`);
             throw new ForbiddenException('Salesperson account not linked to employee record');
         }
         
         if (user.employeeName.toUpperCase() !== salespersonName.toUpperCase()) {
             this.logger.warn(`Salesperson ${user.username} (${user.employeeName}) tried to view report for ${salespersonName}`);
             throw new ForbiddenException('You can only view your own report');
         }
      }

      const year = parseInt(yearStr) || new Date().getFullYear();
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      let storeCondition = Prisma.sql``;
      if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
        if (user.role === 'SALESPERSON') {
          // Salespeople can see their own data across all stores
          if (storeId) {
            storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
          }
        } else {
          if (storeId) {
            if (!user.stores.includes(storeId)) {
              throw new ForbiddenException('You do not have access to this store');
            }
            storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
          } else {
            if (user.stores.length > 0) {
              storeCondition = Prisma.sql`AND i.store_id IN (${Prisma.join(user.stores)})`;
            } else {
              storeCondition = Prisma.sql`AND 1=0`;
            }
          }
        }
      } else if (storeId) {
        storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
      }

      // 1. Monthly Stats
      const monthlyStats = await this.prisma.$queryRaw`
        SELECT 
          TO_CHAR(i.invoice_date, 'YYYY-MM') as month_key,
          TO_CHAR(i.invoice_date, 'Month') as month_name,
          COUNT(DISTINCT i.id)::int as invoice_count,
          COALESCE(SUM(ili.line_total), 0) as total_revenue,
          COALESCE(SUM(ili.gross_profit), 0) as total_profit,
          COALESCE(SUM(ili.quantity), 0) as total_units,
          CASE 
            WHEN COALESCE(SUM(ili.line_total), 0) > 0 THEN (COALESCE(SUM(ili.gross_profit), 0) / SUM(ili.line_total) * 100)
            ELSE 0 
          END as profit_margin
        FROM invoices i
        LEFT JOIN invoice_line_items ili ON i.id = ili.invoice_id
        WHERE i.salesperson = ${salespersonName} 
          AND i.invoice_date >= ${startDate} 
          AND i.invoice_date <= ${endDate} 
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${storeCondition}
        GROUP BY TO_CHAR(i.invoice_date, 'YYYY-MM'), TO_CHAR(i.invoice_date, 'Month')
        ORDER BY month_key
      `;

      // 2. Recent Invoices
      const recentInvoicesRaw: any[] = await this.prisma.$queryRaw`
        SELECT 
          i.id,
          i.invoice_number as "invoiceNumber",
          i.invoice_date as "invoiceDate",
          i.total_amount as "totalAmount",
          COALESCE(SUM(ili.gross_profit), 0) as "grossProfit",
          COALESCE(SUM(ili.quantity), 0) as "totalUnits",
          i.salesperson,
          i.vehicle_info as "vehicleInfo",
          c.name as "customerName",
          (SELECT SUM(commission) FROM reconciliation_records WHERE "matchedInvoiceId" = i.id) as "commission"
        FROM invoices i
        LEFT JOIN invoice_line_items ili ON i.id = ili.invoice_id
        LEFT JOIN invoice_customers c ON i.customer_id = c.id
        WHERE i.salesperson = ${salespersonName} 
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${storeCondition}
        GROUP BY i.id, c.name
        ORDER BY i.invoice_date DESC
        LIMIT 20
      `;

      const recentInvoices = recentInvoicesRaw.map(inv => ({
        ...inv,
        customer: { name: inv.customerName }
      }));

      // 3. Top Customers for this salesperson
      const topCustomers = await this.prisma.$queryRaw`
        SELECT 
          c.id as customer_id,
          c.name,
          COUNT(DISTINCT i.id)::int as invoice_count,
          SUM(i.total_amount) as total_revenue
        FROM invoices i
        JOIN invoice_customers c ON c.id = i.customer_id
        WHERE i.salesperson = ${salespersonName} 
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${storeCondition}
        GROUP BY c.id, c.name
        ORDER BY total_revenue DESC
        LIMIT 10
      `;

      // 4. Total Commission
      const commissionStats: any[] = await this.prisma.$queryRaw`
        SELECT SUM(rr.commission) as total_commission
        FROM invoices i
        JOIN reconciliation_records rr ON i.id = rr."matchedInvoiceId"
        WHERE i.salesperson = ${salespersonName}
          AND i.invoice_date >= ${startDate}
          AND i.invoice_date <= ${endDate}
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${storeCondition}
      `;
      const totalCommission = commissionStats[0]?.total_commission || 0;

      // 5. Labor/Parts Breakdown
      // Use invoice_line_items for accurate breakdown as mechanic_labor only tracks mechanic-assigned items
      const laborStats: any[] = await this.prisma.$queryRaw`
        SELECT 
          SUM(ili.labor_cost) as total_labor,
          SUM(ili.parts_cost) as total_parts
        FROM invoices i
        JOIN invoice_line_items ili ON i.id = ili.invoice_id
        WHERE i.salesperson = ${salespersonName}
          AND i.invoice_date >= ${startDate}
          AND i.invoice_date <= ${endDate}
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${storeCondition}
      `;
      
      const totalLabor = laborStats[0]?.total_labor ? Number(laborStats[0].total_labor) : 0;
      const totalParts = laborStats[0]?.total_parts ? Number(laborStats[0].total_parts) : 0;

      return {
        salesperson: salespersonName,
        monthlyStats,
        recentInvoices,
        topCustomers,
        totalCommission,
        totalLabor,
        totalParts
      };
    } catch (error) {
      this.logger.error(`Failed to get details for salesperson ${name}`, error);
      throw new BadRequestException('Failed to get salesperson details');
    }
  }

  /**
   * Get salesperson commission details
   */
  @Get('reports/salespeople/:name/commissions')
  async getSalespersonCommissions(
    @Param('name') name: string,
    @Query('year') yearStr?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('storeId') storeId?: string,
    @User() user?: any
  ) {
    try {
      const decodedName = decodeURIComponent(name);
      let salespersonName = decodedName;

      // Check if name is an ID
      if (decodedName.length === 25 && !decodedName.includes(' ')) {
         const employee = await this.prisma.employee.findUnique({
           where: { id: decodedName }
         });
         if (employee) {
           salespersonName = `${employee.firstName} ${employee.lastName}`;
         }
      }

      const year = parseInt(yearStr) || new Date().getFullYear();
      const page = parseInt(pageStr) || 1;
      const limit = parseInt(limitStr) || 50;
      const offset = (page - 1) * limit;
      
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      let storeCondition = Prisma.sql``;
      if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
        if (user.role === 'SALESPERSON') {
          // Salespeople can see their own data across all stores
          if (storeId) {
            storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
          }
        } else {
          if (storeId) {
            if (!user.stores.includes(storeId)) {
              throw new ForbiddenException('You do not have access to this store');
            }
            storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
          } else {
            if (user.stores.length > 0) {
              storeCondition = Prisma.sql`AND i.store_id IN (${Prisma.join(user.stores)})`;
            } else {
              storeCondition = Prisma.sql`AND 1=0`;
            }
          }
        }
      } else if (storeId) {
        storeCondition = Prisma.sql`AND i.store_id = ${storeId}`;
      }

      const commissions: any[] = await this.prisma.$queryRaw`
        SELECT 
          rr.id,
          rr.commission,
          rr."invoiceDate",
          rr.difference as "reconDifference",
          i.invoice_number as "invoiceNumber",
          i.total_amount as "totalAmount",
          i.gross_profit as "grossProfit",
          c.name as "customerName"
        FROM reconciliation_records rr
        JOIN invoices i ON rr."matchedInvoiceId" = i.id
        LEFT JOIN invoice_customers c ON i.customer_id = c.id
        WHERE i.salesperson = ${salespersonName}
          AND i.invoice_date >= ${startDate}
          AND i.invoice_date <= ${endDate}
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${storeCondition}
        ORDER BY rr."invoiceDate" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const totalCount: any[] = await this.prisma.$queryRaw`
        SELECT COUNT(rr.id)::int as count
        FROM reconciliation_records rr
        JOIN invoices i ON rr."matchedInvoiceId" = i.id
        WHERE i.salesperson = ${salespersonName}
          AND i.invoice_date >= ${startDate}
          AND i.invoice_date <= ${endDate}
          AND i.status = 'ACTIVE'::"InvoiceStatus"
          ${storeCondition}
      `;

      const mappedCommissions = commissions.map(c => ({
        ...c,
        customer: { name: c.customerName },
        totalWithRecon: Number(c.totalAmount) + Number(c.reconDifference),
        adjustedProfit: Number(c.grossProfit) + Number(c.reconDifference)
      }));

      return {
        salesperson: salespersonName,
        data: mappedCommissions,
        meta: {
          total: totalCount[0]?.count || 0,
          page,
          limit,
          totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get commissions for salesperson ${name}`, error);
      throw new BadRequestException('Failed to get salesperson commissions');
    }
  }
}