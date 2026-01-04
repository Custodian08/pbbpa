import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RunBillingDto } from './dto/run-billing.dto';
import { InvoiceStatus, RateType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

function parsePeriod(period: string) {
  const [y, m] = period.split('-').map((v) => parseInt(v, 10));
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end, y, m };
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService, private readonly notif: NotificationsService) {}

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
      include: { premise: true, indexations: true, tenant: true },
    });

    const results: Array<{
      leaseId: string;
      leaseNumber?: string | null;
      tenantName?: string;
      premiseAddress?: string;
      accrualId?: string;
      invoiceId?: string;
      invoiceNumber?: string;
      reason?: string;
      messageRu?: string;
      total?: number;
    }> = [];

    for (const lease of activeLeases) {
      try {
        // Ensure accrual not exists for this month
        const existing = await this.prisma.accrual.findUnique({ where: { leaseId_period: { leaseId: lease.id, period: start } } }).catch(() => null);
        if (existing) {
          results.push({
            leaseId: lease.id,
            leaseNumber: lease.number,
            tenantName: lease.tenant?.name,
            premiseAddress: lease.premise?.address,
            accrualId: existing.id,
            reason: 'already exists',
            messageRu: 'Начисление за этот месяц уже существует',
          });
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

        if (!baseRate || (lease.base === 'M2' as RateType) && !area) {
          const missingMsg = !baseRate
            ? 'Не заполнена базовая ставка помещения'
            : 'Не заполнена площадь помещения для тарифа м²';
          results.push({
            leaseId: lease.id,
            leaseNumber: lease.number,
            tenantName: lease.tenant?.name,
            premiseAddress: lease.premise?.address,
            reason: 'missing base rate or area',
            messageRu: `Пропуск: ${missingMsg}`,
          });
          continue;
        }

        const baseAmountRaw = lease.base === ('M2' as RateType) ? area * baseRate : baseRate;
        const baseAmount = +baseAmountRaw.toFixed(2);
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

        // Try to notify tenant via email if configured
        const to = lease.tenant?.email;
        if (to) {
          void this.notif.invoiceCreated(to, { number: invoice.number, total, date: invoice.date });
        }

        results.push({
          leaseId: lease.id,
          leaseNumber: lease.number,
          tenantName: lease.tenant?.name,
          premiseAddress: lease.premise?.address,
          accrualId: accrual.id,
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          total,
          messageRu: 'Счет создан',
        });
      } catch (e: any) {
        const msg = e?.code === 'P2002'
          ? 'Нарушение уникальности (начисление/счет уже существует)'
          : (e?.message || 'Неизвестная ошибка');
        results.push({
          leaseId: lease.id,
          leaseNumber: lease.number,
          tenantName: lease.tenant?.name,
          premiseAddress: lease.premise?.address,
          reason: e?.code || 'error',
          messageRu: `Ошибка: ${msg}`,
        });
        continue;
      }
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
