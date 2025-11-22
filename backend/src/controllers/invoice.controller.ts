import {
  Controller,
  Get,
  Query,
  Param,
  Logger,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Invoice Controller
 *
 * REST API endpoints for retrieving invoice data from the database.
 * Supports pagination, filtering, and detailed invoice information.
 */

// @ApiTags('Invoices')
@Controller('invoices')
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      // Validate and parse parameters
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(limit) || 20)); // Max 100 items per page
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};

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

      if (startDate || endDate) {
        where.invoiceDate = {};
        if (startDate) {
          where.invoiceDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.invoiceDate.lte = new Date(endDate);
        }
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
            }
          },
          orderBy: { invoiceDate: 'desc' }
        }),
        this.prisma.invoice.count({ where })
      ]);

      // Transform data to match frontend format
      const transformedInvoices = invoices.map(invoice => ({
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.name,
        vehicleInfo: invoice.vehicleInfo || '',
        mileage: invoice.mileage || '0 / 0',
        invoiceDate: invoice.invoiceDate.toLocaleDateString('en-US'),
        salesperson: invoice.salesperson,
        taxAmount: Number(invoice.taxAmount),
        totalAmount: Number(invoice.totalAmount),
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
      }));

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
  async getInvoiceByNumber(@Param('invoiceNumber') invoiceNumber: string) {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { invoiceNumber },
        include: {
          customer: true,
          lineItems: {
            orderBy: { lineNumber: 'asc' }
          }
        }
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice ${invoiceNumber} not found`);
      }

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
}