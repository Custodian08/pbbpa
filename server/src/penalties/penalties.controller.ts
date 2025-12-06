import { Controller, Get, Post } from '@nestjs/common';
import { PenaltiesService } from './penalties.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('penalties')
@Controller('penalties')
export class PenaltiesController {
  constructor(private readonly svc: PenaltiesService) {}

  @Get('preview')
  @Roles('OPERATOR', 'ADMIN')
  preview() {
    return this.svc.preview();
  }

  @Post('run')
  @Roles('OPERATOR', 'ADMIN')
  run() {
    return this.svc.run();
  }
}
