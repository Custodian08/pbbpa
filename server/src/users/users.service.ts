import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: { roles: { include: { role: true } } } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(params: { email: string; passwordHash: string; fullName?: string | null; roleName?: string }) {
    const exists = await this.prisma.user.findUnique({ where: { email: params.email } });
    if (exists) throw new ConflictException('Email already registered');

    const roleName = params.roleName ?? 'OPERATOR';
    const role = await this.prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    const user = await this.prisma.user.create({
      data: {
        email: params.email,
        passwordHash: params.passwordHash,
        fullName: params.fullName ?? null,
        roles: { create: [{ roleId: role.id }] },
      },
      include: { roles: { include: { role: true } } },
    });

    return user;
  }

  async list() {
    const users = await this.prisma.user.findMany({ include: { roles: { include: { role: true } } }, orderBy: { createdAt: 'desc' } });
    return users.map((u) => this.toSafe(u));
  }

  toSafe(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
