# Quickstart Guide: Invoice CSV Import Implementation

**Feature**: Invoice CSV Import and Data Management
**Date**: 2025-11-20
**Phase**: 1 - Implementation Quickstart

## Overview

This guide provides step-by-step instructions for implementing the invoice CSV import feature in the TakeTenDash application. The implementation includes automated CSV monitoring, data processing, dashboard integration, and comprehensive error handling.

## Prerequisites

### Required Dependencies
```bash
# Backend dependencies (add to backend/package.json)
npm install csv-parser @nestjs/schedule @nestjs-cls/transactional bull @nestjs/bull socket.io @nestjs/websockets

# Development dependencies
npm install --save-dev @types/csv-parser
```

### Environment Setup
```bash
# Add to backend/.env
CSV_DATA_FOLDER=/app/data
CSV_IMPORT_FOLDER=/app/data/import
REDIS_URL=redis://localhost:6379
```

## Implementation Steps

### Step 1: Database Schema Migration

Create Prisma migration for new entities:

```bash
cd backend
npx prisma migrate dev --name add-invoice-entities
```

Add the Prisma schema updates from `data-model.md`:

```prisma
// Add to backend/prisma/schema.prisma
model Customer {
  id           String   @id @default(cuid())
  name         String   @db.VarChar(255)
  email        String?  @db.VarChar(255)
  phone        String?  @db.VarChar(50)
  address      String?  @db.Text
  customerCode String?  @db.VarChar(100)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  invoices    Invoice[]
  salesData   SalesData[]

  @@unique([name], name: "unique_customer_name")
  @@map("customers")
}

// Add other models as defined in data-model.md...
```

### Step 2: Create Core Modules

#### A. CSV Import Module Structure
```bash
mkdir -p backend/src/csv-import/{controllers,services,processors,mappers,schedulers,dto}
mkdir -p backend/src/invoices/{entities,services,controllers}
mkdir -p backend/src/customers/{entities,services,controllers}
```

#### B. CSV Import Service Implementation

```typescript
// backend/src/csv-import/services/csv-import.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as csv from 'csv-parser';
import { createReadStream, promises as fs } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);
  private readonly dataFolder = process.env.CSV_DATA_FOLDER || '/app/data';
  private readonly importFolder = process.env.CSV_IMPORT_FOLDER || '/app/data/import';

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scanForNewFiles() {
    this.logger.log('Scanning for new CSV files...');

    try {
      const files = await fs.readdir(this.dataFolder);
      const csvFiles = files.filter(file =>
        file.endsWith('.csv') && !file.startsWith('.')
      );

      for (const file of csvFiles) {
        const filePath = join(this.dataFolder, file);
        const importPath = join(this.importFolder, file);

        // Check if file already processed
        const existingBatch = await this.prisma.importBatch.findFirst({
          where: { fileName: file }
        });

        if (!existingBatch) {
          await this.processFile(filePath);
        }
      }
    } catch (error) {
      this.logger.error('Error scanning files:', error);
    }
  }

  async processFile(filePath: string): Promise<string> {
    const fileName = filePath.split('/').pop() || '';
    this.logger.log(`Processing file: ${fileName}`);

    const batch = await this.prisma.importBatch.create({
      data: {
        fileName,
        originalPath: filePath,
        status: 'STARTED',
        totalRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
      }
    });

    try {
      await this.processCsvFile(filePath, batch.id);

      await this.prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          processedPath: join(this.importFolder, fileName),
        }
      });

      // Move file to import folder
      await fs.rename(filePath, join(this.importFolder, fileName));

      this.eventEmitter.emit('import.completed', { batchId: batch.id });

    } catch (error) {
      await this.prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: 'FAILED',
          errorSummary: error.message,
        }
      });

      this.logger.error(`Import failed for ${fileName}:`, error);
      throw error;
    }

    return batch.id;
  }

  private async processCsvFile(filePath: string, batchId: string) {
    const records: any[] = [];

    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csv({
          mapHeaders: ({ header }) => {
            // Map TireMaster headers to standard fields
            const headerMap = {
              'Invoice Number': 'invoiceNumber',
              'Customer Name': 'customerName',
              'Invoice Date': 'invoiceDate',
              'Salesperson': 'salesperson',
              // Add more mappings based on actual CSV structure
            };
            return headerMap[header] || header.toLowerCase().replace(/\s+/g, '_');
          }
        }))
        .on('data', (data) => records.push(data))
        .on('end', async () => {
          try {
            await this.processRecords(records, batchId);
            resolve(records.length);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  private async processRecords(records: any[], batchId: string) {
    const batchSize = 100;
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      for (const record of batch) {
        try {
          await this.processInvoiceRecord(record, batchId);
          processed++;
        } catch (error) {
          failed++;
          await this.logError(batchId, i + batch.indexOf(record) + 1, error, record);
        }
      }

      // Emit progress update
      this.eventEmitter.emit('import.progress', {
        batchId,
        processed: processed + failed,
        total: records.length,
        percentage: Math.round(((processed + failed) / records.length) * 100)
      });
    }

    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: {
        totalRecords: records.length,
        successfulRecords: processed,
        failedRecords: failed,
      }
    });
  }

  private async processInvoiceRecord(record: any, batchId: string) {
    // Create or find customer
    const customer = await this.findOrCreateCustomer(record.customerName);

    // Create invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber: record.invoiceNumber,
        customerId: customer.id,
        invoiceDate: new Date(record.invoiceDate),
        salesperson: record.salesperson,
        subtotal: parseFloat(record.subtotal || '0'),
        taxAmount: parseFloat(record.taxAmount || '0'),
        totalAmount: parseFloat(record.totalAmount || '0'),
        status: 'ACTIVE',
        importBatchId: batchId,
      }
    });

    // Process line items if available
    if (record.lineItems) {
      await this.processLineItems(record.lineItems, invoice.id);
    }

    return invoice;
  }

  private async findOrCreateCustomer(customerName: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { name: { contains: customerName, mode: 'insensitive' } }
    });

    if (existing) return existing;

    return this.prisma.customer.create({
      data: { name: customerName }
    });
  }

  private async logError(batchId: string, rowNumber: number, error: any, record: any) {
    await this.prisma.importError.create({
      data: {
        importBatchId: batchId,
        rowNumber,
        errorType: 'VALIDATION',
        errorMessage: error.message,
        originalData: JSON.stringify(record),
      }
    });
  }
}
```

