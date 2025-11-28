import { classifyBrandQuality } from '../src/utils/tire-classifier';

const brands = ['Michelin', 'Goodyear', 'Sailun', 'UnknownBrand'];

brands.forEach(b => {
  console.log(`${b}: ${classifyBrandQuality(b)}`);
});