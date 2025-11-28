import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMechanicLaborDto } from './dto/create-mechanic-labor.dto';

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
  }) {
    const { skip, take, cursor, where, orderBy } = params;
    const [data, total] = await Promise.all([
      this.prisma.mechanicLabor.findMany({
        skip,
        take,
        cursor,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
      }),
      this.prisma.mechanicLabor.count({ where }),
    ]);

    return { data, total };
  }

  async createMany(dtos: CreateMechanicLaborDto[]) {
    return this.prisma.mechanicLabor.createMany({
      data: dtos,
    });
  }

  async deleteAll() {
    return this.prisma.mechanicLabor.deleteMany({});
  }

  async getMechanicSummary() {
    const summary = await this.prisma.$queryRaw<any[]>`
      SELECT 
        mechanic_name as "mechanicName",
        SUM(labor) as "totalLabor",
        SUM(parts) as "totalParts",
        SUM(gross_profit) as "totalGrossProfit",
        COUNT(id) as "itemCount",
        SUM(CASE WHEN labor > 0 AND NOT (category ILIKE '%Service Truck Mileage%' OR category ILIKE '%SRVT Service Truck%') THEN quantity ELSE 0 END) as "totalHours",
        SUM(CASE WHEN (category ILIKE '%Service Truck Mileage%' OR category ILIKE '%SRVT Service Truck%') THEN quantity ELSE 0 END) as "totalMiles"
      FROM mechanic_labor
      GROUP BY mechanic_name
      ORDER BY mechanic_name ASC
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
    }));
  }

  async getMechanicAnalytics() {
    const data = await this.prisma.$queryRaw<any[]>`
      SELECT 
        mechanic_name as "mechanicName",
        SUM(labor) as "totalLabor",
        SUM(gross_profit) as "totalGrossProfit",
        MIN(created_at) as "firstSeen",
        MAX(created_at) as "lastSeen",
        SUM(CASE WHEN labor > 0 AND NOT (category ILIKE '%Service Truck Mileage%' OR category ILIKE '%SRVT Service Truck%') THEN quantity ELSE 0 END) as "totalBilledHours"
      FROM mechanic_labor
      GROUP BY mechanic_name
      ORDER BY mechanic_name ASC
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
        efficiency: businessHours > 0 ? (totalBilledHours / businessHours) * 100 : 0
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
