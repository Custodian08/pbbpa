import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async occupancy() {
    const [total, rented] = await Promise.all([
      this.prisma.premise.count(),
      this.prisma.premise.count({ where: { status: 'RENTED' } }),
    ]);
    const reserved = await this.prisma.premise.count({ where: { status: 'RESERVED' } });
    return { total, rented, reserved, free: Math.max(total - rented - reserved, 0), occupancy: total ? +(rented / total).toFixed(3) : 0 };
  }

  async monthly(months = 12) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const accruals = await this.prisma.accrual.findMany({ where: { period: { gte: from, lte: now } } });
    const payments = await this.prisma.payment.findMany({ where: { date: { gte: from, lte: now } } });
    const map: Record<string, { accruals: number; payments: number }> = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
      map[ymKey(d)] = { accruals: 0, payments: 0 };
    }
    accruals.forEach(a => {
      const k = ymKey(a.period);
      if (!map[k]) map[k] = { accruals: 0, payments: 0 };
      map[k].accruals += Number(a.total);
    });
    payments.forEach(p => {
      const k = ymKey(p.date);
      if (!map[k]) map[k] = { accruals: 0, payments: 0 };
      map[k].payments += Number(p.amount);
    });
    return Object.entries(map).map(([period, v]) => ({ period, ...v }));
  }

  async aging() {
    const invoices = await this.prisma.invoice.findMany({ include: { accrual: true, payments: true } });
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } as Record<string, number>;
    const today = new Date();
    for (const inv of invoices) {
      const total = Number(inv.accrual.total);
      const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      const out = +(total - paid).toFixed(2);
      if (out <= 0) continue;
      const days = Math.floor((today.getTime() - inv.date.getTime()) / (1000 * 3600 * 24));
      if (days <= 30) buckets['0-30'] += out;
      else if (days <= 60) buckets['31-60'] += out;
      else if (days <= 90) buckets['61-90'] += out;
      else buckets['90+'] += out;
    }
    return buckets;
  }

  async kpi() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const [occ, accruals, payments, aging] = await Promise.all([
      this.occupancy(),
      this.prisma.accrual.aggregate({ _sum: { total: true }, where: { period: { gte: start, lte: end } } }),
      this.prisma.payment.aggregate({ _sum: { amount: true as any }, where: { date: { gte: start, lte: end } } }),
      this.aging(),
    ]);
    const accrualMonth = Number(accruals._sum.total || 0);
    const paymentsMonth = Number((payments as any)._sum.amount || 0);
    const agingTotal = Object.values(aging).reduce((s, v) => s + v, 0);
    return { occupancy: occ, accrualMonth, paymentsMonth, aging, agingTotal };
  }
}
