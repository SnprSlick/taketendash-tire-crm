# Research: Invoice CSV Import and Data Management

**Date**: 2025-11-20
**Feature**: Invoice CSV Import and Data Management
**Phase**: 0 - Technical Research

## Overview

This document consolidates research findings for implementing a robust CSV import system for TireMaster invoice data, including file monitoring, data processing, error handling, and dashboard integration.

## 1. File System Monitoring Implementation

### Decision: Hybrid @nestjs/schedule + Manual Trigger Approach

**Rationale**:
- Hourly scheduled monitoring provides reliable, resource-efficient file detection
- Manual trigger capability enables immediate processing when needed
- Docker-compatible without complex file system watching
- Reduces complexity compared to real-time file watchers

**Implementation Approach**:
```typescript
@Injectable()
export class CsvMonitoringService {
  @Cron(CronExpression.EVERY_HOUR)
  async scanForNewFiles() {
    // Scan data folder for new CSV files
    // Process files not in "import" subfolder
    // Move processed files to archive
  }

  async triggerManualImport(filePath?: string) {
    // Immediate processing for manual triggers
    // Same processing logic as scheduled scan
  }
}
```

**Alternatives Considered**:
- **chokidar**: Too complex for Docker environments, potential performance issues with large files
- **fs.watch**: Platform-dependent, unreliable in containers
- **Real-time monitoring**: Resource intensive, unnecessary for hourly requirements

---

## 2. CSV Parsing Library Selection

### Decision: csv-parser (Primary) with fast-csv (Alternative)

**Rationale**:
- **Performance**: csv-parser handles 90,000+ rows/second, ideal for large files (100MB+)
- **Memory Efficiency**: Streaming-based processing with minimal memory footprint
- **TireMaster Compatibility**: Excellent support for custom column mapping
- **TypeScript Support**: Full type definitions available

**Implementation Pattern**:
```typescript
import * as csv from 'csv-parser';

const parser = csv({
  mapHeaders: ({ header }) => {
    const columnMap = {
      'Product Code': 'productCode',
      'Description': 'description',
      'Price': 'price'
    };
    return columnMap[header] || header.toLowerCase();
  }
});
```

**Comparison Results**:
- **csv-parser**: Best performance, lightweight (1.5KB)
- **fast-csv**: TypeScript-first, good NestJS integration
- **csv-parse**: Feature-rich but slower
- **PapaParse**: Browser-focused, not optimal for Node.js

---

## 3. Error Handling and Recovery Strategies

### Decision: Multi-Level Error Handling with Batch Processing

**Rationale**:
- Isolates failures to prevent complete import failures
- Provides granular error reporting for user actionability
- Maintains data integrity through transaction management
- Enables partial success scenarios

**Key Patterns**:

#### Batch Processing with Error Isolation
```typescript
async importCsvInChunks(records: any[], chunkSize = 1000) {
  const results = { successful: 0, failed: 0, errors: [] };

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    try {
      await this.processChunk(chunk);
      results.successful += chunk.length;
    } catch (error) {
      // Process individual records in failed chunk
      const chunkResults = await this.processFailedChunk(chunk, i);
      results.successful += chunkResults.successful;
      results.failed += chunkResults.failed;
    }
  }
}
```

#### Transaction Management with Rollback
- Use `@nestjs-cls/transactional` for automatic rollback capabilities
- Implement staged validation before database operations
- Support for resumable imports from last successful point

#### Progress Tracking and Audit Trails
- Bull Queue integration for job progress tracking
- WebSocket real-time progress updates
- Comprehensive error logging with row-level details

---

## 4. Dashboard Integration Patterns

### Decision: GraphQL Extension with WebSocket Real-time Updates

**Rationale**:
- Leverages existing GraphQL infrastructure
- Provides efficient data fetching with custom resolvers
- Real-time updates via WebSocket maintain dashboard responsiveness
- Maintains backward compatibility with existing dashboard

**Integration Architecture**:

#### Enhanced GraphQL Schema
```graphql
type SalesMetrics {
  totalRevenue: Float!
  grossProfit: Float!
  invoiceCount: Int!
  categoryBreakdown: [CategoryMetrics!]!
  salespersonPerformance: [SalespersonMetrics!]!
}

type Query {
  enhancedSalesMetrics(filters: SalesFilterInput): SalesMetrics!
}
```

