import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { LeaseStatus, PremiseStatus, RateType } from '@prisma/client';

function periodsOverlap(aFrom: Date, aTo: Date | null, bFrom: Date, bTo: Date | null) {
  const aEnd = aTo ?? new Date('9999-12-31');
  const bEnd = bTo ?? new Date('9999-12-31');
  return aFrom <= bEnd && bFrom <= aEnd;
}

@Injectable()
export class LeasesService {
  constructor(private readonly prisma: PrismaService, private readonly notif: NotificationsService) {}

  async assertPremiseAndTenant(premiseId: string, tenantId: string) {
    const [premise, tenant] = await Promise.all([
      this.prisma.premise.findUnique({ where: { id: premiseId } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
    ]);
    if (!premise) throw new NotFoundException('Premise not found');
    if (!tenant) throw new NotFoundException('Tenant not found');
    return { premise, tenant };
  }

  async ensureNoOverlap(premiseId: string, periodFrom: Date, periodTo: Date | null, excludeLeaseId?: string) {
    const candidates = await this.prisma.lease.findMany({
      where: {
        premiseId,
        status: { in: [LeaseStatus.ACTIVE, LeaseStatus.TERMINATING] },
        ...(excludeLeaseId ? { id: { not: excludeLeaseId } } : {}),
      },
      select: { id: true, periodFrom: true, periodTo: true },
    });
    const conflict = candidates.find((c) => periodsOverlap(periodFrom, periodTo, c.periodFrom, c.periodTo));
    if (conflict) throw new ConflictException('Period overlaps with existing active/terminating lease');
  }

  async create(dto: CreateLeaseDto) {
    await this.assertPremiseAndTenant(dto.premiseId, dto.tenantId);
    const from = new Date(dto.periodFrom);
    const to = dto.periodTo ? new Date(dto.periodTo) : null;
    if (to && to < from) throw new ConflictException('periodTo cannot be earlier than periodFrom');
    await this.ensureNoOverlap(dto.premiseId, from, to);
    // If reservationId provided, verify it belongs to the same premise and capture reserver user
    let createdByUserId: string | undefined;
    if (dto.reservationId) {
      const resv = await this.prisma.reservation.findUnique({ where: { id: dto.reservationId }, include: { premise: true, createdBy: true } });
      if (!resv) throw new NotFoundException('Reservation not found');
      if (resv.premiseId !== dto.premiseId) throw new ConflictException('Reservation does not match selected premise');
      createdByUserId = resv.createdByUserId || undefined;
    }

    return this.prisma.lease.create({
      data: {
        premise: { connect: { id: dto.premiseId } },
        tenant: { connect: { id: dto.tenantId } },
        periodFrom: from,
        periodTo: to,
        base: dto.base,
        currency: dto.currency ?? 'BYN',
        vatRate: (dto.vatRate ?? 20) as unknown as any,
        deposit: dto.deposit ?? null,
        dueDay: dto.dueDay,
        penaltyRatePerDay: (dto.penaltyRatePerDay ?? 0.1) as unknown as any,
        status: LeaseStatus.DRAFT,
        ...(dto.reservationId ? { reservation: { connect: { id: dto.reservationId } } } : {}),
        ...(createdByUserId ? { createdBy: { connect: { id: createdByUserId } } } : {}),
      },
    });
  }

  async findAll() {
    return this.prisma.lease.findMany({ orderBy: { createdAt: 'desc' }, include: { premise: true, tenant: true } });
  }

  async findOne(id: string) {
    const lease = await this.prisma.lease.findUnique({ where: { id }, include: { premise: true, tenant: true } });
    if (!lease) throw new NotFoundException('Lease not found');
    return lease;
  }

  async update(id: string, data: Partial<CreateLeaseDto>) {
    const lease = await this.findOne(id);
    // Basic rule: allow edits when DRAFT or TERMINATING
    if (lease.status !== 'DRAFT' && lease.status !== 'TERMINATING') {
      throw new ConflictException('Only DRAFT or TERMINATING leases can be updated');
    }
    const periodFrom = data.periodFrom ? new Date(data.periodFrom) : lease.periodFrom;
    const periodTo = data.periodTo === undefined ? lease.periodTo : data.periodTo ? new Date(data.periodTo) : null;
    if (periodTo && periodTo < periodFrom) throw new ConflictException('periodTo cannot be earlier than periodFrom');
    const premiseId = data.premiseId ?? lease.premiseId;
    await this.ensureNoOverlap(premiseId, periodFrom, periodTo, lease.id);

    return this.prisma.lease.update({
      where: { id },
      data: {
        premiseId,
        tenantId: data.tenantId ?? lease.tenantId,
        periodFrom,
        periodTo,
        base: (data.base as RateType) ?? lease.base,
        currency: data.currency ?? undefined,
        vatRate: (data.vatRate as any) ?? undefined,
        deposit: data.deposit ?? undefined,
        dueDay: data.dueDay ?? undefined,
        penaltyRatePerDay: (data.penaltyRatePerDay as any) ?? undefined,
      },
      include: { premise: true, tenant: true },
    });
  }

  async activate(id: string) {
    const lease = await this.findOne(id);
    if (lease.status !== 'DRAFT') throw new ConflictException('Only DRAFT lease can be activated');
    await this.ensureNoOverlap(lease.premiseId, lease.periodFrom, lease.periodTo, lease.id);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Assign number/date if missing
      let number = lease.number || null;
      let date = lease.date || null;
      if (!number || !date) {
        const now = new Date();
        const year = now.getFullYear();
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59, 999);
        const cnt = await tx.lease.count({ where: { date: { gte: start, lte: end } } });
        number = `LEASE-${year}-${String(cnt + 1).padStart(4, '0')}`;
        date = now;
      }
      const l = await tx.lease.update({ where: { id }, data: { status: LeaseStatus.ACTIVE, number, date } });
      await tx.premise.update({ where: { id: l.premiseId }, data: { status: PremiseStatus.RENTED } });
      return l;
    });
    return updated;
  }

  async terminate(id: string) {
    const lease = await this.findOne(id);
    if (lease.status !== 'ACTIVE' && lease.status !== 'TERMINATING') {
      throw new ConflictException('Only ACTIVE lease can be set to TERMINATING');
    }
    return this.prisma.lease.update({ where: { id }, data: { status: LeaseStatus.TERMINATING } });
  }

  async close(id: string) {
    const lease = await this.findOne(id);
    if (lease.status !== 'ACTIVE' && lease.status !== 'TERMINATING') {
      throw new ConflictException('Only ACTIVE or TERMINATING lease can be closed');
    }
    const closed = await this.prisma.$transaction(async (tx) => {
      const l = await tx.lease.update({ where: { id }, data: { status: LeaseStatus.CLOSED } });
      await tx.premise.update({ where: { id: l.premiseId }, data: { status: PremiseStatus.FREE, availableFrom: new Date() } });
      return l;
    });
    return closed;
  }

  async remove(id: string) {
    const lease = await this.findOne(id);
    if (lease.status !== 'DRAFT') {
      throw new ConflictException('Only DRAFT lease can be deleted');
    }
    await this.prisma.lease.delete({ where: { id } });
    return { ok: true };
  }

  async accruals(leaseId: string) {
    await this.findOne(leaseId);
    return this.prisma.accrual.findMany({ where: { leaseId }, orderBy: { period: 'desc' } });
  }

  async invoices(leaseId: string) {
    await this.findOne(leaseId);
    return this.prisma.invoice.findMany({ where: { accrual: { leaseId } }, include: { accrual: true }, orderBy: { date: 'desc' } });
  }

  async payments(leaseId: string) {
    const lease = await this.findOne(leaseId);
    return this.prisma.payment.findMany({ where: { tenantId: lease.tenantId }, orderBy: { date: 'desc' } });
  }

  async indexations(leaseId: string) {
    await this.findOne(leaseId);
    return this.prisma.indexation.findMany({ where: { leaseId }, orderBy: { effectiveFrom: 'desc' } });
  }

  async addIndexation(leaseId: string, dto: { factor: number; effectiveFrom: string }) {
    await this.findOne(leaseId);
    const date = new Date(dto.effectiveFrom);
    if (Number.isNaN(date.getTime())) throw new ConflictException('Invalid effectiveFrom');
    const dup = await this.prisma.indexation.findFirst({ where: { leaseId, effectiveFrom: date } });
    if (dup) throw new ConflictException('Indexation for this date already exists');
    const ix = await this.prisma.indexation.create({ data: { leaseId, factor: dto.factor as any, effectiveFrom: date } });
    // notify tenant
    const lease = await this.prisma.lease.findUnique({ where: { id: leaseId }, include: { tenant: true } });
    const to = lease?.tenant?.email;
    if (to) void this.notif.indexationApplied(to, { leaseNumber: lease?.number || undefined, factor: dto.factor, from: date });
    return ix;
  }

  async removeIndexation(leaseId: string, ixId: string) {
    const ix = await this.prisma.indexation.findUnique({ where: { id: ixId } });
    if (!ix || ix.leaseId !== leaseId) throw new NotFoundException('Indexation not found');
    await this.prisma.indexation.delete({ where: { id: ixId } });
    return { ok: true };
  }

  // --- Signed file helpers ---
  async markSigned(id: string, opts: { by?: string; fileName: string }) {
    await this.findOne(id);
    const updated = await this.prisma.lease.update({
      where: { id },
      data: ({ signedAt: new Date(), signedBy: opts.by ?? null, signedFileName: opts.fileName } as any),
    });
    // notify tenant
    const lease: any = await this.prisma.lease.findUnique({ where: { id }, include: { tenant: true } });
    const to = lease?.tenant?.email as string | undefined;
    if (to) void this.notif.signedUploaded(to, { leaseNumber: (lease?.number as string) || undefined });
    return updated;
  }

  async clearSigned(id: string) {
    const lease: any = await this.findOne(id);
    if (lease.signedFileName) {
      const p = path.join(process.cwd(), 'uploads', 'leases', id, lease.signedFileName as string);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch {}
      }
    }
    await this.prisma.lease.update({ where: { id }, data: ({ signedAt: null, signedBy: null, signedFileName: null } as any) });
    return { ok: true };
  }
}
