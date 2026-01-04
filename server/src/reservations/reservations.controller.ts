import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Get()
  @Roles('ADMIN', 'OPERATOR', 'MANAGER', 'EXEC', 'ANALYST', 'ACCOUNTANT')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'OPERATOR', 'MANAGER', 'EXEC', 'ANALYST', 'ACCOUNTANT')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('active-by-premise/:premiseId')
  @Roles('ADMIN', 'OPERATOR', 'MANAGER', 'EXEC', 'ANALYST', 'ACCOUNTANT', 'USER')
  activeByPremise(@Param('premiseId') premiseId: string) {
    return this.service.activeByPremise(premiseId);
  }

  @Post()
  @Roles('USER', 'OPERATOR', 'ADMIN', 'ACCOUNTANT')
  create(@Req() req: any, @Body() dto: CreateReservationDto) {
    const userId = req?.user?.userId as string | undefined;
    return this.service.create(dto, userId);
  }

  @Post(':id/cancel')
  @Roles('USER', 'OPERATOR', 'ADMIN', 'ACCOUNTANT')
  cancel(@Req() req: any, @Param('id') id: string) {
    const userId = req?.user?.userId as string | undefined;
    const roles: string[] = (req?.user?.roles || []) as string[];
    const isBasicUser = roles.includes('USER') && !(['ADMIN','OPERATOR','MANAGER','EXEC','ANALYST'].some(r=> roles.includes(r)));
    return this.service.cancel(id, userId, isBasicUser);
  }

  @Post('expire-now')
  expireNow() {
    return this.service.expireNow();
  }
}
