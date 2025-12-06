import { IsString, MinLength } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  userId!: string;

  @IsString()
  @MinLength(3)
  roleName!: string; // e.g., ADMIN, OPERATOR, ANALYST
}