#### C. WebSocket Gateway for Real-time Updates

```typescript
// backend/src/csv-import/gateways/import.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' },
  namespace: '/import'
})
export class ImportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Import client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Import client disconnected: ${client.id}`);
  }

  @OnEvent('import.progress')
  handleImportProgress(payload: any) {
    this.server.emit('import-progress', payload);
  }

  @OnEvent('import.completed')
  handleImportCompleted(payload: any) {
    this.server.emit('import-completed', payload);
  }

  @SubscribeMessage('subscribe-import-updates')
  handleSubscription(client: Socket) {
    client.join('import-updates');
    client.emit('subscription-confirmed', { message: 'Subscribed to import updates' });
  }
}
```

### Step 3: Frontend Implementation

#### A. Enhanced Hook for Import Updates

```typescript
// frontend/src/hooks/useImportUpdates.ts
'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ImportProgress {
  batchId: string;
  processed: number;
  total: number;
  percentage: number;
}

export function useImportUpdates() {
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/import`);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to import WebSocket');
      socket.emit('subscribe-import-updates');
    });

    socket.on('import-progress', (data: ImportProgress) => {
      setProgress(data);
      setIsImporting(true);
    });

    socket.on('import-completed', () => {
      setProgress(null);
      setIsImporting(false);
    });

    return () => socket.disconnect();
  }, []);

  const triggerManualImport = async (filePath: string) => {
    const response = await fetch('/api/v1/import/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath })
    });

    return response.json();
  };

  return {
    progress,
    isImporting,
    triggerManualImport,
  };
}
```

#### B. Import Progress Component

```typescript
// frontend/src/components/import/import-progress.tsx
'use client';

import React from 'react';
import { useImportUpdates } from '../../hooks/useImportUpdates';

export function ImportProgress() {
  const { progress, isImporting } = useImportUpdates();

  if (!isImporting || !progress) return null;

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">Importing CSV</h3>
        <span className="text-xs text-gray-500">{progress.percentage}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      <p className="text-xs text-gray-600">
        {progress.processed} of {progress.total} records processed
      </p>
    </div>
  );
}
```

### Step 4: Module Registration

#### A. Update App Module

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { CsvImportModule } from './csv-import/csv-import.module';
import { InvoicesModule } from './invoices/invoices.module';
import { CustomersModule } from './customers/customers.module';

@Module({
  imports: [
    // Existing modules...
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    CsvImportModule,
    InvoicesModule,
    CustomersModule,
  ],
})
export class AppModule {}
```

#### B. Create CSV Import Module

```typescript
// backend/src/csv-import/csv-import.module.ts
import { Module } from '@nestjs/common';
import { CsvImportService } from './services/csv-import.service';
import { CsvImportController } from './controllers/csv-import.controller';
import { ImportGateway } from './gateways/import.gateway';

@Module({
  controllers: [CsvImportController],
  providers: [CsvImportService, ImportGateway],
  exports: [CsvImportService],
})
export class CsvImportModule {}
```

### Step 5: GraphQL Schema Integration

#### A. Update GraphQL Schema

```typescript
// backend/src/graphql/types/invoice.type.ts
import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class Invoice {
  @Field(() => ID)
  id: string;

  @Field()
  invoiceNumber: string;

  @Field()
  customerId: string;

  @Field()
  invoiceDate: Date;

  @Field()
  salesperson: string;

  @Field(() => Float)
  subtotal: number;

  @Field(() => Float)
  taxAmount: number;

  @Field(() => Float)
  totalAmount: number;

  @Field()
  status: string;

  @Field(() => Customer)
  customer: Customer;

  @Field(() => [InvoiceLineItem])
  lineItems: InvoiceLineItem[];
}

// Add other types as needed...
```

#### B. Create Invoice Resolver

```typescript
// backend/src/invoices/resolvers/invoice.resolver.ts
import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { Invoice } from '../types/invoice.type';
import { InvoiceService } from '../services/invoice.service';

@Resolver(() => Invoice)
export class InvoiceResolver {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Query(() => [Invoice])
  async invoices() {
    return this.invoiceService.findAll();
  }

  @Query(() => Invoice, { nullable: true })
  async invoice(@Args('id', { type: () => ID }) id: string) {
    return this.invoiceService.findOne(id);
  }
}
```

### Step 6: Testing Setup

#### A. Create Test Data

```bash
# Create sample CSV file for testing
mkdir -p backend/test-data
```

```csv
# backend/test-data/sample-invoices.csv
Invoice Number,Customer Name,Invoice Date,Salesperson,Subtotal,Tax Amount,Total Amount
2024-001,John's Auto Shop,2024-01-15,Jane Smith,1000.00,80.00,1080.00
2024-002,Mike's Garage,2024-01-16,Bob Johnson,1500.00,120.00,1620.00
```

#### B. Integration Test

```typescript
// backend/src/csv-import/csv-import.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CsvImportService } from './csv-import.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CsvImportService', () => {
  let service: CsvImportService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CsvImportService, PrismaService],
    }).compile();

    service = module.get<CsvImportService>(CsvImportService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should process CSV file successfully', async () => {
    const filePath = './test-data/sample-invoices.csv';
    const batchId = await service.processFile(filePath);

    expect(batchId).toBeDefined();

    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
    });

    expect(batch.status).toBe('COMPLETED');
    expect(batch.successfulRecords).toBeGreaterThan(0);
  });
});
```

## Deployment Steps

### 1. Environment Setup

```bash
# Production environment variables
CSV_DATA_FOLDER=/app/data
CSV_IMPORT_FOLDER=/app/data/import
REDIS_URL=redis://production-redis:6379
NODE_ENV=production
```

### 2. Docker Configuration

Update `docker-compose.dev.yml`:

```yaml
services:
  backend:
    volumes:
      - ./data:/app/data  # Mount data folder
      - ./data/import:/app/data/import  # Mount import archive folder
