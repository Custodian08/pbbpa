import { IsString, Matches } from 'class-validator';

export class RunBillingDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  period!: string; // YYYY-MM
}
