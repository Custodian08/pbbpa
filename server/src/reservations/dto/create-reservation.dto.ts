import { IsDateString, IsString } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  premiseId!: string;

  @IsDateString()
  until!: string; // ISO date
}
