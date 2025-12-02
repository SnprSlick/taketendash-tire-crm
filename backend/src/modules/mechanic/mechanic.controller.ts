import { Controller, Get, Post, Delete, UseInterceptors, UploadedFile, BadRequestException, Query, UseGuards, ForbiddenException, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MechanicService } from './mechanic.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as Papa from 'papaparse';
import { CreateMechanicLaborDto } from './dto/create-mechanic-labor.dto';
import { User } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('mechanic')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MechanicController {
  constructor(private readonly mechanicService: MechanicService) {
    console.log('🔧 MechanicController initialized');
  }

  @Post('clear')
  async deleteAll() {
    console.log('Received request to delete all mechanic data');
    try {
      const result = await this.mechanicService.deleteAll();
      console.log('Delete result:', result);
      return result;
    } catch (error) {
      console.error('Error deleting mechanic data:', error);
      throw error;
    }
  }

  @Get('summary')
  async getSummary(@Query('storeId') storeId?: string, @User() user?: any) {
    let allowedStoreIds: string[] | undefined;
    
    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      if (storeId) {
        if (!user.stores.includes(storeId)) {
          throw new ForbiddenException('You do not have access to this store');
        }
      } else {
        allowedStoreIds = user.stores;
      }
    }

    return this.mechanicService.getMechanicSummary(storeId, allowedStoreIds);
  }

  @Get('analytics')
  async getAnalytics(@Query('storeId') storeId?: string, @User() user?: any) {
    console.log(`Fetching mechanic analytics${storeId ? ` for store ${storeId}` : ''}...`);
    
    let allowedStoreIds: string[] | undefined;
    
    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      if (storeId) {
        if (!user.stores.includes(storeId)) {
          throw new ForbiddenException('You do not have access to this store');
        }
      } else {
        allowedStoreIds = user.stores;
      }
    }

    return this.mechanicService.getMechanicAnalytics(storeId, allowedStoreIds);
  }

  @Get('details/:name')
  async getMechanicDetails(
    @Param('name') name: string,
    @Query('storeId') storeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @User() user?: any
  ) {
    const decodedName = decodeURIComponent(name);
    console.log(`Fetching details for mechanic: ${decodedName}`);

    let allowedStoreIds: string[] | undefined;
    
    if (user && user.role === 'MECHANIC') {
      allowedStoreIds = undefined;
    } else if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      if (storeId) {
        if (!user.stores.includes(storeId)) {
          throw new ForbiddenException('You do not have access to this store');
        }
      } else {
        allowedStoreIds = user.stores;
      }
    }

    return this.mechanicService.getMechanicDetails(decodedName, storeId, allowedStoreIds, startDate, endDate);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('mechanicName') mechanicName?: string,
    @Query('storeId') storeId?: string,
    @User() user?: any
  ) {
    const take = limit ? parseInt(limit) : 50;
    const skip = page ? (parseInt(page) - 1) * take : 0;
    
    let where: any = {};
    let allowedStoreIds: string[] | undefined;

    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      if (storeId) {
        if (!user.stores.includes(storeId)) {
          throw new ForbiddenException('You do not have access to this store');
        }
      } else {
        allowedStoreIds = user.stores;
      }
    }

    if (mechanicName) {
        where.mechanicName = mechanicName;
    }

    if (search) {
      where.OR = [
        { mechanicName: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { productCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.mechanicService.findAll({
      skip,
      take,
      where,
      orderBy: { createdAt: 'desc' },
      storeId,
      allowedStoreIds
    });
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/csv',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async importCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const fileContent = fs.readFileSync(file.path, 'utf8');
    
    // Parse CSV using PapaParse
    const parseResult = Papa.parse(fileContent, {
      header: false,
      skipEmptyLines: true,
    });

    const rows = parseResult.data as any[][];
    const results: CreateMechanicLaborDto[] = [];
    
    let currentMechanic: string | null = null;
    let currentCategory: string | null = null;
    let headerMap: Record<string, number> | null = null;
    let lastNonEmptyRow: string[] | null = null;

    console.log(`Starting parse of ${rows.length} rows...`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i].map(cell => String(cell).trim());
      
      // Debug first few rows and any row with "Name:"
      if (i < 5 || row.some(cell => cell.toLowerCase().startsWith('name:'))) {
          console.log(`Row ${i}:`, JSON.stringify(row));
      }

      // 1. Detect Mechanic Name (Can be anywhere in the row)
      const nameIndex = row.findIndex(cell => cell && cell.toString().trim() === 'Name:');
      if (nameIndex !== -1 && row[nameIndex + 1]) {
          currentMechanic = row[nameIndex + 1].trim();
          console.log(`Found Mechanic: ${currentMechanic}`);
          currentCategory = null; // Reset category for new mechanic
      }

      // 2. Detect Category (Can be anywhere)
      const catIndex = row.findIndex(cell => cell && cell.toString().trim().startsWith('Category:'));
      let dataStartIndex = -1;

      if (catIndex !== -1) {
          // Check if it's a "Totals for" row
          if (catIndex > 0 && row[catIndex - 1] && row[catIndex - 1].toString().trim() === 'Totals for') {
              continue; // Skip totals row
          }
          
          currentCategory = row[catIndex].toString().replace(/^Category:\s*/i, '').trim();
          
          // If this is a category row, the data usually starts immediately after (Date is next)
          // Check if next cell is a date
          if (row[catIndex + 1] && row[catIndex + 1].toString().includes('/')) {
              dataStartIndex = catIndex + 1;
          }
      }

      // 3. If we haven't found data start yet, look for a Date cell
      if (dataStartIndex === -1) {
          // Find a cell that looks like a date (contains / and is not "Date" or "Printed:")
          const dateIndex = row.findIndex(cell => {
              if (!cell) return false;
              const s = cell.toString().trim();
              return s.includes('/') && 
                     !s.toLowerCase().startsWith('printed') && 
                     !s.toLowerCase().startsWith('selected') &&
                     s.toLowerCase() !== 'date';
          });

          if (dateIndex !== -1) {
              dataStartIndex = dateIndex;
          }
      }

      // If we still don't have a valid data start, skip this row
      if (dataStartIndex === -1) {
          continue;
      }

      // 4. Process Data
      if (currentMechanic) {
        const getCol = (offset: number) => row[dataStartIndex + offset];

        const dateVal = getCol(0);
        const invoiceNumber = getCol(1);
        
        // Validation:
        // 1. Must have invoice number
        // 2. Invoice number should not be "Invoice" (header)
        // 3. Must have product code (Col 2)
        
        if (!invoiceNumber || 
            invoiceNumber.toString().toLowerCase() === 'invoice' ||
            !getCol(2)) {
          continue;
        }

        const dto = new CreateMechanicLaborDto();
        dto.mechanicName = currentMechanic;
        dto.category = currentCategory || 'Uncategorized';
        let rawInvoice = invoiceNumber.toString();
        // Fix for NA invoices missing dash (e.g. 4-NA343699 -> 4-NA-343699)
        if (rawInvoice.includes('NA') && !rawInvoice.includes('NA-')) {
            rawInvoice = rawInvoice.replace(/NA(\d)/, 'NA-$1');
        }
        dto.invoiceNumber = rawInvoice;
        dto.productCode = getCol(2).toString(); 
        // Description is at getCol(3)

        if (dateVal) {
            const dateStr = dateVal.toString();
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
                dto.createdAt = parsedDate;
            }
        }

        const parseCurrency = (val: any) => {
            if (!val) return 0;
            const s = val.toString();
            // Check for negative indicator (parenthesis) BEFORE cleaning
            const isNegative = s.includes('(');
            
            const clean = s.replace(/[$,\s()]/g, '');
            const parsed = parseFloat(clean);
            
            let result = isNaN(parsed) ? 0 : parsed;
            if (isNegative) {
                result = -Math.abs(result);
            }
            return result;
        };

        const parsePercent = (val: any) => {
            if (!val) return 0;
            const s = val.toString();
            const isNegative = s.includes('(');
            const clean = s.replace(/[%,\s()]/g, '');
            const parsed = parseFloat(clean);
            let result = isNaN(parsed) ? 0 : parsed;
            if (isNegative) {
                result = -Math.abs(result);
            }
            return result;
        };

        dto.quantity = parseCurrency(getCol(4)); // Qty
        dto.parts = parseCurrency(getCol(5));    // Parts
        dto.labor = parseCurrency(getCol(6));    // Labor
        dto.totalCost = parseCurrency(getCol(8)); // Cost (Total is at 7, Cost at 8)
        dto.grossProfit = parseCurrency(getCol(9)); // Gross Profit
        dto.gpPercent = parsePercent(getCol(10));   // GP%

        results.push(dto);
      }
    }

    try {
      let insertedCount = 0;
      if (results.length > 0) {
        const result = await this.mechanicService.createMany(results);
        insertedCount = result.count;
      }
      fs.unlinkSync(file.path); // Clean up
      
      const skipped = results.length - insertedCount;
      const message = skipped > 0 
        ? `Import successful. ${insertedCount} records created. ${skipped} skipped due to missing invoices.`
        : `Import successful. ${insertedCount} records created.`;

      return { 
        message, 
        count: insertedCount,
        skipped,
        debug: {
            totalRows: rows.length,
            mechanicsFound: results.map(r => r.mechanicName).filter((v, i, a) => a.indexOf(v) === i),
            categoriesFound: results.map(r => r.category).filter((v, i, a) => a.indexOf(v) === i)
        }
      };
    } catch (error) {
      console.error('Error saving records:', error);
      throw error;
    }
  }
}
