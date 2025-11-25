import { Controller, Get, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('stores')
export class StoreController {
  private readonly logger = new Logger(StoreController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getStores() {
    try {
      const stores = await this.prisma.store.findMany({
        orderBy: {
          code: 'asc'
        }
      });
      return {
        success: true,
        data: stores
      };
    } catch (error) {
      this.logger.error('Failed to fetch stores', error);
      return {
        success: false,
        error: 'Failed to fetch stores'
      };
    }
  }
}
