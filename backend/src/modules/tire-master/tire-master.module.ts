import { Module } from '@nestjs/common';
// Temporarily disabled tire-master components
// import { TireMasterController } from './tire-master.controller';
// import { TireMasterService } from './tire-master.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  // controllers: [TireMasterController],
  // providers: [TireMasterService],
  // exports: [TireMasterService],
})
export class TireMasterModule {}