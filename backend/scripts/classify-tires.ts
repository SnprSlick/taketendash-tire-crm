
import { PrismaClient, TireType, TireQuality } from '@prisma/client';
import { classifyProduct, classifyBrandQuality } from '../src/utils/tire-classifier';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting tire classification...');

  // Fetch all products
  const products = await prisma.tireMasterProduct.findMany({
    select: {
      id: true,
      tireMasterSku: true,
      description: true,
      size: true,
      type: true,
      isTire: true,
      brand: true,
      manufacturerCode: true,
      quality: true
    }
  });

  console.log(`Found ${products.length} products to classify.`);

  let updates = 0;
  let tiresFound = 0;

  for (const product of products) {
    const classification = classifyProduct({
      tireMasterSku: product.tireMasterSku,
      description: product.description,
      size: product.size
    });

    let quality: TireQuality = TireQuality.UNKNOWN;
    
    // Only classify quality if it's a tire
    if (classification.isTire) {
      tiresFound++;
      quality = classifyBrandQuality(product.brand, product.manufacturerCode);
    }

    // Debug first few items
    if (updates < 5 && product.quality !== quality) {
       console.log(`Updating ${product.tireMasterSku}: Quality ${product.quality} -> ${quality}`);
    }

    // Only update if classification or quality changed
    if (
      product.type !== classification.type || 
      product.isTire !== classification.isTire ||
      product.quality !== quality
    ) {
      await prisma.tireMasterProduct.update({
        where: { id: product.id },
        data: {
          type: classification.type,
          isTire: classification.isTire,
          quality: quality
        }
      });
      updates++;
      if (updates % 100 === 0) {
        process.stdout.write(`\rUpdated ${updates} products...`);
      }
    }
  }

  console.log(`\n\nClassification complete!`);
  console.log(`Total Products: ${products.length}`);
  console.log(`Tires Identified: ${tiresFound}`);
  console.log(`Records Updated: ${updates}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
