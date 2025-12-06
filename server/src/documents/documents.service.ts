import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
// ВАЖНО: берём docx через require и используем any, чтобы обойти несовместимость типов
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Docx: any = require('docx');

function bufferFromPdf(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function fmtMoney(n: number) {
  return n.toFixed(2);
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly cfg: ConfigService) {}

  private org() {
    return {
      name: this.cfg.get<string>('ORG_NAME') || 'ООО «РентАналитик»',
      unp: this.cfg.get<string>('ORG_UNP') || '192837465',
      address: this.cfg.get<string>('ORG_ADDRESS') || '220030, г. Минск, ул. Ленина, 1',
      phone: this.cfg.get<string>('ORG_PHONE') || '+375 (17) 200-00-00',
      email: this.cfg.get<string>('ORG_EMAIL') || 'info@rentalytics.by',
      iban: this.cfg.get<string>('ORG_IBAN') || 'BY00UNBS00000000000000000000',
      bank: this.cfg.get<string>('ORG_BANK') || 'ЗАО «Банк», BIC UNBSBY2X',
    };
  }

  async contractPdf(leaseId: string) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: { tenant: true, premise: true },
    });
    if (!lease) throw new NotFoundException('Lease not found');

    const org = this.org();
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.fontSize(16).text('Договор аренды', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`${org.name}, УНП ${org.unp}`);
    doc.text(`Адрес: ${org.address}`);
    doc.text(`Тел.: ${org.phone}, E-mail: ${org.email}`);
    doc.text(`Реквизиты: ${org.iban} (${org.bank})`);
    doc.moveDown();

    doc.text(`Арендатор: ${lease.tenant.name}`);
    if (lease.tenant.unp) doc.text(`УНП арендатора: ${lease.tenant.unp}`);
    doc.moveDown();

    const addr = lease.premise.address;
    const code = lease.premise.code ? ` (${lease.premise.code})` : '';
    doc.text(`Предмет аренды: помещение${code}, адрес: ${addr}`);
    doc.text(`Площадь, м²: ${Number(lease.premise.area)}`);
    const pf = new Date(lease.periodFrom as any);
    const pt = lease.periodTo ? new Date(lease.periodTo as any) : null;
    doc.text(`Период: с ${pf.toISOString().slice(0,10)}${pt ? ' по ' + pt.toISOString().slice(0,10) : ''}`);
    doc.text(`База тарифа: ${lease.base}`);
    if (lease.deposit) doc.text(`Депозит: ${Number(lease.deposit)} BYN`);
    doc.text(`Срок оплаты: до ${lease.dueDay} числа месяца`);
    doc.text(`Пени: ${Number(lease.penaltyRatePerDay)}% в день`);
    doc.moveDown();

    doc.text('Подписи сторон:');
    doc.moveDown();
    doc.text(`${org.name} ____________________`);
    doc.text(`Арендатор ____________________`);

    return bufferFromPdf(doc);
  }

  async actPdf(invoiceId: string) {
    const inv = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { accrual: { include: { lease: { include: { tenant: true, premise: true } } } } },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    const org = this.org();

    const base = Number(inv.accrual.baseAmount);
    const vat = Number(inv.accrual.vatAmount);
    const total = Number(inv.accrual.total);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.fontSize(16).text('Акт оказанных услуг', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`${org.name}, УНП ${org.unp}`);
    doc.text(`Адрес: ${org.address}`);
    doc.text(`Тел.: ${org.phone}, E-mail: ${org.email}`);
    doc.text(`Реквизиты: ${org.iban} (${org.bank})`);
    doc.moveDown();

    doc.text(`Покупатель: ${inv.accrual.lease.tenant.name}`);
    doc.text(`Основание: договор аренды, помещение: ${inv.accrual.lease.premise.address}`);
    doc.text(`Период оказания: ${inv.accrual.period.toISOString().slice(0,10)}`);
    doc.moveDown();

    doc.text(`Сумма без НДС: ${fmtMoney(base)} BYN`);
    doc.text(`НДС: ${fmtMoney(vat)} BYN`);
    doc.text(`Итого: ${fmtMoney(total)} BYN`);
    doc.moveDown(2);

    doc.text('Подписи:');
    doc.text(`${org.name} ____________________`);
    doc.text(`Покупатель ____________________`);

    return bufferFromPdf(doc);
  }

  async contractDocx(leaseId: string) {
    const lease = await this.prisma.lease.findUnique({ where: { id: leaseId }, include: { tenant: true, premise: true } });
    if (!lease) throw new NotFoundException('Lease not found');
    const org = this.org();

    const doc = new Docx.Document({
      sections: [
        {
          properties: {},
          children: [
            new Docx.Paragraph({ children: [new Docx.TextRun({ text: 'Договор аренды', bold: true, size: 28 })], spacing: { after: 200 } }),
            new Docx.Paragraph(`${org.name}, УНП ${org.unp}`),
            new Docx.Paragraph(`Адрес: ${org.address}`),
            new Docx.Paragraph(`Тел.: ${org.phone}, E-mail: ${org.email}`),
            new Docx.Paragraph(`Реквизиты: ${org.iban} (${org.bank})`),
            new Docx.Paragraph(''),
            new Docx.Paragraph(`Арендатор: ${lease.tenant.name}`),
            new Docx.Paragraph(lease.tenant.unp ? `УНП арендатора: ${lease.tenant.unp}` : ''),
            new Docx.Paragraph(''),
            new Docx.Paragraph(`Предмет аренды: помещение${lease.premise.code ? ` (${lease.premise.code})` : ''}, адрес: ${lease.premise.address}`),
            new Docx.Paragraph(`Площадь, м²: ${Number(lease.premise.area)}`),
            new Docx.Paragraph(`Период: с ${String(lease.periodFrom).slice(0,10)}${lease.periodTo ? ' по ' + String(lease.periodTo).slice(0,10) : ''}`),
            new Docx.Paragraph(`База тарифа: ${lease.base}`),
            new Docx.Paragraph(lease.deposit ? `Депозит: ${Number(lease.deposit)} BYN` : ''),
            new Docx.Paragraph(`Срок оплаты: до ${lease.dueDay} числа месяца`),
            new Docx.Paragraph(`Пени: ${Number(lease.penaltyRatePerDay)}% в день`),
            new Docx.Paragraph(''),
            new Docx.Paragraph('Подписи сторон:'),
            new Docx.Paragraph(`${org.name} ____________________`),
            new Docx.Paragraph(`Арендатор ____________________`),
          ],
        },
      ],
    });
    return Docx.Packer.toBuffer(doc);
  }

  async invoiceDocx(invoiceId: string) {
    const inv = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { accrual: { include: { lease: { include: { tenant: true, premise: true } } } } },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    const org = this.org();

    const base = Number(inv.accrual.baseAmount);
    const vat = Number(inv.accrual.vatAmount);
    const total = Number(inv.accrual.total);

    const doc = new Docx.Document({
      sections: [
        {
          properties: {},
          children: [
            new Docx.Paragraph({ children: [new Docx.TextRun({ text: 'Счет на оплату', bold: true, size: 28 })], spacing: { after: 200 } }),
            new Docx.Paragraph(`Поставщик: ${org.name}, УНП ${org.unp}`),
            new Docx.Paragraph(`Адрес: ${org.address}`),
            new Docx.Paragraph(`Тел.: ${org.phone}, E-mail: ${org.email}`),
            new Docx.Paragraph(`Реквизиты: ${org.iban} (${org.bank})`),
            new Docx.Paragraph(''),
            new Docx.Paragraph(`Дата: ${new Date(inv.date as any).toISOString().slice(0, 10)}`),
            new Docx.Paragraph(`Номер счета: ${inv.number}`),
            new Docx.Paragraph(''),
            new Docx.Paragraph(`Покупатель: ${inv.accrual.lease.tenant.name}`),
            new Docx.Paragraph(`Основание: Договор аренды, помещение: ${inv.accrual.lease.premise.address}`),
            new Docx.Paragraph(''),
            new Docx.Paragraph(`Сумма без НДС: ${base.toFixed(2)} BYN`),
            new Docx.Paragraph(`НДС: ${vat.toFixed(2)} BYN`),
            new Docx.Paragraph(`Итого к оплате: ${total.toFixed(2)} BYN`),
            new Docx.Paragraph(''),
            new Docx.Paragraph('Подпись поставщика: ______________________'),
          ],
        },
      ],
    });
    return Docx.Packer.toBuffer(doc);
  }
}
