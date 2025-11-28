
import { TireType, TireQuality } from '@prisma/client';

interface ClassificationRule {
  id: TireType;
  name: string;
  priority: number;
  sizePatterns: RegExp[];
  keywords: (string | RegExp)[];
  excludeKeywords: string[];
}

const premiumBrands = ["MICHELIN", "BRIDGESTONE", "GOODYEAR", "CONTINENTAL", "PIRELLI", "DUNLOP", "YOKOHAMA", "TOYO"];
const standardBrands = ["FIRESTONE", "BFGOODRICH", "COOPER", "HANKOOK", "FALKEN", "KUMHO", "NITTO", "GENERAL", "KELLY", "SUMITOMO", "NEXEN", "UNIROYAL", "MAXXIS"];
const economyBrands = ["SAILUN", "WESTLAKE", "BLACKHAWK", "IRONMAN", "MASTERCRAFT", "STARFIRE", "LINGLONG", "DOUBLE COIN", "SAMSON", "DEESTONE", "AMERICUS", "FUZION", "OHTSU", "ZEETEX", "TRIANGLE", "GALAXY", "BKT", "ALLIANCE", "PRINX", "FORTUNE", "MULTI-MILE", "POWER KING", "TRAILER KING", "CARLISLE"];

// Mapping from Manufacturer Code to Brand Name
export const BRAND_MAPPING: Record<string, string> = {
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

export function classifyBrandQuality(brand: string, manufacturerCode?: string | null): TireQuality {
  let checkBrand = brand;
  
  // If we have a manufacturer code, try to resolve it to a full brand name
  if (manufacturerCode && BRAND_MAPPING[manufacturerCode]) {
    checkBrand = BRAND_MAPPING[manufacturerCode];
  }

  if (!checkBrand) return TireQuality.UNKNOWN;
  const upperBrand = checkBrand.toUpperCase();
  
  if (premiumBrands.some(b => upperBrand.includes(b))) return TireQuality.PREMIUM;
  if (standardBrands.some(b => upperBrand.includes(b))) return TireQuality.STANDARD;
  if (economyBrands.some(b => upperBrand.includes(b))) return TireQuality.ECONOMY;
  
  return TireQuality.UNKNOWN;
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
    keywords: ["TRAILER", /\bST\b/, "TOWING", "BOAT", "UTILITY"],
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
    keywords: [/\bATV\b/, /\bUTV\b/, "QUAD", "SIDE BY SIDE", "SXS", "MUD LITE"],
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
    keywords: ["EARTHMOVER", "LOADER", "GRADER", "MINING", "E-3", "E-4", "L-3", "L-5", "G-2", /\bOTR\b/],
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
    keywords: [/\bTBR\b/, "COMMERCIAL", "STEER", "DRIVE", "TRAILER POS", "BUS", "RADIAL TRUCK"],
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
    keywords: [/\bLT\b/, "LIGHT TRUCK", "MUD TERRAIN", "ALL TERRAIN", "M/T", "A/T", "R/T"],
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
    if (upperDesc.includes("TIRE") && !upperDesc.includes("REPAIR") && !upperDesc.includes("MOUNT")) {
      return false;
    }
    return true;
  }

  return false;
}

export function classifyProduct(product: { tireMasterSku: string, description: string | null, size: string }) {
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
    const hasKeyword = rule.keywords.some(k => {
      if (k instanceof RegExp) {
        return k.test(upperDesc);
      }
      return upperDesc.includes(k);
    });
    const hasExclude = rule.excludeKeywords.some(k => upperDesc.includes(k));

    if (hasKeyword && !hasExclude) {
      return { isTire: true, type: rule.id };
    }
  }

  // Default fallback
  if (size && size.length > 3) {
    // Simple heuristic: if it looks like a passenger tire size
    if (/^\d{3}\/\d{2}R\d{2}$/.test(size)) {
      return { isTire: true, type: TireType.PASSENGER };
    }
    return { isTire: true, type: TireType.OTHER }; // Unknown tire type
  }

  return { isTire: false, type: TireType.OTHER };
}
