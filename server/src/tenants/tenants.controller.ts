import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('OPERATOR', 'ADMIN')
  create(@Body() dto: CreateTenantDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('OPERATOR', 'ADMIN')
  update(@Param('id') id: string, @Body() dto: Partial<CreateTenantDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('OPERATOR', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('import')
  @Roles('OPERATOR', 'ADMIN')
  import(@Body() dtos: CreateTenantDto[]) {
    return this.service.import(dtos);
  }
}
