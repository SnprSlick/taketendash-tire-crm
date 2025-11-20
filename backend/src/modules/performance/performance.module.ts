import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LibrariesModule } from '../../libraries/libraries.module';
// Temporarily disabled performance tracking services
// import { PerformanceTrackingService } from '../../services/performance-tracking.service';
// import { PerformanceLoggingService } from '../../services/performance-logging.service';
// import { EmployeePerformanceResolver } from '../../resolvers/employee-performance.resolver';

@Module({
  imports: [
    PrismaModule,
    LibrariesModule, // For AnalyticsEngineService
  ],
  providers: [
    // PerformanceTrackingService,
    // PerformanceLoggingService,
    // EmployeePerformanceResolver,
  ],
  exports: [
    // PerformanceTrackingService,
    // PerformanceLoggingService,
  ],
})
export class PerformanceModule {}