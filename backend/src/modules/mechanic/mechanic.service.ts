import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMechanicLaborDto } from './dto/create-mechanic-labor.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MechanicService {
  constructor(private prisma: PrismaService) {}

  async create(createMechanicLaborDto: CreateMechanicLaborDto) {
    return this.prisma.mechanicLabor.create({
      data: createMechanicLaborDto,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: any;
    where?: any;
    orderBy?: any;
    storeId?: string;
    allowedStoreIds?: string[];
  }) {
    const { skip, take, cursor, where, orderBy, storeId, allowedStoreIds } = params;
    
    const finalWhere = { ...where };

    if (storeId || (allowedStoreIds && allowedStoreIds.length > 0)) {
      const invoiceWhere: any = {};
      if (storeId) {
        invoiceWhere.storeId = storeId;
      } else if (allowedStoreIds) {
        invoiceWhere.storeId = { in: allowedStoreIds };
      }

      // We need to find invoices that match the store criteria
      // Since we can't join in findMany, we fetch invoice numbers first
      // Optimization: If we are filtering by mechanicName (which is common in details view),
      // we could potentially optimize, but for now let's fetch invoice numbers.
      // Warning: This could be heavy if there are many invoices.
      // A better approach for large datasets would be raw query or adding storeId to MechanicLabor table.
      
      const invoices = await this.prisma.invoice.findMany({
        where: invoiceWhere,
        select: { invoiceNumber: true }
      });
      
      const invoiceNumbers = invoices.map(i => i.invoiceNumber);
      
      if (finalWhere.invoiceNumber) {
        // If invoiceNumber is already in where (e.g. search), we need to intersect
        // But search usually uses 'contains', so this is tricky.
        // For now, let's assume 'AND' logic.
        finalWhere.invoiceNumber = { in: invoiceNumbers, ...finalWhere.invoiceNumber };
      } else {
        finalWhere.invoiceNumber = { in: invoiceNumbers };
      }
    } else if (allowedStoreIds && allowedStoreIds.length === 0) {
       return { data: [], total: 0 };
    }

    const [data, total] = await Promise.all([
      this.prisma.mechanicLabor.findMany({
        skip,
        take,
        cursor,
        where: finalWhere,
        orderBy: orderBy || { createdAt: 'desc' },
      }),
      this.prisma.mechanicLabor.count({ where: finalWhere }),
    ]);

    return { data, total };
  }

  async createMany(dtos: CreateMechanicLaborDto[]) {
    // Check for existing invoices to avoid FK constraint errors
    const invoiceNumbers = [...new Set(dtos.map(d => d.invoiceNumber))];
    
    // Chunk the invoice check to avoid "too many parameters" error if list is huge
    const chunkSize = 1000;
    const existingInvoiceSet = new Set<string>();
    
    for (let i = 0; i < invoiceNumbers.length; i += chunkSize) {
        const chunk = invoiceNumbers.slice(i, i + chunkSize);
        const found = await this.prisma.invoice.findMany({
            where: { invoiceNumber: { in: chunk } },
            select: { invoiceNumber: true }
        });
        found.forEach(inv => existingInvoiceSet.add(inv.invoiceNumber));
    }

    const validDtos = dtos.filter(d => existingInvoiceSet.has(d.invoiceNumber));
    const skipped = dtos.length - validDtos.length;

    if (skipped > 0) {
        console.warn(`Skipping ${skipped} mechanic labor records due to missing invoices.`);
    }

    if (validDtos.length === 0) {
        return { count: 0 };
    }

    return this.prisma.mechanicLabor.createMany({
      data: validDtos,
    });
  }

  async deleteAll() {
    return this.prisma.mechanicLabor.deleteMany({});
  }

  async getMechanicSummary(storeId?: string, allowedStoreIds?: string[]) {
    let whereClause = Prisma.empty;

    if (storeId) {
      whereClause = Prisma.sql`AND i.store_id = ${storeId}`;
    } else if (allowedStoreIds) {
      if (allowedStoreIds.length > 0) {
        whereClause = Prisma.sql`AND i.store_id IN (${Prisma.join(allowedStoreIds)})`;
      } else {
        whereClause = Prisma.sql`AND 1=0`;
      }
    }

    const summary = await this.prisma.$queryRaw<any[]>`
      SELECT 
        ml.mechanic_name as "mechanicName",
        SUM(ml.labor) as "totalLabor",
        SUM(ml.parts) as "totalParts",
        SUM(ml.gross_profit) as "totalGrossProfit",
        COUNT(ml.id) as "itemCount",
        SUM(CASE WHEN ml.labor > 0 AND NOT (ml.category ILIKE '%Service Truck Mileage%' OR ml.category ILIKE '%SRVT Service Truck%') THEN ml.quantity ELSE 0 END) as "totalHours",
        SUM(CASE WHEN (ml.category ILIKE '%Service Truck Mileage%' OR ml.category ILIKE '%SRVT Service Truck%') THEN ml.quantity ELSE 0 END) as "totalMiles",
        MAX(e.status) as "status",
        MAX(e.role) as "role",
        BOOL_OR(e."isMechanic") as "isMechanic",
        STRING_AGG(DISTINCT s.code, ', ') as "storeCodes"
      FROM mechanic_labor ml
      LEFT JOIN employees e ON LOWER(ml.mechanic_name) = LOWER(CONCAT(e."firstName", ' ', e."lastName"))
      LEFT JOIN "_EmployeeToStore" es ON e.id = es."A"
      LEFT JOIN stores s ON es."B" = s.id
      LEFT JOIN invoices i ON ml.invoice_number = i.invoice_number
      WHERE 1=1
      ${whereClause}
      GROUP BY ml.mechanic_name
      ORDER BY ml.mechanic_name ASC
    `;

    console.log('Summary raw result sample:', summary[0]);

    return summary.map(item => ({
      mechanicName: item.mechanicName,
      totalLabor: Number(item.totalLabor) || 0,
      totalParts: Number(item.totalParts) || 0,
      totalGrossProfit: Number(item.totalGrossProfit) || 0,
      itemCount: Number(item.itemCount) || 0,
      totalHours: Number(item.totalHours) || 0,
      totalMiles: Number(item.totalMiles) || 0,
      status: item.status || 'UNKNOWN',
      role: item.role || 'UNKNOWN',
      isMechanic: item.isMechanic === true,
      storeCodes: item.storeCodes ? item.storeCodes.split(', ').sort().join(', ') : ''
    }));
  }

  async getMechanicAnalytics(storeId?: string, allowedStoreIds?: string[]) {
    let whereClause = Prisma.empty;

    if (storeId) {
      whereClause = Prisma.sql`AND i.store_id = ${storeId}`;
    } else if (allowedStoreIds) {
      if (allowedStoreIds.length > 0) {
        whereClause = Prisma.sql`AND i.store_id IN (${Prisma.join(allowedStoreIds)})`;
      } else {
        whereClause = Prisma.sql`AND 1=0`;
      }
    }

    const data = await this.prisma.$queryRaw<any[]>`
      SELECT 
        ml.mechanic_name as "mechanicName",
        SUM(ml.labor) as "totalLabor",
        SUM(ml.gross_profit) as "totalGrossProfit",
        MIN(ml.created_at) as "firstSeen",
        MAX(ml.created_at) as "lastSeen",
        SUM(CASE WHEN ml.labor > 0 AND NOT (ml.category ILIKE '%Service Truck Mileage%' OR ml.category ILIKE '%SRVT Service Truck%') THEN ml.quantity ELSE 0 END) as "totalBilledHours",
        MAX(e.status) as "status",
        MAX(e.role) as "role",
        BOOL_OR(e."isMechanic") as "isMechanic"
      FROM mechanic_labor ml
      LEFT JOIN employees e ON LOWER(ml.mechanic_name) = LOWER(CONCAT(e."firstName", ' ', e."lastName"))
      LEFT JOIN invoices i ON ml.invoice_number = i.invoice_number
      WHERE 1=1
      ${whereClause}
      GROUP BY ml.mechanic_name
      ORDER BY ml.mechanic_name ASC
    `;

    return data.map(item => {
      const firstSeen = new Date(item.firstSeen);
      const lastSeen = new Date(item.lastSeen);
      const businessHours = this.calculateBusinessHours(firstSeen, lastSeen);
      
      const totalLabor = Number(item.totalLabor) || 0;
      const totalGrossProfit = Number(item.totalGrossProfit) || 0;
      const totalBilledHours = Number(item.totalBilledHours) || 0;

      return {
        mechanicName: item.mechanicName,
        totalLabor,
        totalGrossProfit,
        totalBilledHours,
        firstSeen,
        lastSeen,
        businessHoursAvailable: businessHours,
        laborPerHour: businessHours > 0 ? totalLabor / businessHours : 0,
        profitPerHour: businessHours > 0 ? totalGrossProfit / businessHours : 0,
        efficiency: businessHours > 0 ? (totalBilledHours / businessHours) * 100 : 0,
        status: item.status || 'UNKNOWN',
        role: item.role || 'UNKNOWN',
        isMechanic: item.isMechanic === true
      };
    });
  }

  private calculateBusinessHours(start: Date, end: Date): number {
    let hours = 0;
    let current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    // If start and end are the same day, count it as one day
    if (current.getTime() === endDate.getTime()) {
      const day = current.getDay();
      if (day >= 1 && day <= 5) return 10;
      if (day === 6) return 5;
      return 0;
    }

    while (current <= endDate) {
      const day = current.getDay();
      if (day >= 1 && day <= 5) { // M-F
        hours += 10;
      } else if (day === 6) { // Sat
        hours += 5;
      }
      // Sunday is 0
      current.setDate(current.getDate() + 1);
    }
    return hours;
  }
}
