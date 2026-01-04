import { Controller, Get, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  private async getTenantId(req: any): Promise<string | null> {
    const uid = req?.user?.userId as string | undefined;
    if (!uid) return null;
    const u: any = await this.prisma.user.findUnique({ where: { id: uid } });
    return u?.tenantId ?? null;
  }

  @Get('leases')
  async myLeases(@Req() req: any) {
    const tenantId = await this.getTenantId(req);
    if (!tenantId) return [];
    const uid = req?.user?.userId as string | undefined;
    return this.prisma.lease.findMany({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TERMINATING'] as any },
        OR: [
          { createdByUserId: uid },
          { reservation: { is: { createdByUserId: uid } } },
        ],
      },
      include: { premise: true, tenant: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('invoices')
  async myInvoices(@Req() req: any) {
    const tenantId = await this.getTenantId(req);
    if (!tenantId) return [];
    const uid = req?.user?.userId as string | undefined;
    if (!uid) return [];
    return this.prisma.invoice.findMany({
      where: {
        accrual: {
          lease: {
            tenantId,
            OR: [
              { createdByUserId: uid },
              { reservation: { is: { createdByUserId: uid } } },
            ],
          },
        },
      },
      include: { accrual: true },
      orderBy: { date: 'desc' },
    });
  }

  @Get('payments')
  async myPayments(@Req() req: any) {
    const tenantId = await this.getTenantId(req);
    if (!tenantId) return [];
    const uid = req?.user?.userId as string | undefined;
    if (!uid) return [];
    // Показываем только платежи, которые привязаны к счетам по договорам,
    // созданным самим пользователем или по его бронированиям.
    return this.prisma.payment.findMany({
      where: {
        tenantId,
        linkedInvoice: {
          is: {
            accrual: {
              lease: {
                tenantId,
                OR: [
                  { createdByUserId: uid },
                  { reservation: { is: { createdByUserId: uid } } },
                ],
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  @Get('reservations')
  async myReservations(@Req() req: any) {
    const uid = req?.user?.userId as string | undefined;
    if (!uid) return [];
    return this.prisma.reservation.findMany({ where: ({ createdByUserId: uid } as any), include: { premise: true }, orderBy: { createdAt: 'desc' } });
  }
}
