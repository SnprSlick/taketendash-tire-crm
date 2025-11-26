
import { PrismaClient, TireType } from '@prisma/client';

const prisma = new PrismaClient();

interface ClassificationRule {
  id: TireType;
  name: string;
  priority: number;
  sizePatterns: RegExp[];
  keywords: string[];
  excludeKeywords: string[];
}

const rules: ClassificationRule[] = [
  {
    id: TireType.TRAILER,
    name: "Trailer (ST)",
    priority: 10,
    sizePatterns: [
      /^ST\d{3}\/\d{2}[R|D]\d{2}/i,
      /^\d{1,2}\.\d{1,2}-\d{1,2}.*ST/i
    ],
    keywords: ["TRAILER", "ST ", "TOWING", "BOAT", "UTILITY"],
    excludeKeywords: ["STEER", "DRIVE"]
  },
  {
    id: TireType.ATV_UTV,
    name: "ATV / UTV",
    priority: 20,
    sizePatterns: [
      /^\d{2}x\d{1,2}-\d{1,2}$/i,
      /^\d{2}x\d{1,2}R\d{1,2}$/i,
      /^AT\d{2}x\d{1,2}-\d{1,2}$/i
    ],
    keywords: ["ATV", "UTV", "QUAD", "SIDE BY SIDE", "SXS", "MUD LITE"],
    excludeKeywords: []
  },
  {
    id: TireType.LAWN_GARDEN,
    name: "Lawn & Garden",
    priority: 30,
    sizePatterns: [
      /^\d{1,2}x\d{1,2}\.\d{2}-\d{1,2}$/i,
      /^\d{1,2}x\d{1,2}-\d{1,2}$/i,
      /^4\.10\/3\.50-\d{1,2}$/i
    ],
    keywords: ["LAWN", "GARDEN", "TURF", "MOWER", "WHEELBARROW", "HAND TRUCK", "GOLF CART"],
    excludeKeywords: []
  },
  {
    id: TireType.INDUSTRIAL,
    name: "Industrial / Forklift",
    priority: 40,
    sizePatterns: [
      /^\d{1,2}-\d{1,2}\.5$/i, // e.g. 12-16.5 (Skid Steer)
      /^\d{1,2}\.\d{1,2}-\d{1,2}$/i,
      /^\d{1,3}x\d{1,2}x\d{1,2}$/i,
      /^\d{1,3}x\d{1,2}-\d{1,2}$/i
    ],
    keywords: ["SKID STEER", "FORKLIFT", "SOLID", "PRESS-ON", "PNEUMATIC", "BOBCAT", "INDUSTRIAL", "NHS", "LUG"],
    excludeKeywords: []
  },
  {
    id: TireType.AGRICULTURAL,
    name: "Agricultural / Farm",
    priority: 50,
    sizePatterns: [
      /^\d{1,3}\.?\d{0,2}-\d{2}$/i,
      /^\d{3}\/\d{2}R\d{2}$/i,
      /^\d{1,2}\.\d{1}-\d{2}$/i
    ],
    keywords: ["TRACTOR", "FARM", "IMPLEMENT", "R-1", "R-3", "F-2", "AG ", "AGRICULTURAL", "HARVESTER"],
    excludeKeywords: ["ATV"]
  },
  {
    id: TireType.OTR,
    name: "OTR / Earthmover",
    priority: 60,
    sizePatterns: [
      /^\d{2}\.\d{1,2}-\d{2}$/i,
      /^\d{2}\.\d{1,2}R\d{2}$/i,
      /^\d{2,3}\/\d{2}R\d{2}$/i
    ],
    keywords: ["EARTHMOVER", "LOADER", "GRADER", "MINING", "E-3", "E-4", "L-3", "L-5", "G-2", "OTR"],
    excludeKeywords: []
  },
  {
    id: TireType.MEDIUM_TRUCK,
    name: "Medium Truck / TBR",
    priority: 70,
    sizePatterns: [
      /^\d{2,3}\/\d{2}R(17\.5|19\.5|22\.5|24\.5)$/i,
      /^\d{1,2}R(17\.5|19\.5|22\.5|24\.5)$/i,
      /^\d{1,2}\.\d{2}R(20|22\\.5|24\\.5)$/i
    ],
    keywords: ["TBR", "COMMERCIAL", "STEER", "DRIVE", "TRAILER POS", "BUS", "RADIAL TRUCK"],
    excludeKeywords: []
  },
  {
    id: TireType.LIGHT_TRUCK,
    name: "Light Truck",
    priority: 80,
    sizePatterns: [
      /^LT\d{3}\/\d{2}[R|D|B]\d{2}/i,
      /^\d{3}\/\d{2}[R|D|B]\d{2}LT/i,
      /^\d{2}x\d{2}\.\d{1,2}[R|D|B]\d{2}LT?/i,
      /^\d{2}x\d{2}\.\d{1,2}[R|D|B]\d{2}/i
    ],
    keywords: ["LT", "LIGHT TRUCK", "MUD TERRAIN", "ALL TERRAIN", "M/T", "A/T", "R/T"],
    excludeKeywords: ["ATV", "UTV", "GOLF"]
  },
  {
    id: TireType.PASSENGER,
    name: "Passenger Car",
    priority: 90,
    sizePatterns: [
      /^P?\d{3}\/\d{2}[R|D|B]\d{2}$/i, 
      /^P\d{3}\/\d{2}[R|D|B]\d{2}$/i,
      /^\d{3}\/\d{2}Z[R|D|B]\d{2}$/i
    ],
    keywords: ["PASSENGER", "TOURING", "UHP", "SEDAN", "COUPE"],
    excludeKeywords: ["LT", "ST", "TRAILER"]
  }
];

