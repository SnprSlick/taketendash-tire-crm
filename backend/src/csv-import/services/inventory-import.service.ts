
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TireMasterInventoryParser } from '../processors/tiremaster-inventory-parser';
import { classifyBrandQuality } from '../../utils/tire-classifier';
import * as fs from 'fs';
import * as readline from 'readline';

@Injectable()
export class InventoryImportService {
  private readonly logger = new Logger(InventoryImportService.name);

  // Mapping from Manufacturer Code to Full Brand Name
  private readonly BRAND_MAPPING: Record<string, string> = {
    'GY': 'Goodyear', 'MI': 'Michelin', 'BFG': 'BFGoodrich', 'BRI': 'Bridgestone', 'FIR': 'Firestone',
    'CON': 'Continental', 'DUN': 'Dunlop', 'HAN': 'Hankook', 'KUM': 'Kumho', 'NEX': 'Nexen',
    'NIT': 'Nitto', 'PIR': 'Pirelli', 'TOY': 'Toyo', 'YOK': 'Yokohama', 'COO': 'Cooper',
    'FAL': 'Falken', 'GEN': 'General', 'GTR': 'GT Radial', 'HER': 'Hercules', 'IRO': 'Ironman',
    'KEL': 'Kelly', 'MAS': 'Mastercraft', 'MIC': 'Mickey Thompson', 'MUL': 'Multi-Mile',
    'SUM': 'Sumitomo', 'UNI': 'Uniroyal', 'VOG': 'Vogue', 'AC': 'AC Delco', 'ALC': 'Alcoa',
    'ALL': 'Alliance', 'AMR': 'Americus', 'AR': 'American Racing', 'AS': 'Armstrong',
    'BAN': 'Bandag', 'BEN': 'Bendix', 'BG': 'BG Products', 'BKT': 'BKT', 'BLKH': 'Blackhawk',
    'CAL': 'Cachland', 'CAR': 'Carlisle', 'CAS': 'Castrol', 'CEN': 'Centramatic', 'CHE': 'Havoline',
    'CRP': 'CRP', 'DBLC': 'Double Coin', 'DEE': 'Deestone', 'DEL': 'Delinte', 'DURO': 'Duro',
    'DYNT': 'Dynatrac', 'FUZ': 'Fuzion', 'GAL': 'Galaxy', 'KEN': 'Kenda', 'LING': 'Linglong',
    'MAST': 'Mastercraft', 'MAX': 'Maxxis', 'MAXAM': 'Maxam', 'MCH': 'Michelin', 'MISC': 'Miscellaneous',
    'MOB': 'Mobil', 'MSTRK': 'Mastertrack', 'OTAN': 'Ohtsu', 'OTR': 'OTR', 'PEN': 'Pennzoil',
    'PIRNX': 'Pirelli', 'PWRK': 'Power King', 'RHEMA': 'Rema Tip Top', 'ROAD': 'Roadmaster',
    'SAI': 'Sailun', 'SAM': 'Samson', 'SCH': 'Schrader', 'STAR': 'Starfire', 'TIT': 'Titan',
    'TRAN': 'Triangle', 'USED': 'Used Tires', 'VAL': 'Valvoline', 'VEE': 'Vee Rubber',
    'WAG': 'Wagner', 'WES': 'Westlake', 'ZEE': 'Zeetex'
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: TireMasterInventoryParser
  ) {}

  async importInventory(filePath: string): Promise<{ processed: number; created: number }> {
    this.logger.log(`Starting inventory import from ${filePath}`);
    
    const result = await this.parser.parse(filePath);
    this.logger.log(`Parsed ${result.inventoryItems.length} items.`);

    // Cache Stores
    const storeMap = new Map<string, string>();
    const stores = await this.prisma.store.findMany();
    stores.forEach(s => storeMap.set(s.code, s.id));

    // Cache Locations
    const locationMap = new Map<string, string>();
    const locations = await this.prisma.tireMasterLocation.findMany();
    locations.forEach(l => locationMap.set(l.tireMasterCode, l.id));

    let processedCount = 0;
    let createdCount = 0;

    for (const item of result.inventoryItems) {
      // 1. Ensure Location Exists
      let locationId = locationMap.get(item.siteCode);
      if (!locationId) {
        const storeId = storeMap.get(item.siteCode);
        let storeName = `Site ${item.siteCode}`;
        if (storeId) {
          const store = stores.find(s => s.id === storeId);
          if (store) storeName = store.name;
        }

        try {
          const newLoc = await this.prisma.tireMasterLocation.create({
            data: {
              tireMasterCode: item.siteCode,
              name: storeName
            }
          });
          locationId = newLoc.id;
          locationMap.set(item.siteCode, locationId);
          this.logger.log(`Created Location: ${storeName} (${item.siteCode})`);
        } catch (e) {
          const existing = await this.prisma.tireMasterLocation.findUnique({ where: { tireMasterCode: item.siteCode }});
          if (existing) {
            locationId = existing.id;
            locationMap.set(item.siteCode, locationId);
          } else {
            this.logger.error(`Failed to create location ${item.siteCode}`, e);
            continue;
          }
        }
      }

      if (!locationId) continue;

      // 2. Extract Brand (Heuristic)
      let brand = item.description.split(' ')[0] || 'Unknown';
      brand = brand.replace(/[^a-zA-Z0-9]/g, '');
      if (brand.length < 2) brand = 'Unknown';

      // 3. Upsert Product
      try {
        const product = await this.prisma.tireMasterProduct.upsert({
          where: { tireMasterSku: item.productCode },
          update: {
            description: item.description,
            size: item.size,
            laborPrice: item.labor,
            fetAmount: item.fet,
            updatedAt: new Date()
          },
          create: {
            tireMasterSku: item.productCode,
            brand: brand,
            pattern: 'Unknown',
            size: item.size,
            type: 'PASSENGER', // Default, will be updated by classifier later or separate process
            season: 'ALL_SEASON',
            quality: classifyBrandQuality(brand),
            description: item.description,
            laborPrice: item.labor,
            fetAmount: item.fet,
            isActive: true
          }
        });

        if (product.createdAt.getTime() === product.updatedAt.getTime()) {
            createdCount++;
        }

        // 4. Upsert Inventory
        await this.prisma.tireMasterInventory.upsert({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: locationId
            }
          },
          update: {
            quantity: Math.round(item.onHand),
            lastUpdated: new Date()
          },
          create: {
            productId: product.id,
            locationId: locationId,
            quantity: Math.round(item.onHand),
            availableQty: Math.round(item.onHand)
          }
        });
      } catch (e) {
        this.logger.error(`Error processing item ${item.productCode}:`, e);
      }

