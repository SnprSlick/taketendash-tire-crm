import { Module } from '@nestjs/common';
import { LargeAccountsController } from './large-accounts.controller';
import { LargeAccountsService } from './large-accounts.service';
import { LargeAccountsRepository } from './large-accounts.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LargeAccountsController],
  providers: [LargeAccountsService, LargeAccountsRepository],
  exports: [LargeAccountsService, LargeAccountsRepository],
})
export class LargeAccountsModule {}