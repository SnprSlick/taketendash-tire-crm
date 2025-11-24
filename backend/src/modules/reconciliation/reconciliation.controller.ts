import { Controller, Post, Get, Delete, UploadedFile, UseInterceptors, Query, Param, Body, BadRequestException, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReconciliationService } from './reconciliation.service';

@Controller('reconciliation')
export class ReconciliationController {
  private readonly logger = new Logger(ReconciliationController.name);

  constructor(
    private readonly reconciliationService: ReconciliationService
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadReconciliationFile(@UploadedFile() file: Express.Multer.File) {
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
  async getBatchDetails(@Param('id') id: string) {
    return this.reconciliationService.getBatchDetails(id);
  }

  @Get('stats')
  async getStats() {
    return this.reconciliationService.getStats();
  }

  @Post('batches/:id/rescan')
  async rescanBatch(@Param('id') id: string) {
    this.logger.log(`Rescanning batch: ${id}`);
    return this.reconciliationService.rescanBatch(id);
  }

  @Delete('clear')
  async clearDatabase() {
    this.logger.log('Clearing reconciliation database');
    return this.reconciliationService.clearDatabase();
  }
}
