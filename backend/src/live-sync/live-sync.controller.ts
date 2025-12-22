import { Body, Controller, Post } from '@nestjs/common';
import { LiveSyncService } from './live-sync.service';
import {
  SyncCustomersDto,
  SyncInventoryDto,
  SyncVehiclesDto,
  SyncInvoicesDto,
  SyncInvoiceItemsDto,
} from './dto/sync-dtos';

@Controller('live-sync')
export class LiveSyncController {
  constructor(private readonly liveSyncService: LiveSyncService) {}

  @Post('customers')
  async syncCustomers(@Body() dto: SyncCustomersDto) {
    return this.liveSyncService.syncCustomers(dto.customers);
  }

  @Post('inventory')
  async syncInventory(@Body() dto: SyncInventoryDto) {
    return this.liveSyncService.syncInventory(dto.inventory);
  }

  @Post('vehicles')
  async syncVehicles(@Body() dto: SyncVehiclesDto) {
    return this.liveSyncService.syncVehicles(dto.vehicles);
  }

  @Post('invoices')
  async syncInvoices(@Body() dto: SyncInvoicesDto) {
    return this.liveSyncService.syncInvoices(dto.invoices);
  }

  @Post('details')
  async syncInvoiceItems(@Body() dto: SyncInvoiceItemsDto) {
    return this.liveSyncService.syncInvoiceItems(dto.details);
  }
}
