import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RunBillingDto } from './dto/run-billing.dto';
import { InvoiceStatus, RateType } from '@prisma/client';

function parsePeriod(period: string) {
  const [y, m] = period.split('-').map((v) => parseInt(v, 10));
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end, y, m };
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  private async getVatRateForDate(date: Date): Promise<number> {
    const s = await this.prisma.vatSetting.findFirst({
      where: { validFrom: { lte: date } },
      orderBy: { validFrom: 'desc' },
    });
    return s ? (Number(s.rate)) : 20;
  }

  async run(dto: RunBillingDto) {
    const { start, end, y, m } = parsePeriod(dto.period);

    const activeLeases = await this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        periodFrom: { lte: end },
        OR: [
          { periodTo: null },
          { periodTo: { gte: start } },
        ],
      },
      include: { premise: true, indexations: true },
    });

    const results: Array<{ leaseId: string; accrualId?: string; invoiceId?: string; reason?: string }> = [];

    for (const lease of activeLeases) {
      // Ensure accrual not exists for this month
      const existing = await this.prisma.accrual.findUnique({ where: { leaseId_period: { leaseId: lease.id, period: start } } }).catch(() => null);
      if (existing) {
        results.push({ leaseId: lease.id, accrualId: existing.id, reason: 'already exists' });
        continue;
      }

      const area = Number(lease.premise.area);
      const baseRateRaw = lease.premise.baseRate ? Number(lease.premise.baseRate) : 0;
      // Apply latest indexation with effectiveFrom <= period start
      const applicable = (lease.indexations || [])
        .filter((ix) => new Date(ix.effectiveFrom) <= start)
        .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0];
      const factor = applicable ? Number(applicable.factor) : 1;
      const baseRate = +(baseRateRaw * factor).toFixed(4);

      if (!baseRate || (lease.base === 'M2' && !area)) {
        results.push({ leaseId: lease.id, reason: 'missing base rate or area' });
        continue;
      }

      const baseAmount = lease.base === ('M2' as RateType) ? area * baseRate : baseRate;
      const vatRate = lease.vatRate != null ? Number(lease.vatRate) : await this.getVatRateForDate(start);
      const vatAmount = +(baseAmount * (vatRate / 100)).toFixed(2);
      const total = +(baseAmount + vatAmount).toFixed(2);

      const accrual = await this.prisma.accrual.create({
        data: {
          leaseId: lease.id,
          period: start,
          baseAmount,
          vatAmount,
          total,
        },
      });

      // Create invoice DRAFT
      const monthTag = `${y}${String(m).padStart(2, '0')}`;
      const countThisMonth = await this.prisma.invoice.count({ where: { date: { gte: start, lte: end } } });
      const number = `INV-${monthTag}-${String(countThisMonth + 1).padStart(4, '0')}`;
      const invoice = await this.prisma.invoice.create({
        data: {
          accrualId: accrual.id,
          number,
          date: new Date(),
          status: InvoiceStatus.DRAFT,
        },
      });

      results.push({ leaseId: lease.id, accrualId: accrual.id, invoiceId: invoice.id });
    }

    return { period: dto.period, processed: activeLeases.length, results };
  }

  async listInvoices(period?: string, status?: string, search?: string, page = 1, pageSize = 20) {
    const where: any = {};
    if (period) {
      const { start, end } = parsePeriod(period);
      where.date = { gte: start, lte: end };
    }
    if (status) where.status = status as InvoiceStatus;
    if (search) where.number = { contains: search, mode: 'insensitive' };

    const skip = (page - 1) * pageSize;
    const [total, items] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({ where, orderBy: { date: 'desc' }, skip, take: pageSize }),
    ]);
    return { items, total, page, pageSize };
  }

  async listAccruals(period?: string) {
    if (period) {
      const { start, end } = parsePeriod(period);
      return this.prisma.accrual.findMany({ where: { period: { gte: start, lte: end } }, orderBy: { period: 'desc' } });
    }
    return this.prisma.accrual.findMany({ orderBy: { period: 'desc' } });
  }
}
