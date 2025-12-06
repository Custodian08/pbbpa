import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const exists = await this.prisma.tenant.findUnique({ where: { unp: dto.unp } });
    if (exists) throw new ConflictException('Tenant with this UNP already exists');
    return this.prisma.tenant.create({ data: {
      type: dto.type,
      name: dto.name,
      unp: dto.unp,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      bankAccount: dto.bankAccount ?? null,
      address: dto.address ?? null,
    }});
  }

  async findAll() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const item = await this.prisma.tenant.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Tenant not found');
    return item;
  }

  async update(id: string, data: Partial<CreateTenantDto>) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: {
        type: data.type,
        name: data.name,
        unp: data.unp,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        bankAccount: data.bankAccount ?? undefined,
        address: data.address ?? undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.tenant.delete({ where: { id } });
    return { ok: true };
  }

  async import(items: CreateTenantDto[]) {
    const results = [] as Array<{ ok: boolean; id?: string; reason?: string }>;
    for (const row of items) {
      try {
        const t = await this.create(row as any);
        results.push({ ok: true, id: t.id });
      } catch (e: any) {
        results.push({ ok: false, reason: e?.message ?? 'error' });
      }
    }
    return { imported: results.filter(r=> r.ok).length, total: results.length, results };
  }
}
