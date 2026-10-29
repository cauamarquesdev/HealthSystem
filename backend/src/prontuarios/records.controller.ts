import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { RecordsService } from './records.service';

@Controller('records')
export class RecordsController {
  constructor(private readonly service: RecordsService) {}

  // ---- pacientes
  @Get('patients')
  patients(@Query('q') q?: string) {
    return this.service.listPatients(q);
  }

  @Patch('patients/:id')
  updateProfile(@Param('id') id: string, @Body() body: any, @Query('userId') userId?: string) {
    return this.service.updateProfile(id, body, userId);
  }

  @Get('patients/:id/record')
  record(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.getRecord(id, userId);
  }

  @Get('patients/:id/audit')
  audit(@Param('id') id: string) {
    return this.service.listAudit(id);
  }

  // ---- anamnese e evoluções
  @Post('patients/:id/notes')
  createNote(@Param('id') id: string, @Body() body: any) {
    return this.service.createNote(id, body);
  }

  @Patch('notes/:id')
  updateNote(@Param('id') id: string, @Body() body: any) {
    return this.service.updateNote(id, body);
  }

  @Post('notes/:id/sign')
  signNote(@Param('id') id: string, @Body() body: any) {
    return this.service.signNote(id, body?.userId);
  }

  @Post('notes/:id/addendum')
  addendum(@Param('id') id: string, @Body() body: any) {
    return this.service.addendum(id, body);
  }

  @Delete('notes/:id')
  deleteNote(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.deleteNote(id, userId);
  }

  // ---- prescrições
  @Post('patients/:id/prescriptions')
  createPrescription(@Param('id') id: string, @Body() body: any) {
    return this.service.createPrescription(id, body);
  }

  @Post('prescriptions/:id/sign')
  signPrescription(@Param('id') id: string, @Body() body: any) {
    return this.service.signPrescription(id, body?.userId);
  }

  // ---- documentos
  @Post('patients/:id/documents')
  createDocument(@Param('id') id: string, @Body() body: any) {
    return this.service.createDocument(id, body);
  }

  @Post('documents/:id/sign')
  signDocument(@Param('id') id: string, @Body() body: any) {
    return this.service.signDocument(id, body);
  }

  // ---- fotos
  @Post('patients/:id/media')
  createMedia(@Param('id') id: string, @Body() body: any) {
    return this.service.createMedia(id, body);
  }

  @Patch('media/:id')
  updateMedia(@Param('id') id: string, @Body() body: any) {
    return this.service.updateMedia(id, body);
  }

  @Delete('media/:id')
  deleteMedia(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.deleteMedia(id, userId);
  }

  @Get('media/:id/file')
  async file(@Param('id') id: string, @Res() res: Response) {
    const { mime, buffer } = await this.service.mediaFile(id);
    res.set({ 'Content-Type': mime, 'Cache-Control': 'private, max-age=86400' });
    res.send(buffer);
  }
}