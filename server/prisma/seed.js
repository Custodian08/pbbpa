const { PrismaClient, RateType, PremiseStatus, LeaseStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN' } });
  await prisma.role.upsert({ where: { name: 'OPERATOR' }, update: {}, create: { name: 'OPERATOR' } });
  await prisma.role.upsert({ where: { name: 'ANALYST' }, update: {}, create: { name: 'ANALYST' } });

  const adminEmail = 'admin@example.com';
  const adminPwd = 'admin123';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPwd, 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'Admin',
        roles: { create: [{ roleId: adminRole.id }] },
      },
    });
    console.log(`Seed: created admin user ${adminEmail} / ${adminPwd}`);
  } else {
    console.log(`Seed: admin user already exists (${adminEmail})`);
  }

  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        type: 'LEGAL',
        name: 'ООО Ромашка',
        unp: '123456789',
        email: 'info@romashka.by',
        phone: '+375291112233',
        bankAccount: 'BY00UNBS00000000000000000000',
        address: 'г. Минск, ул. Ленина, 1',
      },
    });
    console.log('Seed: tenant created');
  }

  let premise = await prisma.premise.findFirst();
  if (!premise) {
    premise = await prisma.premise.create({
      data: {
        code: 'A-101',
        type: 'OFFICE',
        address: 'г. Минск, ул. Ленина, 1, офис 101',
        floor: 5,
        area: 45.5,
        rateType: RateType.M2,
        baseRate: 25,
        status: PremiseStatus.FREE,
        availableFrom: new Date(),
      },
    });
    console.log('Seed: premise created');
  }

  const existingLease = await prisma.lease.findFirst();
  if (!existingLease && premise && tenant) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    await prisma.lease.create({
      data: {
        premiseId: premise.id,
        tenantId: tenant.id,
        periodFrom: from,
        base: RateType.M2,
        currency: 'BYN',
        vatRate: 20,
        dueDay: 15,
        penaltyRatePerDay: 0.1,
        status: LeaseStatus.ACTIVE,
      },
    });
    await prisma.premise.update({ where: { id: premise.id }, data: { status: PremiseStatus.RENTED } });
    console.log('Seed: active lease created');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
