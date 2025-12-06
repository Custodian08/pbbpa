import { IsEnum, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';
import { PremiseTypeE, RateType, PremiseStatus } from '@prisma/client';

export class CreatePremiseDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsEnum(PremiseTypeE)
  type!: PremiseTypeE;

  @IsString()
  address!: string;

  @IsOptional()
  @IsNumber()
  floor?: number;

  @IsNumber()
  area!: number;

  @IsEnum(RateType)
  rateType!: RateType;

  @IsOptional()
  @IsNumber()
  baseRate?: number;

  @IsOptional()
  @IsEnum(PremiseStatus)
  status?: PremiseStatus;

  @IsOptional()
  @IsDateString()
  availableFrom?: string;
}
