import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { InvoiceStatus, LeaseStatus, RateType } from '@prisma/client';

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService, private readonly payments: PaymentsService) {}

  private async getUserTenant(userId: string) {
    const u: any = await this.prisma.user.findUnique({ where: { id: userId } });
    const tenantId = u?.tenantId as string | undefined;
    if (!tenantId) throw new ConflictException('User is not linked to a tenant');
    return tenantId;
  }

  private async getVatFor(date: Date): Promise<number> {
    const s = await this.prisma.vatSetting.findFirst({ where: { validFrom: { lte: date } }, orderBy: { validFrom: 'desc' } });
    return s ? Number(s.rate) : 20;
  }

  async rent(userId: string, body: { premiseId: string; periodFrom?: string; periodTo?: string }) {
    const tenantId = await this.getUserTenant(userId);
    const premise = await this.prisma.premise.findUnique({ where: { id: body.premiseId } });
    if (!premise) throw new NotFoundException('Premise not found');
    if (premise.status !== 'FREE') throw new ConflictException('Premise is not free');

    const periodFrom = body.periodFrom ? new Date(body.periodFrom) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodTo = body.periodTo ? new Date(body.periodTo) : null;

    const vatRate = await this.getVatFor(periodFrom);

    const lease = await this.prisma.$transaction(async (tx) => {
      // Assign number/date
      const now = new Date();
      const year = now.getFullYear();
      const cnt = await tx.lease.count({ where: { date: { gte: new Date(year,0,1), lte: new Date(year,11,31,23,59,59,999) } } });
      const number = `LEASE-${year}-${String(cnt + 1).padStart(4, '0')}`;

      const l = await tx.lease.create({
        data: {
          number,
          date: now,
          premiseId: premise.id,
          tenantId,
          periodFrom,
          periodTo,
          base: premise.rateType as RateType,
          currency: 'BYN',
          vatRate: vatRate as any,
          dueDay: 15,
          penaltyRatePerDay: 0.1 as any,
          status: LeaseStatus.ACTIVE,
        },
      });
      await tx.premise.update({ where: { id: premise.id }, data: { status: 'RENTED' } });
      return l;
    });

    // Create accrual & invoice for periodFrom month
    const area = Number(premise.area);
    const baseRate = premise.baseRate ? Number(premise.baseRate) : 0;
    const baseAmount = lease.base === 'M2' ? area * baseRate : baseRate;
    const vatAmount = +(baseAmount * (vatRate / 100)).toFixed(2);
    const total = +(baseAmount + vatAmount).toFixed(2);

    const accrual = await this.prisma.accrual.create({ data: { leaseId: lease.id, period: periodFrom, baseAmount, vatAmount, total } });

    const monthTag = `${periodFrom.getFullYear()}${String(periodFrom.getMonth()+1).padStart(2,'0')}`;
    const countThisMonth = await this.prisma.invoice.count({ where: { date: { gte: new Date(periodFrom.getFullYear(), periodFrom.getMonth(),1), lte: new Date(periodFrom.getFullYear(), periodFrom.getMonth()+1,0,23,59,59,999) } } });
    const invNumber = `INV-${monthTag}-${String(countThisMonth + 1).padStart(4,'0')}`;
    const invoice = await this.prisma.invoice.create({ data: { accrualId: accrual.id, number: invNumber, date: new Date(), status: InvoiceStatus.DRAFT } });

    return { lease, invoice };
  }

  async pay(userId: string, body: { invoiceId: string; amount?: number }) {
    const tenantId = await this.getUserTenant(userId);
    const inv = await this.prisma.invoice.findUnique({ where: { id: body.invoiceId }, include: { accrual: { include: { lease: true } } } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.accrual.lease.tenantId !== tenantId) throw new ConflictException('Foreign invoice');
    const amount = body.amount ?? Number(inv.accrual.total);

    // Use PaymentsService create to auto-apply by invoiceNumber
    await this.payments.create({ tenantId, amount: amount as any, date: new Date().toISOString().slice(0,10), invoiceNumber: inv.number, source: 'MANUAL' as any });
    return { ok: true };
  }
}
