import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullName?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ required: false, enum: ['ADMIN', 'OPERATOR', 'ANALYST', 'USER'] })
  @IsOptional()
  @IsString()
  roleName?: 'ADMIN' | 'OPERATOR' | 'ANALYST' | 'USER';
}
