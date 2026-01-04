import { IsEmail, IsOptional, IsString, IsEnum } from 'class-validator';

export enum LeadStatusEnum {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  WON = 'WON',
  LOST = 'LOST',
}

export class CreateLeadDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsEnum(LeadStatusEnum)
  status?: LeadStatusEnum;
}
