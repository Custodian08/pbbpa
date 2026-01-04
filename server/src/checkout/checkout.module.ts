import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, PrismaService],
})
export class CheckoutModule {}
