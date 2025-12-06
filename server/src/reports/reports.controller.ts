import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('invoices.xlsx')
  async invoicesExcel(@Res({ passthrough: true }) res: any, @Query('period') period?: string) {
    const buf = await this.svc.invoicesExcel(period);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const name = `invoices${period ? '-' + period : ''}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    return buf;
  }

  @Get('premises.xlsx')
  async premisesExcel(@Res({ passthrough: true }) res: any) {
    const buf = await this.svc.premisesExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="premises.xlsx"');
    return buf;
  }

  @Get('tenants.xlsx')
  async tenantsExcel(@Res({ passthrough: true }) res: any) {
    const buf = await this.svc.tenantsExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="tenants.xlsx"');
    return buf;
  }

  @Get('invoice/:id.pdf')
  async invoicePdf(@Param('id') id: string, @Res({ passthrough: true }) res: any) {
    const buf = await this.svc.invoicePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
    return buf;
  }

  @Get('payments.xlsx')
  async paymentsExcel(@Res({ passthrough: true }) res: any) {
    const buf = await this.svc.paymentsExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="payments.xlsx"');
    return buf;
  }

  @Get('templates/tenants.csv')
  tenantsTemplate(@Res({ passthrough: true }) res: any) {
    const buf = this.svc.tenantsCsvTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tenants-template.csv"');
    return buf;
  }

  @Get('templates/premises.csv')
  premisesTemplate(@Res({ passthrough: true }) res: any) {
    const buf = this.svc.premisesCsvTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="premises-template.csv"');
    return buf;
  }

  @Get('templates/payments.csv')
  paymentsTemplate(@Res({ passthrough: true }) res: any) {
    const buf = this.svc.paymentsCsvTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="payments-template.csv"');
    return buf;
  }
}
