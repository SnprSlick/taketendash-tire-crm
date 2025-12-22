import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class TireMasterCustomerDto {
  @IsNumber()
  CUCD: number;

  @IsString()
  @IsOptional()
  NAME: string;

  @IsString()
  @IsOptional()
  CONTACT: string;

  @IsString()
  @IsOptional()
  COMPANY: string;

  @IsString()
  @IsOptional()
  ADDRESS1: string;

  @IsString()
  @IsOptional()
  ADDRESS2: string;

  @IsString()
  @IsOptional()
  CITY: string;

  @IsString()
  @IsOptional()
  STATE: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value != null ? String(value) : value)
  ZIP: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value != null ? String(value) : value)
  BPHONE: string;

  @IsString()
  @IsOptional()
  EMail: string;

  @IsNumber()
  @IsOptional()
  CREDIT: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value != null ? String(value) : value)
  TERMS: string;

  @IsNumber()
  @IsOptional()
  ACTIVE: number;

  @IsString()
  @IsOptional()
  lastsync: string;
}

export class TireMasterProductDto {
  @IsNumber()
  PARTNO: number;

  @IsString()
  @IsOptional()
  INVNO: string;

  @IsString()
  @IsOptional()
  MFG: string;

  @IsString()
  @IsOptional()
  SIZE: string;

  @IsString()
  @IsOptional()
  CAT: string;

  @IsString()
  @IsOptional()
  NAME: string;

  @IsNumber()
  @IsOptional()
  WEIGHT: number;

  @IsNumber()
  @IsOptional()
  ACTIVE: number;

  @IsString()
  @IsOptional()
  lastsync: string;

  @IsString()
  @IsOptional()
  VENDPARTNO: string;

  @IsNumber()
  @IsOptional()
  NEXTCOST: number;

  @IsNumber()
  @IsOptional()
  LASTCOST: number;

  @IsNumber()
  @IsOptional()
  EDL: number;

  @IsNumber()
  @IsOptional()
  DBILL: number;

  @IsNumber()
  @IsOptional()
  SALE_PRICE: number;
}

export class TireMasterVehicleDto {
  @IsNumber()
  VHNO: number;

  @IsNumber()
  @IsOptional()
  CUCD: number;

  @IsString()
  @IsOptional()
  VIN: string;

  @IsString()
  @IsOptional()
  MAKE: string;

  @IsString()
  @IsOptional()
  MODEL: string;

  @IsString()
  @IsOptional()
  YEAR: string;

  @IsString()
  @IsOptional()
  LICNO: string;

  @IsNumber()
  @IsOptional()
  MILEAGE: number;

  @IsString()
  @IsOptional()
  lastsync: string;
}

export class TireMasterInvoiceDto {
  @IsNumber()
  INVOICE: number;

  @IsNumber()
  @IsOptional()
  CUCD: number;

  @IsString()
  @IsOptional()
  INVDATE: string;

  @IsNumber()
  @IsOptional()
  TAX: number;

  @IsNumber()
  @IsOptional()
  NOTAXABLE: number;

  @IsNumber()
  @IsOptional()
  TAXABLE: number;

  @IsNumber()
  @IsOptional()
  SITENO: number;

  @IsString()
  @IsOptional()
  SALESMAN: string;

  @IsString()
  @IsOptional()
  lastsync: string;
}

export class TireMasterInvoiceItemDto {
  @IsNumber()
  INVOICE: number;

  @IsNumber()
  LINENUM: number;

  @IsNumber()
  @IsOptional()
  SITENO: number;

  @IsNumber()
  @IsOptional()
  PARTNO: number;

  @IsString()
  @IsOptional()
  DESCR: string;

  @IsNumber()
  @IsOptional()
  QTY: number;

  @IsNumber()
  @IsOptional()
  AMOUNT: number;

  @IsNumber()
  @IsOptional()
  COST: number;

  @IsNumber()
  @IsOptional()
  FETAX: number;

  @IsNumber()
  @IsOptional()
  LABOR: number;

  @IsString()
  @IsOptional()
  lastsync: string;
}

export class SyncCustomersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TireMasterCustomerDto)
  customers: TireMasterCustomerDto[];
}

export class SyncInventoryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TireMasterProductDto)
  inventory: TireMasterProductDto[];
}

export class SyncVehiclesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TireMasterVehicleDto)
  vehicles: TireMasterVehicleDto[];
}

export class SyncInvoicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TireMasterInvoiceDto)
  invoices: TireMasterInvoiceDto[];
}

export class SyncInvoiceItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TireMasterInvoiceItemDto)
  details: TireMasterInvoiceItemDto[];
}
