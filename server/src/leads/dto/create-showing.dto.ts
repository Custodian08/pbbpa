import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateShowingDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  premiseId?: string;

  @IsOptional()
  @IsString()
  agent?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
