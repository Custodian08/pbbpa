import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('USER', 'OPERATOR', 'ADMIN')
  create(@Body() dto: CreateReservationDto) {
    return this.service.create(dto);
  }

  @Post(':id/cancel')
  @Roles('OPERATOR', 'ADMIN')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Post('expire-now')
  expireNow() {
    return this.service.expireNow();
  }
}
