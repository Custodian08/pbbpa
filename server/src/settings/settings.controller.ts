import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVatDto } from './dto/create-vat.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('vat')
  @Roles('ADMIN', 'OPERATOR')
  async listVat() {
    return this.prisma.vatSetting.findMany({ orderBy: { validFrom: 'desc' } });
  }

  @Post('vat')
  @Roles('ADMIN')
  async createVat(@Body() dto: CreateVatDto) {
    const exists = await this.prisma.vatSetting.findFirst({ where: { rate: dto.rate as any, validFrom: new Date(dto.validFrom) } });
    if (exists) return exists;
    return this.prisma.vatSetting.create({ data: { rate: dto.rate as any, validFrom: new Date(dto.validFrom) } });
  }
}
