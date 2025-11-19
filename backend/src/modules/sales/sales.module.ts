import { Module } from '@nestjs/common';
import { SalesDataService } from './sales-data.service';
import { SalesDataRepository } from './sales-data.repository';
import { SalesAnalyticsController } from './sales-analytics.controller';
import { AnalyticsResolver } from '../../graphql/resolvers/analytics.resolver';

@Module({
  controllers: [SalesAnalyticsController],
  providers: [SalesDataService, SalesDataRepository, AnalyticsResolver],
  exports: [SalesDataService, SalesDataRepository],
})
export class SalesModule {}