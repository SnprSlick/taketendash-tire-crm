import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
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
import { DateScalar } from './graphql/scalars/date.scalar';
// import { LibrariesModule } from './libraries/libraries.module'; // Temporarily disabled
import { AppController } from './app.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    GraphQLConfigModule,
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
  ],
  controllers: [AppController],
  providers: [DateScalar],
})
export class AppModule {}