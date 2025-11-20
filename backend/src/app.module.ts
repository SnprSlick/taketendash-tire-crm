import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from './utils/logger.module';
import { GraphQLConfigModule } from './graphql/graphql.module';
// import { CustomerModule } from './modules/customers/customer.module'; // Temporarily disabled
// import { SalesModule } from './modules/sales/sales.module'; // Temporarily disabled
// import { ServiceRemindersModule } from './modules/service-reminders/service-reminders.module'; // Temporarily disabled
// import { PerformanceModule } from './modules/performance/performance.module'; // Temporarily disabled due to schema issues
import { LargeAccountsModule } from './modules/large-accounts/large-accounts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { TireMasterModule } from './modules/tire-master/tire-master.module';
import { CsvImportModule } from './csv-import/csv-import.module';
// Note: CustomersModule and InvoicesModule moved to _disabled folder to resolve schema conflicts
import { DateScalar } from './graphql/scalars/date.scalar';
// import { LibrariesModule } from './libraries/libraries.module'; // Temporarily disabled
import { AppController } from './app.controller';
import { HealthResolver } from './graphql/resolvers/health.resolver';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
      },
    }),
    // GraphQLConfigModule, // Temporarily disabled to isolate CSV import functionality
    PrismaModule,
    RedisModule,
    AuthModule,
    LoggerModule,
    // LibrariesModule, // Temporarily disabled
    // CustomerModule, // Temporarily disabled
    // SalesModule, // Temporarily disabled
    // ServiceRemindersModule, // Temporarily disabled
    // PerformanceModule, // Temporarily disabled due to schema issues
    LargeAccountsModule,
    NotificationsModule,
    AuditModule,
    TireMasterModule,
    CsvImportModule,
    // CustomersModule, // Temporarily disabled due to schema mismatch
    // InvoicesModule, // Temporarily disabled due to schema mismatch
  ],
  controllers: [AppController],
  providers: [DateScalar], // HealthResolver temporarily removed with GraphQL
})
export class AppModule {}