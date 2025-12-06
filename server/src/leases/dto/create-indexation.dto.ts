import { IsDateString, IsNumber, Min } from 'class-validator';

export class CreateIndexationDto {
  @IsNumber()
  @Min(0)
  factor!: number; // e.g. 1.05 means +5%

  @IsDateString()
  effectiveFrom!: string; // YYYY-MM-DD
}
