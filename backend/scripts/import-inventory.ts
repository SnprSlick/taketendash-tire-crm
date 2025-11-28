import { PrismaClient } from '@prisma/client';
import { TireMasterInventoryParser } from '../src/csv-import/processors/tiremaster-inventory-parser';
import { CsvFileProcessor } from '../src/csv-import/processors/csv-file-processor';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as path from 'path';
import { classifyBrandQuality } from '../src/utils/tire-classifier';

const prisma = new PrismaClient();

// Mock EventEmitter for CsvFileProcessor
const eventEmitter = new EventEmitter2();
const csvProcessor = new CsvFileProcessor(eventEmitter);
const parser = new TireMasterInventoryParser(csvProcessor);

async function main() {
  const filePath = path.join(__dirname, '../data', 'inventorymasterlist.csv');
  console.log(`Parsing ${filePath}...`);

  if (!require('fs').existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
  }

  const result = await parser.parse(filePath);
  console.log(`Parsed ${result.inventoryItems.length} items.`);

  // Cache Stores
  const storeMap = new Map<string, string>();
  const stores = await prisma.store.findMany();
  stores.forEach((s: { code: string; id: string; name: string }) => storeMap.set(s.code, s.id));

  // Cache Locations (TireMasterLocation)
  const locationMap = new Map<string, string>();
  const locations = await prisma.tireMasterLocation.findMany();
  locations.forEach((l: { tireMasterCode: string; id: string }) => locationMap.set(l.tireMasterCode, l.id));

  let processedCount = 0;
  const total = result.inventoryItems.length;

  for (const item of result.inventoryItems) {
    // 1. Ensure Location Exists
    let locationId = locationMap.get(item.siteCode);
    if (!locationId) {
        // Check if it maps to a Store
        const storeId = storeMap.get(item.siteCode);
        let storeName = `Site ${item.siteCode}`;
        if (storeId) {
            const store = stores.find((s: { id: string }) => s.id === storeId);
            if (store) storeName = store.name;
        }

        try {
            const newLoc = await prisma.tireMasterLocation.create({
                data: {
                    tireMasterCode: item.siteCode,
                    name: storeName
                }
            });
            locationId = newLoc.id;
            locationMap.set(item.siteCode, locationId);
            console.log(`Created Location: ${storeName} (${item.siteCode})`);
        } catch (e) {
            // Handle race condition if running in parallel (though we are sequential here)
            const existing = await prisma.tireMasterLocation.findUnique({ where: { tireMasterCode: item.siteCode }});
            if (existing) {
                locationId = existing.id;
                locationMap.set(item.siteCode, locationId);
            } else {
                console.error(`Failed to create location ${item.siteCode}`, e);
                continue;
            }
        }
    }

    if (!locationId) {
        console.error(`Could not resolve locationId for site ${item.siteCode}`);
        continue;
    }

    // 2. Extract Brand
    // Heuristic: First word of description
    let brand = item.description.split(' ')[0] || 'Unknown';
    // Clean up brand (remove trailing comma, etc if any)
    brand = brand.replace(/[^a-zA-Z0-9]/g, '');
    if (brand.length < 2) brand = 'Unknown';
    
    // 3. Upsert Product
    // We use productCode as unique identifier (tireMasterSku)
    try {
        const product = await prisma.tireMasterProduct.upsert({
            where: { tireMasterSku: item.productCode },
            update: {
                // Update fields if needed, e.g. description
                description: item.description,
                size: item.size,
                // brand: brand, // Don't overwrite brand if it exists, maybe?
                laborPrice: item.labor,
                fetAmount: item.fet,
                updatedAt: new Date()
            },
            create: {
                tireMasterSku: item.productCode,
                brand: brand,
                pattern: 'Unknown', // We don't have pattern in CSV
                size: item.size,
                type: 'PASSENGER', // Default, need classifier
                season: 'ALL_SEASON', // Default
                quality: classifyBrandQuality(brand),
                description: item.description,
                laborPrice: item.labor,
                fetAmount: item.fet,
                isActive: true
            }
        });

        // 4. Upsert Inventory
        await prisma.tireMasterInventory.upsert({
            where: {
                productId_locationId: {
                    productId: product.id,
                    locationId: locationId
                }
            },
            update: {
                quantity: Math.round(item.onHand), // Ensure integer
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
        console.error(`Error processing item ${item.productCode}:`, e);
    }

    processedCount++;
    if (processedCount % 1000 === 0) {
        console.log(`Processed ${processedCount}/${total} items...`);
    }
  }
  
  console.log('Import complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
