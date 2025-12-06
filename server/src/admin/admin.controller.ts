import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';
import { Req } from '@nestjs/common';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Post('assign-role')
  @Roles('ADMIN')
  assignRole(@Body() dto: AssignRoleDto) {
    return this.service.assignRole(dto);
  }

  @Get('audit')
  @Roles('ADMIN')
  audit(@Query('limit') limit?: string) {
    return this.service.audit(limit ? Number(limit) : 50);
  }

  @Post('bootstrap')
  // Требует авторизации, но не требует роли ADMIN. Повышает роль только если ещё нет ни одного ADMIN.
  bootstrap(@Req() req: any) {
    const userId = req.user?.sub as string;
    return this.service.bootstrap(userId);
  }
}
