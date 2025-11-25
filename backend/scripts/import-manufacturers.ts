import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Mapping from Manufacturer Code (in CSV) to Full Brand Name (for display)
const BRAND_MAPPING: Record<string, string> = {
  'GY': 'Goodyear',
  'MI': 'Michelin',
  'BFG': 'BFGoodrich',
  'BRI': 'Bridgestone',
  'FIR': 'Firestone',
  'CON': 'Continental',
  'DUN': 'Dunlop',
  'HAN': 'Hankook',
  'KUM': 'Kumho',
  'NEX': 'Nexen',
  'NIT': 'Nitto',
  'PIR': 'Pirelli',
  'TOY': 'Toyo',
  'YOK': 'Yokohama',
  'COO': 'Cooper',
  'FAL': 'Falken',
  'GEN': 'General',
  'GTR': 'GT Radial',
  'HER': 'Hercules',
  'IRO': 'Ironman',
  'KEL': 'Kelly',
  'MAS': 'Mastercraft',
  'MIC': 'Mickey Thompson',
  'MUL': 'Multi-Mile',
  'SUM': 'Sumitomo',
  'UNI': 'Uniroyal',
  'VOG': 'Vogue',
  'AC': 'AC Delco',
  'ALC': 'Alcoa',
  'ALL': 'Alliance',
  'AMR': 'Americus',
  'AR': 'American Racing',
  'AS': 'Armstrong',
  'BAN': 'Bandag',
  'BEN': 'Bendix',
  'BG': 'BG Products',
  'BKT': 'BKT',
  'BLKH': 'Blackhawk',
  'CAL': 'Cachland',
  'CAR': 'Carlisle',
  'CAS': 'Castrol',
  'CEN': 'Centramatic',
  'CHE': 'Havoline',
  'CRP': 'CRP',
  'DBLC': 'Double Coin',
  'DEE': 'Deestone',
  'DEL': 'Delinte',
  'DURO': 'Duro',
  'DYNT': 'Dynatrac',
  'FUZ': 'Fuzion',
  'GAL': 'Galaxy',
  'KEN': 'Kenda',
  'LING': 'Linglong',
  'MAST': 'Mastercraft',
  'MAX': 'Maxxis',
  'MAXAM': 'Maxam',
  'MCH': 'Michelin',
  'MISC': 'Miscellaneous',
  'MOB': 'Mobil',
  'MSTRK': 'Mastertrack',
  'OTAN': 'Ohtsu',
  'OTR': 'OTR',
  'PEN': 'Pennzoil',
  'PIRNX': 'Pirelli',
  'PWRK': 'Power King',
  'RHEMA': 'Rema Tip Top',
  'ROAD': 'Roadmaster',
  'SAI': 'Sailun',
  'SAM': 'Samson',
  'SCH': 'Schrader',
  'STAR': 'Starfire',
  'TIT': 'Titan',
  'TRAN': 'Triangle',
  'USED': 'Used Tires',
  'VAL': 'Valvoline',
  'VEE': 'Vee Rubber',
  'WAG': 'Wagner',
  'WES': 'Westlake',
  'ZEE': 'Zeetex',
};

async function main() {
  const filePath = path.join(__dirname, '../data/invmfg_newallstore.csv');
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let currentMfgCode = '';
  let processedCount = 0;
  let updatedCount = 0;

  console.log('Starting manufacturer import...');

  for await (const line of rl) {
    processedCount++;
    
    let cleanLine = line.trim();
    if (cleanLine.startsWith('"')) cleanLine = cleanLine.substring(1);
    if (cleanLine.endsWith('"')) cleanLine = cleanLine.substring(0, cleanLine.length - 1);
    
    const columns = cleanLine.split('","');
    
    if (columns.length === 0) continue;

    // Check for Mfg line (Type 1: Starts with Mfg)
    if (columns[0].startsWith('Mfg:')) {
      const mfgPart = columns[0].replace('Mfg:', '').trim();
      
      if (mfgPart !== currentMfgCode) {
        currentMfgCode = mfgPart;
      }
      
      const productCode = columns[1]?.trim();
      if (productCode && productCode !== '.') {
        const updated = await updateProduct(productCode, currentMfgCode);
        if (updated) updatedCount++;
      }
    } else if (columns[0] === 'Manufacturer Report') {
      // Skip header lines where column 26 is "Site#:", "Product Code" or empty
      if (columns[26] === 'Site#:' || columns[26] === 'Product Code' || !columns[26]) {
        continue;
      }
      
      const col26 = columns[26]?.trim();
      
      // Check for Mfg line (Type 2: Embedded in Report Line)
      if (col26.startsWith('Mfg:')) {
          const mfgPart = col26.replace('Mfg:', '').trim();
          
          if (mfgPart !== currentMfgCode) {
            currentMfgCode = mfgPart;
          }
          
          // For embedded Mfg lines, the SKU is in column 27
          const productCode = columns[27]?.trim();
          if (productCode && productCode !== '.') {
            const updated = await updateProduct(productCode, currentMfgCode);
            if (updated) updatedCount++;
          }
      } else {
          // Standard Data Line
          const productCode = col26;
          // Skip if product code is just a dot or empty
          if (productCode && productCode !== '.') {
            const updated = await updateProduct(productCode, currentMfgCode);
            if (updated) updatedCount++;
          }
      }
    }
  }
  
  console.log(`Processed ${processedCount} lines.`);
  console.log(`Updated ${updatedCount} products.`);
}

async function updateProduct(sku: string, mfgCode: string): Promise<boolean> {
  if (!sku) return false;
  
  // Map brand
  let brandName = mfgCode;
  if (BRAND_MAPPING[mfgCode]) {
    brandName = BRAND_MAPPING[mfgCode];
  }
  
  // If mfgCode is empty, we might want to skip or set to "Unknown"
  // But if we have a SKU match, we should probably update it?
  // If mfgCode is empty, brandName is empty.
  if (!brandName) return false;

  try {
    const product = await prisma.tireMasterProduct.findUnique({
      where: { tireMasterSku: sku }
    });

    if (product) {
      await prisma.tireMasterProduct.update({
        where: { id: product.id },
        data: {
          manufacturerCode: mfgCode,
          brand: brandName
        }
      });
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(`Error updating ${sku}:`, error);
    return false;
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
