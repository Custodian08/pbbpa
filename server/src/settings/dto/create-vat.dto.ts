import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber } from 'class-validator';

export class CreateVatDto {
  @ApiProperty({ example: 20 })
  @IsNumber()
  rate!: number;

  @ApiProperty({ example: '2025-01-01' })
  @IsDateString()
  validFrom!: string; // YYYY-MM-DD
}
