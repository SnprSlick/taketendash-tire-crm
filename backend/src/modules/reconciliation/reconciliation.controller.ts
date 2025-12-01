import { Controller, Post, Get, Delete, UploadedFile, UseInterceptors, Query, Param, Body, BadRequestException, Logger, UseGuards, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReconciliationService } from './reconciliation.service';
import { User } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReconciliationController {
  private readonly logger = new Logger(ReconciliationController.name);

  constructor(
    private readonly reconciliationService: ReconciliationService
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadReconciliationFile(@UploadedFile() file: Express.Multer.File, @User() user: any) {
    if (user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      throw new ForbiddenException('Access denied');
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    this.logger.log(`Uploading reconciliation file: ${file.originalname}`);
    return this.reconciliationService.processReconciliationFile(file);
  }

  @Get('batches')
  async getBatches() {
    return this.reconciliationService.getBatches();
  }

  @Get('batches/:id')
  async getBatchDetails(@Param('id') id: string, @User() user: any) {
    let allowedStoreIds: string[] | undefined;
    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      allowedStoreIds = user.stores;
    }
    return this.reconciliationService.getBatchDetails(id, allowedStoreIds);
  }

  @Get('stats')
  async getStats() {
    return this.reconciliationService.getStats();
  }

  @Post('batches/:id/rescan')
  async rescanBatch(@Param('id') id: string, @User() user: any) {
    if (user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      throw new ForbiddenException('Access denied');
    }
    this.logger.log(`Rescanning batch: ${id}`);
    return this.reconciliationService.rescanBatch(id);
  }

  @Delete('clear')
  async clearDatabase(@User() user: any) {
    if (user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      throw new ForbiddenException('Access denied');
    }
    this.logger.log('Clearing reconciliation database');
    return this.reconciliationService.clearDatabase();
  }
}
