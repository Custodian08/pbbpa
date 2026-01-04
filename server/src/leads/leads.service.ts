import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto, LeadStatusEnum } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateShowingDto } from './dto/create-showing.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeadDto) {
    return this.prisma.lead.create({ data: {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      source: dto.source,
      requirements: dto.requirements,
      status: (dto.status || LeadStatusEnum.NEW) as any,
    }});
  }

  async findAll(params: { q?: string; status?: string }) {
    const { q, status } = params;
    return this.prisma.lead.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(q ? { OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { source: { contains: q, mode: 'insensitive' } },
        ] } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: { showings: true, attachments: true } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto) {
    await this.findOne(id);
    return this.prisma.lead.update({ where: { id }, data: {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      source: dto.source,
      requirements: dto.requirements,
      status: dto.status as any,
    }});
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.lead.delete({ where: { id } });
    return { ok: true };
  }

  async addShowing(leadId: string, dto: CreateShowingDto) {
    await this.findOne(leadId);
    return this.prisma.showing.create({ data: {
      leadId,
      premiseId: dto.premiseId ?? null,
      date: new Date(dto.date),
      agent: dto.agent ?? null,
      comment: dto.comment ?? null,
    }});
  }

  async listShowings(leadId: string) {
    await this.findOne(leadId);
    return this.prisma.showing.findMany({ where: { leadId }, orderBy: { date: 'desc' } });
  }

  async updateShowing(leadId: string, showingId: string, body: { status?: string; outcome?: string; comment?: string }) {
    await this.findOne(leadId);
    const show = await this.prisma.showing.findUnique({ where: { id: showingId } });
    if (!show || show.leadId !== leadId) throw new NotFoundException('Showing not found');
    return this.prisma.showing.update({ where: { id: showingId }, data: {
      status: body.status as any,
      outcome: body.outcome ?? show.outcome,
      comment: body.comment ?? show.comment,
    }});
  }

  async addAttachment(leadId: string, body: { filename: string; originalName?: string; mimeType?: string; size?: number }) {
    await this.findOne(leadId);
    return this.prisma.leadAttachment.create({ data: {
      leadId,
      filename: body.filename,
      originalName: body.originalName ?? null,
      mimeType: body.mimeType ?? null,
      size: body.size ?? null,
    }});
  }

  async listAttachments(leadId: string) {
    const lead = await this.findOne(leadId);
    return lead.attachments || [];
  }

  async getAttachment(leadId: string, attId: string) {
    const att = await this.prisma.leadAttachment.findUnique({ where: { id: attId } });
    if (!att || att.leadId !== leadId) throw new NotFoundException('Attachment not found');
    return att;
  }

  async removeAttachment(leadId: string, attId: string) {
    await this.getAttachment(leadId, attId);
    await this.prisma.leadAttachment.delete({ where: { id: attId } });
    return { ok: true };
  }
}
