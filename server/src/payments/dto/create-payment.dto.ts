import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentSource } from '@prisma/client';

export class CreatePaymentDto {
  @IsString()
  tenantId!: string;

  @IsNumber()
  amount!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsEnum(PaymentSource)
  source?: PaymentSource;
}
