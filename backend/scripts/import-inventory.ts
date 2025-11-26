import { PrismaClient, TireType, TireSeason } from '@prisma/client';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { classifyProduct } from '../src/utils/tire-classifier';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, '../data/inventorymasterlist.csv');
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Starting inventory import from ${filePath}...`);

  // Ensure Default Price List exists
  const defaultPriceList = await prisma.tireMasterPriceList.upsert({
    where: { tireMasterCode: 'DEFAULT' },
    update: {},
    create: {
      tireMasterCode: 'DEFAULT',
      name: 'Default Price List',
      currency: 'USD',
      isActive: true
    }
  });

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  let processedCount = 0;
  let errorCount = 0;

  // Cache locations to minimize DB lookups
  const locationCache = new Map<string, string>(); // code -> id

  // Helper to parse CSV line (handling quotes)
  const parseCsvLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current);
    return fields.map(f => f.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
  };

  let currentSiteId: string | null = null;

  for await (const line of rl) {
    lineCount++;
    if (lineCount % 1000 === 0) {
      process.stdout.write(`\rProcessed ${lineCount} lines...`);
    }

    const fields = parseCsvLine(line);
    
    // Skip empty lines or lines with too few fields
    if (fields.length < 20) continue;

    let dataStartIndex = 22;

    // Check for Site change
    if (fields[22] === 'Site#:') {
      currentSiteId = fields[23];
      dataStartIndex = 24;
    }

    if (!currentSiteId) continue;

    const productCode = fields[dataStartIndex];
    
    // Skip invalid rows (like the "..." row)
    if (!productCode || productCode === '...' || productCode === '.') continue;

    const size = fields[dataStartIndex + 1];
    const description = fields[dataStartIndex + 2];
    const onHand = parseFloat(fields[dataStartIndex + 3]) || 0;
    const unpriced = parseFloat(fields[dataStartIndex + 4]) || 0;
    // const total = parseFloat(fields[dataStartIndex + 5]) || 0;
    const partsPrice = parseFloat(fields[dataStartIndex + 6]) || 0;
    const laborPrice = parseFloat(fields[dataStartIndex + 7]) || 0;
    const fetAmount = parseFloat(fields[dataStartIndex + 8]) || 0;

    try {
      const siteCode = currentSiteId;


      // 1. Get or Create Location
      let locationId = locationCache.get(siteCode);
      if (!locationId) {
        const location = await prisma.tireMasterLocation.upsert({
          where: { tireMasterCode: siteCode },
          update: {},
          create: {
            tireMasterCode: siteCode,
            name: `Store ${siteCode}`, // We can update names later or use a map
            isActive: true
          }
        });
        locationId = location.id;
        locationCache.set(siteCode, locationId);
      }

      // 2. Upsert Product
      // Classify the product
      const classification = classifyProduct({
        tireMasterSku: productCode,
        description: description,
        size: size
      });

      const product = await prisma.tireMasterProduct.upsert({
        where: { tireMasterSku: productCode },
        update: {
          description: description,
          size: size,
          laborPrice: laborPrice,
          fetAmount: fetAmount,
          // Update classification if it was previously unknown or generic
          // But maybe we should trust the script's latest logic?
          // Let's update it to keep it fresh with our rules
          type: classification.type,
          isTire: classification.isTire,
        },
        create: {
          tireMasterSku: productCode,
          brand: 'Unknown', // Placeholder
          pattern: 'Unknown', // Placeholder
          size: size || 'Unknown',
          type: classification.type,
          season: TireSeason.ALL_SEASON, // Default
          description: description,
          laborPrice: laborPrice,
          fetAmount: fetAmount,
          isActive: true,
          isTire: classification.isTire
        }
      });

      // 3. Upsert Inventory
      await prisma.tireMasterInventory.upsert({
        where: {
          productId_locationId: {
            productId: product.id,
            locationId: locationId
          }
        },
        update: {
          quantity: Math.floor(onHand), // Assuming integer quantity
          lastUpdated: new Date()
        },
        create: {
          productId: product.id,
          locationId: locationId,
          quantity: Math.floor(onHand),
          availableQty: Math.floor(onHand)
        }
      });

      // 4. Upsert Price (Parts)
      if (partsPrice > 0) {
        await prisma.tireMasterPrice.upsert({
          where: {
            productId_priceListId: {
              productId: product.id,
              priceListId: defaultPriceList.id
            }
          },
          update: {
            listPrice: partsPrice,
            updatedAt: new Date()
          },
          create: {
            productId: product.id,
            priceListId: defaultPriceList.id,
            listPrice: partsPrice
          }
        });
      }

      processedCount++;

    } catch (error: any) {
      console.error(`\nError processing line ${lineCount}: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n\nImport completed!`);
  console.log(`Total lines scanned: ${lineCount}`);
  console.log(`Records processed: ${processedCount}`);
  console.log(`Errors: ${errorCount}`);

  // 5. Backfill InvoiceLineItems
  console.log('\nLinking InvoiceLineItems to Products...');
  
  // We can do this in SQL for speed
  const updateCount = await prisma.$executeRaw`
    UPDATE "invoice_line_items" ili
    SET "tire_master_product_id" = tmp.id
    FROM "tire_master_products" tmp
    WHERE ili."product_code" = tmp."tireMasterSku"
    AND ili."tire_master_product_id" IS NULL
  `;

  console.log(`Linked ${updateCount} invoice line items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
