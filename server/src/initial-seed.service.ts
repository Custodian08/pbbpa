import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InitialSeedService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureRoles();
    const adminEmail = 'admin@example.com';
    const passwordHash = await bcrypt.hash('admin123', 10);
    const adminRole = await this.prisma.role.findUnique({ where: { name: 'ADMIN' } });

    // Ensure user exists and password is set
    const user = await this.prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash, fullName: 'Admin' },
      create: {
        email: adminEmail,
        passwordHash,
        fullName: 'Admin',
        roles: adminRole ? { create: [{ roleId: adminRole.id }] } : undefined,
      },
    });

    // Ensure ADMIN role is assigned
    if (adminRole) {
      const hasAdmin = await this.prisma.userRole.findUnique({
        where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
      });
      if (!hasAdmin) {
        await this.prisma.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });
      }
    }
  }

  private async ensureRoles() {
    await this.prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN' } });
    await this.prisma.role.upsert({ where: { name: 'OPERATOR' }, update: {}, create: { name: 'OPERATOR' } });
    await this.prisma.role.upsert({ where: { name: 'ANALYST' }, update: {}, create: { name: 'ANALYST' } });
    await this.prisma.role.upsert({ where: { name: 'ACCOUNTANT' }, update: {}, create: { name: 'ACCOUNTANT' } });
  }
}
