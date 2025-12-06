import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PremisesService } from './premises.service';
import { CreatePremiseDto } from './dto/create-premise.dto';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('premises')
@Controller('premises')
export class PremisesController {
  constructor(private readonly service: PremisesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('available')
  @Public()
  findAvailable() {
    return this.service.findAvailable();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('OPERATOR', 'ADMIN')
  create(@Body() dto: CreatePremiseDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('OPERATOR', 'ADMIN')
  update(@Param('id') id: string, @Body() dto: Partial<CreatePremiseDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('OPERATOR', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
