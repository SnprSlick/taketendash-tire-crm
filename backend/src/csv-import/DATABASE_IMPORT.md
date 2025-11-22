# CSV Database Import System

## Overview

Efficient PostgreSQL import system for TireMaster CSV invoice data. Designed to handle large quantities of data with batch processing, transactions, and comprehensive error handling.

## Features

✅ **Efficient Batch Processing** - Processes 50 invoices at a time in transactions
✅ **Customer Deduplication** - Caches and reuses customer records
✅ **Transaction Safety** - Atomic batch operations with rollback capability
✅ **Progress Tracking** - Real-time progress updates via WebSocket
✅ **Error Handling** - Detailed error logging and recovery
✅ **Rollback Support** - Complete import batch rollback
✅ **Performance Optimized** - Designed for large datasets

## Database Schema

### New Fields Added to Invoice Model:
- `vehicleInfo` - Vehicle description from invoice
- `mileage` - Vehicle mileage
- `fetTotal` - Total FET (Federal Excise Tax)
- `totalCost` - Total cost of all line items
- `grossProfit` - Total gross profit

### New Fields Added to InvoiceLineItem Model:
- `lineNumber` - Line item sequence number
- `adjustment` - Price adjustment/multiplier
- `partsCost` - Parts cost for this line
- `laborCost` - Labor cost for this line
- `fet` - Federal Excise Tax for this line

## Setup

### 1. Run Database Migration

```bash
cd backend
npx prisma migrate dev --name add_tiremaster_invoice_fields
```

This will:
- Add new columns to `invoices` and `invoice_line_items` tables
- Create necessary indexes for performance
- Generate Prisma client with new types

### 2. Ensure PostgreSQL is Running

```bash
# Check if database is accessible
npx prisma db push
```

### 3. Start the Backend Server

```bash
npm run start:dev
```

## Usage

### API Endpoints

#### 1. Import CSV to Database

**POST** `/api/csv-import/database/import`

Upload a CSV file and import it to the database.

```bash
curl -X POST \\
  http://localhost:3001/api/csv-import/database/import \\
  -H 'Content-Type: multipart/form-data' \\
  -F 'file=@tiremaster-sample-1.csv'
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully imported 37 of 37 invoices",
  "data": {
    "importBatchId": "clxxx...",
    "fileName": "tiremaster-sample-1.csv",
    "parsing": {
      "totalLines": 178,
      "totalInvoices": 37,
      "totalLineItems": 140
    },
    "import": {
      "totalInvoices": 37,
      "successfulInvoices": 37,
      "failedInvoices": 0,
      "totalLineItems": 140,
      "duration": 1234
    },
    "errors": []
  }
}
```

#### 2. Get Import Batch Statistics

**GET** `/api/csv-import/database/batch/:batchId`

```bash
curl http://localhost:3001/api/csv-import/database/batch/clxxx...
```

#### 3. Rollback Import Batch

**DELETE** `/api/csv-import/database/batch/:batchId`

Completely removes all invoices and line items from an import batch.

```bash
curl -X DELETE http://localhost:3001/api/csv-import/database/batch/clxxx...
```

## Architecture

### Service: `DatabaseImportService`

Located: `src/csv-import/services/database-import.service.ts`

**Key Methods:**
- `importInvoices()` - Main import orchestrator
- `processBatch()` - Process batch in transaction
- `getOrCreateCustomer()` - Deduplicate customers with caching
- `rollbackImport()` - Remove all data from batch
- `getImportStats()` - Get batch statistics

**Performance Features:**
- **Batch Size**: 50 invoices per transaction
- **Customer Caching**: In-memory cache prevents duplicate lookups
- **Bulk Insert**: Uses `createMany()` for line items
- **Transaction Timeout**: 60 seconds per batch
- **Progress Callbacks**: Real-time progress updates

### Controller: `CsvDatabaseImportController`

Located: `src/csv-import/controllers/csv-database-import.controller.ts`

Handles:
- File upload
- CSV parsing
- Database import orchestration
- Progress broadcasting via WebSocket
- File archiving

### Data Flow

