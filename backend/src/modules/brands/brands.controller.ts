import { Controller, Get, Query } from '@nestjs/common';
import { BrandsService } from './brands.service';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  async getBrands() {
    return this.brandsService.getBrands();
  }

  @Get('analytics')
  async getBrandAnalytics(
    @Query('brand') brand: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.brandsService.getBrandAnalytics(brand, startDate, endDate);
  }

  @Get('leaderboard')
  async getBrandLeaderboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const leaderboard = await this.brandsService.getBrandLeaderboard(startDate, endDate);
    return leaderboard.map(item => ({
      brand: item.brand,
      totalSales: Number(item.total_sales),
      totalProfit: Number(item.total_profit),
      totalUnits: Number(item.total_units),
      transactionCount: Number(item.transaction_count)
    }));
  }

  @Get('by-size')
  async getBrandsBySize(
    @Query('size') size: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const results = await this.brandsService.getBrandsBySize(size, startDate, endDate);
    return results.map(item => ({
      brand: item.brand,
      totalSales: Number(item.total_sales),
      totalProfit: Number(item.total_profit),
      totalUnits: Number(item.total_units),
      averagePrice: Number(item.average_price)
    }));
  }


}
