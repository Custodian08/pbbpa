import { Module } from '@nestjs/common';
import { PremisesService } from './premises.service';
import { PremisesController } from './premises.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PremisesController],
  providers: [PremisesService, PrismaService],
})
export class PremisesModule {}
