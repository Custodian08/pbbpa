import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { TenantType } from '@prisma/client';

export class CreateTenantDto {
  @IsEnum(TenantType)
  type!: TenantType;

  @IsString()
  name!: string;

  @IsString()
  unp!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
