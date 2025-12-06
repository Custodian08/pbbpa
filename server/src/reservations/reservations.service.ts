import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationStatus } from '@prisma/client';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReservationDto) {
    const premise = await this.prisma.premise.findUnique({ where: { id: dto.premiseId } });
    if (!premise) throw new NotFoundException('Premise not found');
    const now = new Date();
    const until = new Date(dto.until);
    if (until <= now) throw new ConflictException('Reservation until must be in the future');

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
        data: { premiseId: dto.premiseId, until, status: ReservationStatus.ACTIVE },
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
    return this.prisma.reservation.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reservation not found');
    return r;
  }

  async cancel(id: string) {
    const r = await this.findOne(id);
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
