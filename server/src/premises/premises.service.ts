import { Injectable, NotFoundException } from '@nestjs/common';
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
    await this.prisma.premise.delete({ where: { id } });
    return { ok: true };
  }
}
