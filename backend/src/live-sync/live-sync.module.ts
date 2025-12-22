import { Module } from '@nestjs/common';
import { LiveSyncController } from './live-sync.controller';
import { LiveSyncService } from './live-sync.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LiveSyncController],
  providers: [LiveSyncService]
})
export class LiveSyncModule {}
