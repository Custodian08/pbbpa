import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { LeasesService } from './leases.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('leases')
@Controller('leases')
export class LeasesController {
  constructor(private readonly service: LeasesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLeaseDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateLeaseDto>) {
    return this.service.update(id, dto);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @Post(':id/terminate')
  terminate(@Param('id') id: string) {
    return this.service.terminate(id);
  }

  @Post(':id/close')
  close(@Param('id') id: string) {
    return this.service.close(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/accruals')
  accruals(@Param('id') id: string) {
    return this.service.accruals(id);
  }

  @Get(':id/invoices')
  invoices(@Param('id') id: string) {
    return this.service.invoices(id);
  }

  @Get(':id/payments')
  payments(@Param('id') id: string) {
    return this.service.payments(id);
  }

  @Get(':id/indexations')
  indexations(@Param('id') id: string) {
    return this.service.indexations(id);
  }
}
