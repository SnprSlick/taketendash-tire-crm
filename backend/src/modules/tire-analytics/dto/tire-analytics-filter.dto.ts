
import { IsOptional, IsString, IsEnum, IsDateString, IsArray } from 'class-validator';
import { TireQuality, TireType } from '@prisma/client';

export class TireAnalyticsFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  brands?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(TireQuality, { each: true })
  qualities?: TireQuality[];

  @IsOptional()
  @IsArray()
  @IsEnum(TireType, { each: true })
  types?: TireType[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @IsOptional()
  @IsString()
  storeId?: string;
  
  @IsOptional()
  @IsString()
  groupBy?: 'brand' | 'quality' | 'type' | 'size' | 'product';
}
