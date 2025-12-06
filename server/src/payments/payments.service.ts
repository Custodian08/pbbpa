import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceStatus, PaymentSource, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(options?: {
    page?: number;
    pageSize?: number;
    status?: string;
    source?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const where: any = {};
    if (options?.status) where.status = options.status as PaymentStatus;
    if (options?.source) where.source = options.source as PaymentSource;
    if (options?.dateFrom || options?.dateTo) {
      where.date = {} as any;
      if (options.dateFrom) (where.date as any).gte = new Date(options.dateFrom);
      if (options.dateTo) (where.date as any).lte = new Date(options.dateTo);
    }
    if (options?.search) {
      // Search by linked invoice number or tenant name via relations
      where.OR = [
        { linkedInvoice: { number: { contains: options.search, mode: 'insensitive' } } },
        { tenant: { name: { contains: options.search, mode: 'insensitive' } } },
      ];
    }
    const skip = (page - 1) * pageSize;
    const [total, items] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({ where, orderBy: { date: 'desc' }, skip, take: pageSize }),
    ]);
    return { items, total, page, pageSize };
  }

  async create(dto: CreatePaymentDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    let linkedInvoiceId: string | null = null;
    let status: PaymentStatus = 'PENDING';

    if (dto.invoiceNumber) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { number: dto.invoiceNumber },
        include: { accrual: { include: { lease: true } } },
      });
      if (invoice) {
        // ensure tenant matches
        if (invoice.accrual.lease.tenantId !== dto.tenantId) {
          // leave UNRESOLVED if mismatch
          status = 'UNRESOLVED';
        } else {
          linkedInvoiceId = invoice.id;
          status = 'APPLIED';
        }
      } else {
        status = 'UNRESOLVED';
      }
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId: dto.tenantId,
        amount: dto.amount as any,
        date: new Date(dto.date),
        linkedInvoiceId,
        status,
        source: (dto.source ?? PaymentSource.MANUAL) as PaymentSource,
      },
    });

    if (linkedInvoiceId) {
      await this.recomputeInvoiceStatus(linkedInvoiceId);
    }

    return payment;
  }

  async import(items: CreatePaymentDto[]) {
    const results = [] as Array<{ ok: boolean; id?: string; reason?: string }>;
    for (const row of items) {
      try {
        const p = await this.create(row);
        results.push({ ok: true, id: p.id });
      } catch (e: any) {
        results.push({ ok: false, reason: e?.message ?? 'error' });
      }
    }
    return { imported: results.length, results };
  }

  private async recomputeInvoiceStatus(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { accrual: true, payments: true },
    });
    if (!invoice) return;
    const paid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
    const total = Number(invoice.accrual.total);
    let status: InvoiceStatus = 'DRAFT';
    if (paid <= 0) status = 'DRAFT';
    else if (paid > 0 && paid < total) status = 'PARTIALLY_PAID';
    else if (paid >= total) status = 'PAID';
    await this.prisma.invoice.update({ where: { id: invoice.id }, data: { status } });
  }
}
