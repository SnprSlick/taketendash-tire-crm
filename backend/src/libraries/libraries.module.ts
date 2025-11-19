import { Module, Global } from '@nestjs/common';
import { AnalyticsEngine } from './analytics-engine';
import { CustomerServiceLib } from './customer-service';
import { NotificationServiceLib } from './notification-service';
import { TireMasterAdapter } from './tire-master-adapter';

@Global()
@Module({
  providers: [
    AnalyticsEngine,
    CustomerServiceLib,
    NotificationServiceLib,
    TireMasterAdapter,
  ],
  exports: [
    AnalyticsEngine,
    CustomerServiceLib,
    NotificationServiceLib,
    TireMasterAdapter,
  ],
})
export class LibrariesModule {}