import { Module } from '@nestjs/common';
import { MechanicController } from './mechanic.controller';
import { MechanicService } from './mechanic.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MechanicController],
  providers: [MechanicService],
})
export class MechanicModule {
  constructor() {
    console.log('🔧 MechanicModule initialized');
  }
}
