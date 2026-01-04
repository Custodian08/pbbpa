import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { RateType } from '@prisma/client';

export class CreateLeaseDto {
  @IsString()
  premiseId!: string;

  @IsString()
  tenantId!: string;

  @IsDateString()
  periodFrom!: string; // YYYY-MM-DD

  @IsOptional()
  @IsDateString()
  periodTo?: string | null;

  @IsEnum(RateType)
  base!: RateType; // M2 or FIXED

  @IsOptional()
  @IsString()
  @MinLength(3)
  currency?: string; // default BYN

  @IsOptional()
  @IsNumber()
  vatRate?: number; // default 20

  @IsOptional()
  @IsNumber()
  deposit?: number | null;

  @IsInt()
  @Min(1)
  dueDay!: number; // day of month

  @IsOptional()
  @IsNumber()
  penaltyRatePerDay?: number; // default 0.1

  @IsOptional()
  @IsString()
  reservationId?: string;
}
