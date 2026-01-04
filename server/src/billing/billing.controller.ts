import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { BillingService } from './billing.service';
import { RunBillingDto } from './dto/run-billing.dto';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Post('run')
  @Roles('OPERATOR', 'ADMIN', 'ACCOUNTANT')
  run(@Body() dto: RunBillingDto) {
    return this.service.run(dto);
  }

  @Get('invoices')
  invoices(
    @Query('period') period?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? Number(page) : undefined;
    const ps = pageSize ? Number(pageSize) : undefined;
    return this.service.listInvoices(period, status, search, p, ps);
  }

  @Get('accruals')
  accruals(@Query('period') period?: string) {
    return this.service.listAccruals(period);
  }
}