```
1. Upload CSV → Controller
2. Parse CSV → TireMasterCsvParser
3. Validate Data → CsvFormatValidator
4. Import Batch → DatabaseImportService
   ├─ Create ImportBatch record
   ├─ Process in batches of 50
   │  ├─ Start transaction
   │  ├─ Get/Create customers (cached)
   │  ├─ Create invoices
   │  ├─ Bulk create line items
   │  └─ Commit transaction
   └─ Update batch status
5. Move to processed folder
6. Return results
```

## Performance Considerations

### For Large Datasets (1000+ invoices):

1. **Batch Size**: Adjust `BATCH_SIZE` in `database-import.service.ts`
   - Current: 50 invoices/batch
   - For faster imports: increase to 100-200
   - For stability: decrease to 25

2. **Transaction Timeout**: Adjust in `processBatch()` method
   - Current: 60 seconds
   - For large batches: increase to 120+ seconds

3. **Database Indexes**: Already optimized
   - Invoice number (unique)
   - Customer ID
   - Invoice date
   - Salesperson
   - Product code
   - Import batch ID

4. **Connection Pool**: Configure in `DATABASE_URL`
   ```
   postgresql://user:pass@localhost:5432/db?connection_limit=20
   ```

## Error Handling

### Parsing Errors
- Logged in `ImportError` table
- Does not stop import
- Invoice skipped, others continue

### Database Errors
- Transaction rolled back for batch
- Other batches unaffected
- Detailed error logging

### Recovery
- Use rollback endpoint to remove bad imports
- Fix CSV and re-import
- Import batch tracks all operations

## Monitoring

### WebSocket Progress Events

Connect to `ws://localhost:3001` and listen for:

```javascript
// Parsing progress
{
  event: 'parsing.progress',
  data: {
    fileName: 'invoice.csv',
    processedLines: 100,
    totalLines: 178
  }
}

// Import progress
{
  event: 'import.progress',
  data: {
    fileName: 'invoice.csv',
    processedInvoices: 20,
    totalInvoices: 37,
    currentInvoice: '3-327551'
  }
}
```

### Database Queries

```sql
-- Check import status
SELECT * FROM import_batches ORDER BY started_at DESC;

-- Count imported invoices
SELECT COUNT(*) FROM invoices WHERE import_batch_id = 'xxx';

-- Check for errors
SELECT * FROM import_errors WHERE import_batch_id = 'xxx';

-- View recent invoices
SELECT * FROM invoices ORDER BY created_at DESC LIMIT 10;
```

## Example: Full Import Workflow

```bash
# 1. Ensure database is ready
cd backend
npx prisma migrate dev

# 2. Start server
npm run start:dev

# 3. Import CSV
curl -X POST \\
  http://localhost:3001/api/csv-import/database/import \\
  -F 'file=@data/invoice2025small.csv'

# Save the importBatchId from response

# 4. Check import stats
curl http://localhost:3001/api/csv-import/database/batch/{importBatchId}

# 5. Query database
npx prisma studio
# Browse invoices and invoice_line_items tables

# 6. If needed, rollback
curl -X DELETE http://localhost:3001/api/csv-import/database/batch/{importBatchId}
```

## Updating Frontend to Use Database

Once data is in the database, update the frontend to fetch from the API instead of static JSON:

```typescript
// frontend/src/app/csv-import/page.tsx
const response = await fetch('/api/invoices');
const data = await response.json();
setCsvData(data.invoices);
```

Create a new endpoint in backend to serve paginated invoices:

```typescript
// backend/src/controllers/invoice.controller.ts
@Get('api/invoices')
async getInvoices(@Query() query: { page?: number; limit?: number }) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  
  const [invoices, total] = await Promise.all([
    this.prisma.invoice.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: { lineItems: true, customer: true },
      orderBy: { invoiceDate: 'desc' }
    }),
    this.prisma.invoice.count()
  ]);
  
  return { invoices, total, page, limit };
}
```

## Next Steps

1. ✅ Schema updated with TireMaster fields
2. ✅ Efficient import service created
3. ✅ REST endpoints implemented
4. ⏳ Run migration (manual step)
5. ⏳ Test with sample data
6. ⏳ Update frontend to use database
7. ⏳ Add invoice query endpoints
8. ⏳ Implement filtering/search

## Support

For issues or questions, check:
- Database schema: `backend/prisma/schema.prisma`
- Import service: `backend/src/csv-import/services/database-import.service.ts`
- Controller: `backend/src/csv-import/controllers/csv-database-import.controller.ts`
- Logs: Check server console for detailed error messages
