import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationStatus } from '@prisma/client';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReservationDto, createdByUserId?: string) {
    const premise = await this.prisma.premise.findUnique({ where: { id: dto.premiseId } });
    if (!premise) throw new NotFoundException('Premise not found');
    const now = new Date();
    const untilDate = new Date(dto.until);
    const until = new Date(untilDate);
    // Считаем бронь действующей до конца выбранного дня
    until.setHours(23, 59, 59, 999);
    if (until.getTime() <= now.getTime()) throw new ConflictException('Reservation until must be in the future');

    // Check overlapping ACTIVE reservations
    const activeRes = await this.prisma.reservation.findFirst({
      where: { premiseId: dto.premiseId, status: 'ACTIVE', until: { gt: now } },
    });
    if (activeRes) throw new ConflictException('Premise already reserved');

    // Check conflicts with active/terminating lease period
    const conflictLease = await this.prisma.lease.findFirst({
      where: {
        premiseId: dto.premiseId,
        status: { in: ['ACTIVE', 'TERMINATING'] },
        OR: [
          { periodTo: null },
          { periodTo: { gte: now } },
        ],
      },
      select: { id: true },
    });
    if (conflictLease) throw new ConflictException('Premise is occupied by an active lease');

    const reservation = await this.prisma.$transaction(async (tx) => {
      const r = await tx.reservation.create({
        data: ({ premiseId: dto.premiseId, until, status: ReservationStatus.ACTIVE, createdByUserId: createdByUserId ?? null } as any),
      });
      await tx.premise.update({ where: { id: dto.premiseId }, data: { status: 'RESERVED' } });
      return r;
    });
    return reservation;
  }

  async findAll() {
    const now = new Date();
    // Optionally auto-expire outdated reservations (soft logic)
    await this.prisma.reservation.updateMany({ where: { status: 'ACTIVE', until: { lte: now } }, data: { status: 'EXPIRED' } });
    return this.prisma.reservation.findMany({ orderBy: { createdAt: 'desc' }, include: { premise: true } });
  }

  async findOne(id: string) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reservation not found');
    return r;
  }

  async activeByPremise(premiseId: string) {
    const now = new Date();
    return this.prisma.reservation.findFirst({
      where: { premiseId, status: 'ACTIVE', until: { gt: now } },
      include: { premise: true, createdBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(id: string, userId?: string, isBasicUser?: boolean) {
    const r = await this.findOne(id);
    if (isBasicUser) {
      const rc: any = r as any;
      if (!userId || rc.createdByUserId !== userId) {
        throw new ConflictException('Not allowed to cancel this reservation');
      }
    }
    if (r.status !== 'ACTIVE') return r;
    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.reservation.update({ where: { id }, data: { status: 'CANCELLED' } });
      // If no other active reservations and no active lease, free the premise
      const now = new Date();
      const otherActive = await tx.reservation.findFirst({ where: { premiseId: res.premiseId, status: 'ACTIVE', until: { gt: now } } });
      if (!otherActive) {
        const activeLease = await tx.lease.findFirst({ where: { premiseId: res.premiseId, status: { in: ['ACTIVE', 'TERMINATING'] } } });
        if (!activeLease) {
          await tx.premise.update({ where: { id: res.premiseId }, data: { status: 'FREE' } });
        }
      }
      return res;
    });
    return updated;
  }

  async expireNow() {
    const now = new Date();
    // Mark expired
    await this.prisma.reservation.updateMany({ where: { status: 'ACTIVE', until: { lte: now } }, data: { status: 'EXPIRED' } });
    // Free premises without active reservations and leases
    const expired = await this.prisma.reservation.findMany({ where: { status: 'EXPIRED', until: { lte: now } } });
    const byPremise = Array.from(new Set(expired.map(e => e.premiseId)));
    for (const premiseId of byPremise) {
      const hasActiveRes = await this.prisma.reservation.findFirst({ where: { premiseId, status: 'ACTIVE', until: { gt: now } } });
      if (hasActiveRes) continue;
      const hasActiveLease = await this.prisma.lease.findFirst({ where: { premiseId, status: { in: ['ACTIVE', 'TERMINATING'] } } });
      if (!hasActiveLease) {
        await this.prisma.premise.update({ where: { id: premiseId }, data: { status: 'FREE' } });
      }
    }
    return { ok: true };
  }
}
