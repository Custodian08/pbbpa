import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgingQueryDto } from './dto/aging.dto';

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

@Injectable()
export class ArrearsService {
  constructor(private readonly prisma: PrismaService) {}

  async aging(query: AgingQueryDto) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    const invoices = await this.prisma.invoice.findMany({
      include: { accrual: { include: { lease: true } }, payments: true },
    });

    const buckets = {
      current: 0,
      d0_30: 0,
      d31_60: 0,
      d61_90: 0,
      d90p: 0,
    } as Record<string, number>;

    for (const inv of invoices) {
      const total = Number(inv.accrual.total);
      const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      const outstanding = +(total - paid).toFixed(2);
      if (outstanding <= 0) continue;

      const period = inv.accrual.period; // first day of month
      const y = period.getFullYear();
      const m = period.getMonth();
      const dueDay = inv.accrual.lease.dueDay;
      const dueDate = new Date(y, m, dueDay);

      const days = Math.floor((startOfDay(asOf).getTime() - endOfDay(dueDate).getTime()) / (1000*60*60*24));
      if (days <= 0) { buckets.current += outstanding; continue; }
      if (days <= 30) buckets.d0_30 += outstanding;
      else if (days <= 60) buckets.d31_60 += outstanding;
      else if (days <= 90) buckets.d61_90 += outstanding;
      else buckets.d90p += outstanding;
    }

    const total = buckets.current + buckets.d0_30 + buckets.d31_60 + buckets.d61_90 + buckets.d90p;
    return { asOf: asOf.toISOString().slice(0,10), buckets, total };
  }

  async runPenalties(query: AgingQueryDto) {
    const asOf = startOfDay(query.asOf ? new Date(query.asOf) : new Date());

    const invoices = await this.prisma.invoice.findMany({
      include: { accrual: { include: { lease: true } }, payments: true },
    });
    const created: Array<{ invoiceId: string; amount: number }> = [];

    for (const inv of invoices) {
      const lease = inv.accrual.lease;
      const total = Number(inv.accrual.total);
      const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      const outstanding = +(total - paid).toFixed(2);
      if (outstanding <= 0) continue;

      const period = inv.accrual.period;
      const y = period.getFullYear();
      const m = period.getMonth();
      const dueDay = lease.dueDay;
      const dueDate = new Date(y, m, dueDay);
      if (asOf <= dueDate) continue; // not overdue yet

      const from = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate() + 1);
      const days = Math.max(0, Math.floor((asOf.getTime() - startOfDay(from).getTime()) / (1000*60*60*24)) + 1);
      const rate = Number(lease.penaltyRatePerDay) / 100; // 0.1% -> 0.001
      const amount = +(outstanding * rate * days).toFixed(2);
      if (amount <= 0) continue;

      // idempotency: delete the same window if exists, then insert
      await this.prisma.penalty.deleteMany({ where: { leaseId: lease.id, periodFrom: from, periodTo: asOf } });
      await this.prisma.penalty.create({
        data: {
          leaseId: lease.id,
          periodFrom: from,
          periodTo: asOf,
          base: outstanding as any,
          ratePerDay: lease.penaltyRatePerDay as any,
          amount: amount as any,
        },
      });
      created.push({ invoiceId: inv.id, amount });
    }

    return { asOf: asOf.toISOString(), created: created.length, items: created };
  }
}
