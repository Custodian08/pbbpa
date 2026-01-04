import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const p = page ? Number(page) : undefined;
    const ps = pageSize ? Number(pageSize) : undefined;
    return this.service.list({ page: p, pageSize: ps, status, source, search, dateFrom, dateTo });
  }

  @Post()
  @Roles('OPERATOR', 'ADMIN', 'ACCOUNTANT')
  create(@Body() dto: CreatePaymentDto) {
    return this.service.create(dto);
  }

  @Post('import')
  @Roles('OPERATOR', 'ADMIN', 'ACCOUNTANT')
  import(@Body() dtos: CreatePaymentDto[]) {
    return this.service.import(dtos);
  }

  @Get('unresolved')
  @Roles('OPERATOR', 'ADMIN', 'ACCOUNTANT')
  unresolved() {
    return this.service.listUnresolved();
  }

  @Post(':id/apply')
  @Roles('OPERATOR', 'ADMIN', 'ACCOUNTANT')
  apply(@Param('id') id: string, @Body() body: { invoiceNumber: string }) {
    return this.service.apply(id, body.invoiceNumber);
  }

  @Post(':id/refund')
  @Roles('OPERATOR', 'ADMIN', 'ACCOUNTANT')
  refund(@Param('id') id: string) {
    return this.service.refund(id);
  }
}