```

### 3. Database Migration

```bash
# Run in production
npx prisma migrate deploy
npx prisma generate
```

### 4. Service Verification

```bash
# Check import service status
curl http://localhost:3001/api/v1/import/status

# Monitor logs
docker logs tire-crm-backend --follow | grep "CSV"
```

## Testing the Implementation

### 1. Manual Import Test

```bash
# Place test CSV in data folder
cp test-data/sample-invoices.csv data/

# Trigger manual import
curl -X POST http://localhost:3001/api/v1/import/trigger \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/app/data/sample-invoices.csv"}'
```

### 2. Frontend Integration Test

1. Open the TakeTenDash dashboard
2. Monitor for import progress notifications
3. Verify dashboard updates with new invoice data
4. Check customer list for new entries

### 3. Error Handling Test

```bash
# Test with invalid CSV
echo "invalid,csv,data" > data/test-error.csv

# Monitor error handling
curl http://localhost:3001/api/v1/import/batches?status=FAILED
```

## Monitoring and Maintenance

### 1. Health Checks

```bash
# System status
curl http://localhost:3001/api/v1/import/status

# Recent imports
curl http://localhost:3001/api/v1/import/batches?limit=5
```

### 2. Error Monitoring

```bash
# View import errors
curl http://localhost:3001/api/v1/import/batches/{batchId}/errors
```

### 3. Performance Monitoring

- Monitor processing time for large files
- Track memory usage during imports
- Monitor dashboard response times after imports

## Troubleshooting

### Common Issues

1. **Files not being processed**
   - Check folder permissions
   - Verify cron job is running
   - Check logs for errors

2. **Import failures**
   - Verify CSV format matches expected structure
   - Check database constraints
   - Review error logs

3. **Performance issues**
   - Adjust batch size in processing
   - Check database query performance
   - Monitor Redis cache status

### Debug Commands

```bash
# Check scheduled tasks
docker exec tire-crm-backend npm run schedule:list

# Manual CSV processing
docker exec -it tire-crm-backend npm run csv:process -- /app/data/filename.csv

# Clear Redis cache
docker exec tire-crm-redis redis-cli FLUSHDB
```

This quickstart guide provides a complete implementation path for the invoice CSV import feature, ensuring robust data processing, real-time updates, and comprehensive error handling.