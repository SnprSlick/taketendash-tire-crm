
import { PrismaClient, TireType } from '@prisma/client';
import { classifyProduct } from '../src/utils/tire-classifier';

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
      isTire: true
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

    if (classification.isTire) {
      tiresFound++;
    }

    // Only update if classification changed
    if (product.type !== classification.type || product.isTire !== classification.isTire) {
      await prisma.tireMasterProduct.update({
        where: { id: product.id },
        data: {
          type: classification.type,
          isTire: classification.isTire
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
