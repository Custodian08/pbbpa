import { Body, Controller, Delete, Get, Param, Patch, Post, Res, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { LeasesService } from './leases.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateIndexationDto } from './dto/create-indexation.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';

@ApiTags('leases')
@Controller('leases')
export class LeasesController {
  constructor(private readonly service: LeasesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'OPERATOR', 'ACCOUNTANT')
  create(@Body() dto: CreateLeaseDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'OPERATOR', 'ACCOUNTANT')
  update(@Param('id') id: string, @Body() dto: Partial<CreateLeaseDto>) {
    return this.service.update(id, dto);
  }

  @Post(':id/activate')
  @Roles('ADMIN')
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @Post(':id/terminate')
  @Roles('ADMIN')
  terminate(@Param('id') id: string) {
    return this.service.terminate(id);
  }

  @Post(':id/close')
  @Roles('ADMIN')
  close(@Param('id') id: string) {
    return this.service.close(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/accruals')
  accruals(@Param('id') id: string) {
    return this.service.accruals(id);
  }

  @Get(':id/invoices')
  invoices(@Param('id') id: string) {
    return this.service.invoices(id);
  }

  @Get(':id/payments')
  payments(@Param('id') id: string) {
    return this.service.payments(id);
  }

  @Get(':id/indexations')
  indexations(@Param('id') id: string) {
    return this.service.indexations(id);
  }

  @Post(':id/indexations')
  @Roles('ADMIN', 'OPERATOR', 'ACCOUNTANT')
  addIndexation(@Param('id') id: string, @Body() dto: CreateIndexationDto) {
    return this.service.addIndexation(id, dto);
  }

  @Delete(':id/indexations/:ixId')
  @Roles('ADMIN')
  removeIndexation(@Param('id') id: string, @Param('ixId') ixId: string) {
    return this.service.removeIndexation(id, ixId);
  }

  // --- Signed contract upload/download ---
  @Post(':id/sign/upload')
  @Roles('ADMIN', 'OPERATOR', 'ACCOUNTANT')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req: any, _file: any, cb: (err: Error | null, dest: string) => void) => {
        const dest = path.join(process.cwd(), 'uploads', 'leases', req.params.id);
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (_req: any, file: any, cb: (err: Error | null, name: string) => void) => {
        const stamp = Date.now();
        const safe = String(file.originalname || 'signed.pdf').replace(/[^a-zA-Z0-9_.-]+/g, '_');
        cb(null, `${stamp}__${safe}`);
      },
    }),
    fileFilter: (_req: any, file: any, cb: (err: Error | null, acceptFile: boolean) => void) => {
      const ok = (file?.mimetype || '').includes('pdf') || /\.pdf$/i.test(file?.originalname || '');
      cb(ok ? null : new Error('ONLY_PDF_ALLOWED'), ok);
    },
  }))
  async uploadSigned(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body() body: { by?: string },
  ) {
    if (!file) {
      throw new BadRequestException('Допускается загрузка только PDF');
    }
    return this.service.markSigned(id, { by: body?.by, fileName: file.filename });
  }

  @Get(':id/sign/download')
  async downloadSigned(@Param('id') id: string, @Res() res: Response) {
    const lease: any = await this.service.findOne(id);
    if (!lease.signedFileName) return res.status(404).send('No signed file');
    const p = path.join(process.cwd(), 'uploads', 'leases', id, lease.signedFileName);
    if (!fs.existsSync(p)) return res.status(404).send('File not found');
    const isPdf = path.extname(p).toLowerCase() === '.pdf';
    const stat = fs.statSync(p);
    res.setHeader('Content-Type', isPdf ? 'application/pdf' : 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${lease.signedFileName}"`);
    res.setHeader('Content-Length', String(stat.size));
    fs.createReadStream(p).pipe(res);
  }

  @Delete(':id/sign')
  @Roles('ADMIN')
  async clearSigned(@Param('id') id: string) {
    return this.service.clearSigned(id);
  }
}
