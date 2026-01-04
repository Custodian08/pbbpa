import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePremiseDto } from './dto/create-premise.dto';

@Injectable()
export class PremisesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePremiseDto) {
    return this.prisma.premise.create({ data: {
      code: dto.code,
      type: dto.type,
      address: dto.address,
      floor: dto.floor ?? null,
      area: dto.area,
      rateType: dto.rateType,
      baseRate: dto.baseRate ?? null,
      status: dto.status ?? 'FREE',
      availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : null,
    }});
  }

  async findAll() {
    return this.prisma.premise.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findAvailable() {
    const now = new Date();
    return this.prisma.premise.findMany({
      where: {
        status: 'FREE',
        OR: [
          { availableFrom: null },
          { availableFrom: { lte: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.premise.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Premise not found');
    return item;
  }

  async update(id: string, data: Partial<CreatePremiseDto>) {
    await this.findOne(id);
    return this.prisma.premise.update({
      where: { id },
      data: {
        code: data.code,
        type: data.type,
        address: data.address,
        floor: data.floor ?? undefined,
        area: data.area ?? undefined,
        rateType: data.rateType,
        baseRate: data.baseRate ?? undefined,
        status: data.status,
        availableFrom: data.availableFrom ? new Date(data.availableFrom) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const leases = await this.prisma.lease.count({ where: { premiseId: id } });
    if (leases > 0) {
      throw new ConflictException('Нельзя удалить помещение: существуют связанные договоры');
    }
    await this.prisma.$transaction([
      this.prisma.reservation.deleteMany({ where: { premiseId: id } }),
      this.prisma.showing.deleteMany({ where: { premiseId: id } }),
      this.prisma.premise.delete({ where: { id } }),
    ]);
    return { ok: true };
  }

  async import(dtos: CreatePremiseDto[]) {
    const results: Array<{ ok: boolean; id?: string; reason?: string }> = [];
    for (const row of dtos) {
      try {
        const created = await this.create(row);
        results.push({ ok: true, id: created.id });
      } catch (e: any) {
        results.push({ ok: false, reason: e?.message ?? 'error' });
      }
    }
    return { imported: results.filter(r=> r.ok).length, total: dtos.length, results };
  }
}
