import { Controller, Get, Query } from '@nestjs/common';
import { ArrearsService } from './arrears.service';
import { AgingQueryDto } from './dto/aging.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('arrears')
@Controller('arrears')
export class ArrearsController {
  constructor(private readonly service: ArrearsService) {}

  @Get('aging')
  aging(@Query() query: AgingQueryDto) {
    return this.service.aging(query);
  }

  @Get('penalties/run')
  runPenalties(@Query() query: AgingQueryDto) {
    return this.service.runPenalties(query);
  }
}
