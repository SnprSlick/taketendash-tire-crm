import { IsEnum, IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsDateString } from 'class-validator';

export enum SyncType {
  PRODUCTS = 'PRODUCTS',
  INVENTORY = 'INVENTORY',
  PRICES = 'PRICES',
  ORDERS = 'ORDERS',
  FULL = 'FULL',
}

export enum TireType {
  PASSENGER = 'PASSENGER',
  LIGHT_TRUCK = 'LIGHT_TRUCK',
  MEDIUM_TRUCK = 'MEDIUM_TRUCK',
  INDUSTRIAL = 'INDUSTRIAL',
  AGRICULTURAL = 'AGRICULTURAL',
  OTR = 'OTR',
  TRAILER = 'TRAILER',
  ATV_UTV = 'ATV_UTV',
  LAWN_GARDEN = 'LAWN_GARDEN',
  COMMERCIAL = 'COMMERCIAL',
  SPECIALTY = 'SPECIALTY',
  OTHER = 'OTHER',
}

export enum TireSeason {
  ALL_SEASON = 'ALL_SEASON',
  SUMMER = 'SUMMER',
  WINTER = 'WINTER',
}

export enum MappingType {
  EXACT = 'EXACT',
  EQUIVALENT = 'EQUIVALENT',
  SUBSTITUTE = 'SUBSTITUTE',
}

export class SyncTireMasterDataDto {
  @IsEnum(SyncType)
  syncType: SyncType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  brands?: string[];

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TireMasterProductSearchDto {
  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsEnum(TireType)
  type?: TireType;

  @IsOptional()
  @IsEnum(TireSeason)
  season?: TireSeason;

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsString()
  availability?: string;
}

export class CreateTireMasterMappingDto {
  @IsString()
  tireMasterProductId: string;

  @IsString()
  crmProductId: string;

  @IsEnum(MappingType)
  mappingType: MappingType;

  @IsOptional()
  @IsBoolean()
  autoSync?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTireMasterMappingDto {
  @IsOptional()
  @IsEnum(MappingType)
  mappingType?: MappingType;

  @IsOptional()
  @IsBoolean()
  autoSync?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TireMasterInventoryUpdateDto {
  @IsString()
  productId: string;

  @IsString()
  locationId: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TireMasterSalesOrderFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class CreateTireMasterProductDto {
  @IsString()
  tireMasterSku: string;

  @IsString()
  brand: string;

  @IsString()
  pattern: string;

  @IsString()
  size: string;

  @IsEnum(TireType)
  type: TireType;

  @IsEnum(TireSeason)
  season: TireSeason;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  specifications?: string;

  @IsOptional()
  @IsString()
  warrantyInfo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

export class UpdateTireMasterProductDto {
  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsEnum(TireType)
  type?: TireType;

  @IsOptional()
  @IsEnum(TireSeason)
  season?: TireSeason;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  specifications?: string;

  @IsOptional()
  @IsString()
  warrantyInfo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}