      processedCount++;
    }

    return { processed: processedCount, created: createdCount };
  }

  async importBrands(filePath: string): Promise<{ processed: number; updated: number }> {
    this.logger.log(`Starting brand import from ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let currentMfgCode = '';
    let processedCount = 0;
    let updatedCount = 0;

    for await (const line of rl) {
      processedCount++;
      
      let cleanLine = line.trim();
      if (cleanLine.startsWith('"')) cleanLine = cleanLine.substring(1);
      if (cleanLine.endsWith('"')) cleanLine = cleanLine.substring(0, cleanLine.length - 1);
      
      const columns = cleanLine.split('","');
      
      if (columns.length === 0) continue;

      if (columns[0].startsWith('Mfg:')) {
        let mfgPart = columns[0].replace('Mfg:', '').trim();
        
        // Fallback if mfgPart is empty but we have a description in col 3
        // Example: "Mfg:   ", "RKL-10000-01", "", "RIMKLEEN RED"
        if (!mfgPart && columns[3]) {
             const desc = columns[3].trim();
             if (desc) {
                 // Use first word as manufacturer code/name
                 mfgPart = desc.split(' ')[0];
                 this.logger.warn(`Inferred manufacturer '${mfgPart}' from description '${desc}' for empty Mfg code`);
             }
        }

        if (mfgPart !== currentMfgCode) currentMfgCode = mfgPart;
        
        const productCode = columns[1]?.trim();
        if (productCode && productCode !== '.') {
          const updated = await this.updateProductBrand(productCode, currentMfgCode);
          if (updated) updatedCount++;
        }
      } else if (columns[0] === 'Manufacturer Report') {
        if (columns[26] === 'Site#:' || columns[26] === 'Product Code' || !columns[26]) continue;
        
        const col26 = columns[26]?.trim();
        if (col26.startsWith('Mfg:')) {
            const mfgPart = col26.replace('Mfg:', '').trim();
            if (mfgPart !== currentMfgCode) currentMfgCode = mfgPart;
            
            const productCode = columns[27]?.trim();
            if (productCode && productCode !== '.') {
              const updated = await this.updateProductBrand(productCode, currentMfgCode);
              if (updated) updatedCount++;
            }
        } else {
            const productCode = col26;
            if (productCode && productCode !== '.') {
              const updated = await this.updateProductBrand(productCode, currentMfgCode);
              if (updated) updatedCount++;
            }
        }
      }
    }

    return { processed: processedCount, updated: updatedCount };
  }

  private async updateProductBrand(sku: string, mfgCode: string): Promise<boolean> {
    if (!sku) return false;
    
    let brandName = mfgCode;
    if (this.BRAND_MAPPING[mfgCode]) {
      brandName = this.BRAND_MAPPING[mfgCode];
    }
    
    if (!brandName) return false;

    try {
      const product = await this.prisma.tireMasterProduct.findUnique({
        where: { tireMasterSku: sku }
      });

      if (product) {
        const newQuality = classifyBrandQuality(brandName, mfgCode);
        
        await this.prisma.tireMasterProduct.update({
          where: { id: product.id },
          data: {
            manufacturerCode: mfgCode,
            brand: brandName,
            quality: newQuality
          }
        });
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error updating ${sku}:`, error);
      return false;
    }
  }

  async clearInventory(): Promise<void> {
    this.logger.log('Clearing all inventory data...');
    await this.prisma.tireMasterInventory.deleteMany({});
    // Optionally delete products too? Or just inventory levels?
    // User asked to "clear their respective databses". 
    // For inventory, it usually means stock levels. But if products were imported via inventory import, maybe delete products too?
    // Let's stick to inventory levels for now to be safe, or maybe delete products that are not linked to anything else?
    // Actually, the prompt says "clear their respective databses".
    // Inventory import populates TireMasterProduct and TireMasterInventory.
    // Brand import updates TireMasterProduct.
    
    // If I clear inventory, I should probably clear TireMasterInventory table.
    // If I clear brands, I might just reset brands to 'Unknown'? Or maybe the user implies clearing the imported data.
    
    // Let's assume "Clear Inventory" means clearing the TireMasterInventory table.
    // And maybe "Clear Brands" means resetting brand info? Or maybe there isn't a separate "Brand Database".
    // The user said "clear their respective databses".
    
    // I'll implement clearInventory to delete from TireMasterInventory.
  }

  async clearBrands(): Promise<void> {
      // Reset brands to Unknown for all products?
      this.logger.log('Resetting brand information...');
      await this.prisma.tireMasterProduct.updateMany({
          data: {
              brand: 'Unknown',
              manufacturerCode: null
          }
      });
  }
}