const nonTireKeywords = [
  "TUBE", "FLAP", "VALVE", "STEM", "WHEEL", "RIM", "O-RING", 
  "WEIGHT", "STUD", "CHAIN", "REPAIR", "PATCH", "SENSOR", "TPMS",
  "MOUNT", "DISMOUNT", "BALANCE", "LABOR", "SERVICE", "FEE",
  "CAP", "CORE", "EXTENSION", "GASKET", "NUT", "BOLT", "WASHER",
  "ALIGNMENT", "OIL", "FILTER", "WIPER", "BATTERY"
];

const nonTireSkuPrefixes = ["TUB", "FLP", "VAL", "WHL", "RIM", "ACC", "SRV", "LAB", "ENV", "STW"];

function isNonTire(sku: string, description: string): boolean {
  const upperDesc = description.toUpperCase();
  const upperSku = sku.toUpperCase();

  // Check SKU prefixes
  if (nonTireSkuPrefixes.some(prefix => upperSku.startsWith(prefix))) {
    return true;
  }

  // Check keywords
  if (nonTireKeywords.some(keyword => upperDesc.includes(keyword))) {
    // Exception: If it says "TIRE" or "TYRE", it might be a tire even if it has other keywords (e.g. "TIRE REPAIR" is not a tire, but "TIRE" is)
    // But usually "TIRE REPAIR" is a service.
    // Let's be safe: if it has "TIRE" but also "REPAIR", it's not a tire.
    if (upperDesc.includes("TIRE") && !upperDesc.includes("REPAIR") && !upperDesc.includes("MOUNT")) {
      return false;
    }
    return true;
  }

  return false;
}

function classifyProduct(product: { tireMasterSku: string, description: string | null, size: string }) {
  const description = product.description || "";
  const size = product.size || "";
  const sku = product.tireMasterSku;

  // 1. Check if it's NOT a tire
  if (isNonTire(sku, description)) {
    return { isTire: false, type: TireType.OTHER };
  }

  // 2. Try to classify based on rules
  // Sort rules by priority (ascending)
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    // Check Size Patterns
    if (size) {
      for (const pattern of rule.sizePatterns) {
        if (pattern.test(size)) {
          return { isTire: true, type: rule.id };
        }
      }
    }

    // Check Keywords
    const upperDesc = description.toUpperCase();
    const hasKeyword = rule.keywords.some(k => upperDesc.includes(k));
    const hasExclude = rule.excludeKeywords.some(k => upperDesc.includes(k));

    if (hasKeyword && !hasExclude) {
      return { isTire: true, type: rule.id };
    }
  }

  // Default fallback
  // If it has a size that looks like a tire size but didn't match specific rules, default to PASSENGER or OTHER?
  // If size is empty, it's likely not a tire or we can't tell.
  if (size && size.length > 3) {
    // Simple heuristic: if it looks like a passenger tire size
    if (/^\d{3}\/\d{2}R\d{2}$/.test(size)) {
      return { isTire: true, type: TireType.PASSENGER };
    }
    return { isTire: true, type: TireType.OTHER }; // Unknown tire type
  }

  return { isTire: false, type: TireType.OTHER };
}

async function main() {
  console.log("Starting tire classification...");

  const products = await prisma.tireMasterProduct.findMany();
  console.log(`Found ${products.length} products to process.`);

  let updates = 0;
  let tiresFound = 0;

  for (const product of products) {
    const result = classifyProduct({
      tireMasterSku: product.tireMasterSku,
      description: product.description,
      size: product.size
    });

    if (result.isTire) tiresFound++;

    // Only update if changed
    if (product.isTire !== result.isTire || product.type !== result.type) {
      await prisma.tireMasterProduct.update({
        where: { id: product.id },
        data: {
          isTire: result.isTire,
          type: result.type
        }
      });
      updates++;
      if (updates % 100 === 0) process.stdout.write('.');
    }
  }

  console.log(`\nFinished!`);
  console.log(`Updated ${updates} products.`);
  console.log(`Identified ${tiresFound} tires out of ${products.length} items.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