#### Real-time Update System
- WebSocket gateway for live progress updates during imports
- Event-driven cache invalidation after successful imports
- Intelligent cache warming for common dashboard views

#### Performance Optimizations
- Redis caching with 5-minute TTL for analytics
- Strategic cache invalidation patterns
- Batch data aggregation for dashboard metrics

---

## 5. Data Transformation Patterns

### Decision: Custom Parser with Configurable Column Mapping

**Rationale**:
- TireMaster CSV format is non-standard and requires custom parsing
- Configurable mapping allows adaptation to format changes
- Stream-based processing handles large files efficiently

**Transformation Pipeline**:
1. **CSV Parsing**: Custom parser handles TireMaster's complex format
2. **Data Validation**: Row-level validation with detailed error reporting
3. **Entity Mapping**: Transform to standardized invoice/customer entities
4. **Analytics Aggregation**: Pre-compute dashboard metrics during import

**Example Implementation**:
```typescript
transformToSalesData(invoices: ParsedInvoiceRecord[]): SalesDataEntity[] {
  return invoices.flatMap(invoice =>
    invoice.lineItems.map(item => ({
      tireMasterId: `INV-${invoice.invoiceNumber}-${item.productCode}`,
      transactionDate: invoice.invoiceDate,
      category: this.categorizeProduct(item.productCode),
      quantity: item.quantity,
      unitPrice: item.parts + item.labor,
      customerId: this.resolveCustomer(invoice.customerName),
    }))
  );
}
```

---

## 6. Technology Stack Decisions

### Core Technologies
- **NestJS 10**: Existing framework, excellent dependency injection
- **Prisma 5.6.0**: Database ORM with migration support
- **PostgreSQL**: Existing database, ACID compliance for data integrity
- **Redis**: Caching layer for dashboard performance
- **Bull Queue**: Job processing for import progress tracking

### Additional Dependencies
- **csv-parser**: Primary CSV parsing library
- **@nestjs/schedule**: Cron job scheduling for hourly monitoring
- **@nestjs-cls/transactional**: Transaction management with automatic rollback
- **socket.io**: WebSocket implementation for real-time updates

### Development Tools
- **Jest**: Testing framework (existing)
- **TypeScript 5.1.3**: Type safety and development experience

---

## 7. Performance and Scalability Considerations

### File Processing Performance
- **Target**: Process 1000+ invoice records in under 5 minutes
- **Memory Management**: Streaming with backpressure management
- **Batch Size**: 1000 records per batch for optimal throughput

### Database Performance
- **Indexing Strategy**: Ensure indexes on date ranges, customer IDs, invoice numbers
- **Connection Pooling**: Leverage Prisma's connection management
- **Query Optimization**: Use aggregation pipelines for dashboard metrics

### Caching Strategy
- **Dashboard Metrics**: 5-minute TTL with event-driven invalidation
- **Lookup Data**: Longer TTL for customer/product reference data
- **Cache Warming**: Pre-compute common dashboard views

---

## 8. Security and Reliability Measures

### Data Validation
- **Input Sanitization**: Comprehensive validation for all CSV fields
- **Business Rule Validation**: Enforce data integrity constraints
- **Type Safety**: Full TypeScript coverage for all data transformations

### Error Recovery
- **Graceful Degradation**: System continues operating with partial failures
- **Retry Mechanisms**: Exponential backoff for transient failures
- **Audit Logging**: Complete transaction trails for debugging and compliance

### Monitoring and Observability
- **Import Status Tracking**: Real-time progress and completion status
- **Performance Metrics**: Processing time and throughput monitoring
- **Error Rate Monitoring**: Alert on high failure rates

---

## Next Steps

All technical unknowns have been resolved through this research phase. The implementation approach provides:

✅ **Resolved NEEDS CLARIFICATION Items**:
1. **TireMaster CSV column structure**: Custom parser with configurable mapping
2. **File monitoring approach**: Hybrid scheduled + manual trigger system
3. **Error handling strategies**: Multi-level approach with batch processing and transaction management
4. **Dashboard integration**: GraphQL extension with WebSocket real-time updates

**Ready for Phase 1**: Data model design and API contract generation can proceed with confidence in the technical approach.