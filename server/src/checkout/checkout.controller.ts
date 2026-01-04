import { Body, Controller, Post, Req } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly svc: CheckoutService) {}

  @Post('rent')
  @Roles('USER', 'OPERATOR', 'ADMIN')
  rent(@Req() req: any, @Body() body: { premiseId: string; periodFrom?: string; periodTo?: string }) {
    const uid = req?.user?.userId as string;
    return this.svc.rent(uid, body);
  }

  @Post('pay')
  @Roles('USER', 'OPERATOR', 'ADMIN')
  pay(@Req() req: any, @Body() body: { invoiceId: string; amount?: number }) {
    const uid = req?.user?.userId as string;
    return this.svc.pay(uid, body);
  }
}
