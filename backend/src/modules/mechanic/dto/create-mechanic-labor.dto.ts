import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateMechanicLaborDto {
  @IsString()
  @IsNotEmpty()
  mechanicName: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsString()
  @IsNotEmpty()
  productCode: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  parts: number;

  @IsNumber()
  labor: number;

  @IsNumber()
  totalCost: number;

  @IsNumber()
  grossProfit: number;

  @IsNumber()
  gpPercent: number;

  createdAt?: Date;
}
