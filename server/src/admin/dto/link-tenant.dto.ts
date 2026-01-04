import { IsString } from 'class-validator';

export class LinkTenantDto {
  @IsString()
  userId!: string;

  @IsString()
  tenantId!: string;
}
