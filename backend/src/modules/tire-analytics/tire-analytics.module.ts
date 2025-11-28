
import { Module } from '@nestjs/common';
import { TireAnalyticsController } from './tire-analytics.controller';
import { TireAnalyticsService } from './tire-analytics.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TireAnalyticsController],
  providers: [TireAnalyticsService],
  exports: [TireAnalyticsService],
})
export class TireAnalyticsModule {}
