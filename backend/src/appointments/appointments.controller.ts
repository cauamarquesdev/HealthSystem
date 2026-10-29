import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // Precisa vir ANTES de qualquer rota com ":id"
  @Get('professionals')
  professionals() {
    return this.appointmentsService.listProfessionals();
  }

  @Get()
  findAll(@Query('start') start?: string, @Query('end') end?: string) {
    return this.appointmentsService.findAll(start, end);
  }

  @Post()
  create(@Body() body: any) {
    return this.appointmentsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.appointmentsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }
}