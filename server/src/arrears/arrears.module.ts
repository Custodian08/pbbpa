import { Module } from '@nestjs/common';
import { ArrearsService } from './arrears.service';
import { ArrearsController } from './arrears.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ArrearsController],
  providers: [ArrearsService, PrismaService],
})
export class ArrearsModule {}
