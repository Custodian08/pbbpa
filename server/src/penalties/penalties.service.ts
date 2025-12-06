import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }

@Injectable()
export class PenaltiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.penalty.findMany({ orderBy: { periodFrom: 'desc' } });
  }

  async preview() {
    const today = startOfDay(new Date());
    const invoices = await this.prisma.invoice.findMany({ include: { accrual: { include: { lease: true } }, payments: true } });
    const out: Array<{ leaseId: string; invoiceId: string; dueDate: Date; days: number; base: number; ratePerDay: number; amount: number }> = [];
    for (const inv of invoices) {
      const lease = inv.accrual.lease;
      const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      const total = Number(inv.accrual.total);
      const base = +(total - paid).toFixed(2);
      if (base <= 0) continue;
      const due = new Date(inv.date);
      const dueDate = new Date(due.getFullYear(), due.getMonth(), lease.dueDay);
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000*3600*24));
      if (diffDays <= 0) continue;
      const ratePerDay = Number(lease.penaltyRatePerDay);
      const amount = +(base * (ratePerDay / 100) * diffDays).toFixed(2);
      out.push({ leaseId: lease.id, invoiceId: inv.id, dueDate, days: diffDays, base, ratePerDay, amount });
    }
    return out;
  }

  async run() {
    const items = await this.preview();
    const today = endOfDay(new Date());
    for (const it of items) {
      // простая защита от дублей по дате окончания
      const exists = await this.prisma.penalty.findFirst({ where: { leaseId: it.leaseId, periodTo: { gte: startOfDay(today), lte: endOfDay(today) } } });
      if (exists) continue;
      await this.prisma.penalty.create({ data: {
        leaseId: it.leaseId,
        periodFrom: new Date(it.dueDate.getTime() + 24*3600*1000),
        periodTo: today,
        base: it.base as any,
        ratePerDay: it.ratePerDay as any,
        amount: it.amount as any,
      }});
    }
    return { created: items.length };
  }
}
