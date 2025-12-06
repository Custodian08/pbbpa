import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

function bufferFromPdf(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async invoicesExcel(period?: string) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Invoices');
    ws.columns = [
      { header: '№', key: 'number', width: 18 },
      { header: 'Дата', key: 'date', width: 14 },
      { header: 'Статус', key: 'status', width: 18 },
      { header: 'Арендатор', key: 'tenant', width: 32 },
      { header: 'Общая сумма', key: 'total', width: 16 },
    ];

    let where: any = {};
    if (period) {
      const [y, m] = period.split('-').map((v) => parseInt(v, 10));
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    const rows = await this.prisma.invoice.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { accrual: { include: { lease: { include: { tenant: true } } } } },
    });

    for (const inv of rows) {
      ws.addRow({
        number: inv.number,
        date: inv.date.toISOString().slice(0, 10),
        status: inv.status,
        tenant: inv.accrual.lease.tenant.name,
        total: Number(inv.accrual.total),
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async premisesExcel() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Premises');
    ws.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Код', key: 'code', width: 16 },
      { header: 'Адрес', key: 'address', width: 40 },
      { header: 'Тип', key: 'type', width: 12 },
      { header: 'Этаж', key: 'floor', width: 8 },
      { header: 'Площадь, м2', key: 'area', width: 14 },
      { header: 'Тариф', key: 'rateType', width: 10 },
      { header: 'Базовая ставка', key: 'baseRate', width: 16 },
      { header: 'Статус', key: 'status', width: 12 },
    ];
    const rows = await this.prisma.premise.findMany({ orderBy: { address: 'asc' } });
    for (const p of rows) {
      ws.addRow({
        id: p.id,
        code: p.code ?? '',
        address: p.address,
        type: p.type,
        floor: p.floor ?? '',
        area: Number(p.area),
        rateType: p.rateType,
        baseRate: p.baseRate ? Number(p.baseRate) : '',
        status: p.status,
      });
    }
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async tenantsExcel() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Tenants');
    ws.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Тип', key: 'type', width: 12 },
      { header: 'Наименование', key: 'name', width: 32 },
      { header: 'УНП', key: 'unp', width: 16 },
      { header: 'E-mail', key: 'email', width: 24 },
      { header: 'Телефон', key: 'phone', width: 16 },
      { header: 'Р/счёт', key: 'bank', width: 20 },
      { header: 'Адрес', key: 'address', width: 36 },
    ];
    const rows = await this.prisma.tenant.findMany({ orderBy: { name: 'asc' } });
    for (const t of rows) {
      ws.addRow({
        id: t.id,
        type: t.type,
        name: t.name,
        unp: t.unp,
        email: t.email ?? '',
        phone: t.phone ?? '',
        bank: t.bankAccount ?? '',
        address: t.address ?? '',
      });
    }
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async paymentsExcel() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Payments');
    ws.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Дата', key: 'date', width: 14 },
      { header: 'Арендатор', key: 'tenant', width: 32 },
      { header: 'Сумма', key: 'amount', width: 14 },
      { header: 'Статус', key: 'status', width: 14 },
      { header: 'Источник', key: 'source', width: 12 },
      { header: 'Счет (ID)', key: 'invoiceId', width: 36 },
    ];
    const rows = await this.prisma.payment.findMany({ include: { tenant: true }, orderBy: { date: 'desc' } });
    for (const p of rows) {
      ws.addRow({
        id: p.id,
        date: p.date.toISOString().slice(0, 10),
        tenant: p.tenant.name,
        amount: Number(p.amount),
        status: p.status,
        source: p.source,
        invoiceId: p.linkedInvoiceId ?? '',
      });
    }
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  tenantsCsvTemplate() {
    const header = 'type,name,unp,email,phone,bankAccount,address\n';
    const sample = 'LEGAL,ООО Ромашка,123456789,info@acme.by,+375291112233,BY00UNBS00000000000000000000,г. Минск, ул. Ленина 1\n';
    return Buffer.from(header + sample, 'utf-8');
  }

  premisesCsvTemplate() {
    const header = 'code,type,address,floor,area,rateType,baseRate,status,availableFrom\n';
    const sample = 'A-101,OFFICE,г. Минск, ул. Ленина 1,5,45.5,M2,25.00,FREE,2025-01-01\n';
    return Buffer.from(header + sample, 'utf-8');
  }

  paymentsCsvTemplate() {
    const header = 'tenantId,amount,date,invoiceNumber,source\n';
    const sample = '<<TENANT_ID>>,1200.00,2025-01-15,INV-202501-0001,MANUAL\n';
    return Buffer.from(header + sample, 'utf-8');
  }

  async invoicePdf(invoiceId: string) {
    const inv = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { accrual: { include: { lease: { include: { tenant: true, premise: true } } } } },
    });
    if (!inv) throw new NotFoundException('Invoice not found');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.fontSize(16).text('Счет на оплату', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Поставщик: Landlord LLC`);
    doc.text(`Дата: ${inv.date.toISOString().slice(0, 10)}`);
    doc.text(`Номер счета: ${inv.number}`);
    doc.moveDown();
    doc.text(`Покупатель: ${inv.accrual.lease.tenant.name}`);
    doc.moveDown();
    doc.text(`Основание: Договор аренды, помещение: ${inv.accrual.lease.premise.address}`);
    const base = Number(inv.accrual.baseAmount);
    const vat = Number(inv.accrual.vatAmount);
    const total = Number(inv.accrual.total);
    doc.moveDown();
    doc.text(`Сумма без НДС: ${base.toFixed(2)} BYN`);
    doc.text(`НДС: ${vat.toFixed(2)} BYN`);
    doc.text(`Итого к оплате: ${total.toFixed(2)} BYN`);
    doc.moveDown(2);
    doc.text('Подпись: ______________________');

    const buf = await bufferFromPdf(doc);
    return buf;
  }
}
