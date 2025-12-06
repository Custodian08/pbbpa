import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async assignRole(dto: AssignRoleDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');
    const role = await this.prisma.role.upsert({
      where: { name: dto.roleName },
      update: {},
      create: { name: dto.roleName },
    });
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
    return { ok: true, userId: user.id, role: role.name };
  }

  async audit(limit = 50) {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: Number(limit) });
  }

  async bootstrap(userId: string) {
    // If there is already an ADMIN user, do nothing (secure bootstrapping)
    const adminRole = await this.prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (adminRole) {
      const existingAdmin = await this.prisma.userRole.findFirst({ where: { roleId: adminRole.id } });
      if (existingAdmin) return { ok: false, reason: 'ADMIN already exists' };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const role = await this.prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN' } });
    await this.prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    return { ok: true, userId: user.id, role: 'ADMIN' };
  }
}
