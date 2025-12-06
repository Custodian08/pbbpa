import { IsDateString, IsOptional } from 'class-validator';

export class AgingQueryDto {
  @IsOptional()
  @IsDateString()
  asOf?: string; // ISO date; default = today
}
