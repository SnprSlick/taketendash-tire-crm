import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from './utils/logger.module';
// import { GraphQLConfigModule } from './graphql/graphql.module'; // Disabled to avoid startup conflicts
// import { CustomerModule } from './modules/customers/customer.module'; // Temporarily disabled
// import { SalesModule } from './modules/sales/sales.module'; // Temporarily disabled
// import { ServiceRemindersModule } from './modules/service-reminders/service-reminders.module'; // Temporarily disabled
// import { PerformanceModule } from './modules/performance/performance.module'; // Temporarily disabled due to schema issues
import { LargeAccountsModule } from './modules/large-accounts/large-accounts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { TireMasterModule } from './modules/tire-master/tire-master.module';
import { CsvImportModule } from './csv-import/csv-import.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { BrandsModule } from './modules/brands/brands.module';
import { TireAnalyticsModule } from './modules/tire-analytics/tire-analytics.module';
import { MechanicModule } from './modules/mechanic/mechanic.module';
import { StoreModule } from './modules/store/store.module';
import { InsightsModule } from './modules/insights/insights.module';
// Note: CustomersModule and InvoicesModule moved to _disabled folder to resolve schema conflicts
// import { DateScalar } from './graphql/scalars/date.scalar'; // Disabled with GraphQL
// import { LibrariesModule } from './libraries/libraries.module'; // Temporarily disabled
import { AppController } from './app.controller';
import { InvoiceController } from './controllers/invoice.controller';
// import { CsvImportController } from './csv-import/controllers/csv-import.controller'; // Moved to CsvImportModule
// import { HealthResolver } from './graphql/resolvers/health.resolver'; // Disabled with GraphQL

@Module({
  imports: [
    // ScheduleModule.forRoot(), // Temporarily disabled for debugging
    EventEmitterModule.forRoot(), // Re-enabled for CSV import functionality
    // BullModule.forRoot({ // Temporarily disabled for debugging
    //   redis: {
    //     host: process.env.REDIS_HOST || 'localhost',
    //     port: parseInt(process.env.REDIS_PORT || '6379'),
    //     password: process.env.REDIS_PASSWORD || undefined,
    //     db: parseInt(process.env.REDIS_DB || '0'),
    //   },
    // }),
    // GraphQLConfigModule, // Temporarily disabled to isolate CSV import functionality
    PrismaModule,
    RedisModule, // Re-enabled for AppController dependency
    AuthModule, // Temporarily disabled for debugging
    LoggerModule,
    // LibrariesModule, // Temporarily disabled
    // CustomerModule, // Temporarily disabled
    // SalesModule, // Temporarily disabled
    // ServiceRemindersModule, // Temporarily disabled
    // PerformanceModule, // Temporarily disabled due to schema issues
    // LargeAccountsModule, // Temporarily disabled for debugging
    // NotificationsModule, // Temporarily disabled for debugging
    // AuditModule, // Temporarily disabled for debugging
    TireMasterModule,
    CsvImportModule,
    ReconciliationModule,
    InventoryModule,
    BrandsModule,
    TireAnalyticsModule,
    MechanicModule,
    StoreModule,
    InsightsModule,
  ],
  controllers: [AppController, InvoiceController], // CsvImportController moved to CsvImportModule
  providers: [], // DateScalar and HealthResolver removed with GraphQL
})
export class AppModule {}