import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateShowingDto } from './dto/create-showing.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly svc: LeadsService) {}

  @Get()
  @Roles('ADMIN', 'OPERATOR', 'MANAGER', 'EXEC')
  list(@Query('q') q?: string, @Query('status') status?: string) {
    return this.svc.findAll({ q, status });
  }

  @Get(':id')
  @Roles('ADMIN', 'OPERATOR', 'MANAGER', 'EXEC')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'OPERATOR')
  create(@Body() dto: CreateLeadDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'OPERATOR')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Get(':id/showings')
  @Roles('ADMIN', 'OPERATOR', 'MANAGER', 'EXEC')
  showings(@Param('id') id: string) {
    return this.svc.listShowings(id);
  }

  @Post(':id/showings')
  @Roles('ADMIN', 'OPERATOR')
  addShowing(@Param('id') id: string, @Body() dto: CreateShowingDto) {
    return this.svc.addShowing(id, dto);
  }

  @Patch(':id/showings/:sid')
  @Roles('ADMIN', 'OPERATOR')
  updateShowing(
    @Param('id') id: string,
    @Param('sid') sid: string,
    @Body() body: { status?: string; outcome?: string; comment?: string },
  ) {
    return this.svc.updateShowing(id, sid, body);
  }

  @Post(':id/attachments')
  @Roles('ADMIN', 'OPERATOR')
  addAttachment(
    @Param('id') id: string,
    @Body() body: { filename: string; originalName?: string; mimeType?: string; size?: number },
  ) {
    return this.svc.addAttachment(id, body);
  }

  @Get(':id/attachments')
  @Roles('ADMIN', 'OPERATOR', 'MANAGER', 'EXEC')
  listAttachments(@Param('id') id: string) {
    return this.svc.listAttachments(id);
  }

  @Get(':id/attachments/:aid')
  @Roles('ADMIN', 'OPERATOR', 'MANAGER', 'EXEC')
  getAttachment(@Param('id') id: string, @Param('aid') aid: string) {
    return this.svc.getAttachment(id, aid);
  }

  @Post(':id/attachments/upload')
  @Roles('ADMIN', 'OPERATOR')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
        const dest = path.join(process.cwd(), 'uploads', 'leads', req.params.id);
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (_req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
        const stamp = Date.now();
        const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]+/g, '_');
        cb(null, `${stamp}__${safe}`);
      },
    })
  }))
  async upload(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    return this.svc.addAttachment(id, {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
  }

  @Get(':id/attachments/:aid/download')
  @Roles('ADMIN', 'OPERATOR', 'MANAGER', 'EXEC')
  async download(@Param('id') id: string, @Param('aid') aid: string, @Res() res: Response) {
    const att = await this.svc.getAttachment(id, aid);
    const p = path.join(process.cwd(), 'uploads', 'leads', id, att.filename);
    if (!fs.existsSync(p)) {
      return res.status(404).send('File not found');
    }
    res.setHeader('Content-Type', att.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${att.originalName || att.filename}"`);
    fs.createReadStream(p).pipe(res);
  }

  @Delete(':id/attachments/:aid')
  @Roles('ADMIN')
  async removeAttachment(@Param('id') id: string, @Param('aid') aid: string) {
    const att = await this.svc.getAttachment(id, aid);
    const p = path.join(process.cwd(), 'uploads', 'leads', id, att.filename);
    if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch {}
    return this.svc.removeAttachment(id, aid);
  }
}
