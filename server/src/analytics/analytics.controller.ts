import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('occupancy')
  occupancy() {
    return this.svc.occupancy();
  }

  @Get('monthly')
  monthly(@Query('months') months?: string) {
    return this.svc.monthly(months ? Number(months) : 12);
  }

  @Get('aging')
  aging() {
    return this.svc.aging();
  }

  @Get('kpi')
  kpi() {
    return this.svc.kpi();
  }
}
