import { Controller, Get, Param, Res } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}

  @Get('contract/:leaseId.pdf')
  async contract(@Param('leaseId') leaseId: string, @Res({ passthrough: true }) res: any) {
    const buf = await this.svc.contractPdf(leaseId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contract-${leaseId}.pdf"`);
    return buf;
  }

  @Get('contract/:leaseId.docx')
  @Roles('ADMIN')
  async contractDocx(@Param('leaseId') leaseId: string, @Res({ passthrough: true }) res: any) {
    const buf = await this.svc.contractDocx(leaseId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="contract-${leaseId}.docx"`);
    return buf;
  }

  @Get('act/:invoiceId.pdf')
  async act(@Param('invoiceId') invoiceId: string, @Res({ passthrough: true }) res: any) {
    const buf = await this.svc.actPdf(invoiceId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="act-${invoiceId}.pdf"`);
    return buf;
  }

  @Get('invoice/:invoiceId.docx')
  @Roles('ADMIN')
  async invoiceDocx(@Param('invoiceId') invoiceId: string, @Res({ passthrough: true }) res: any) {
    const buf = await this.svc.invoiceDocx(invoiceId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceId}.docx"`);
    return buf;
  }
}
