import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AppointmentsService } from '../appointments/appointments.service';

@Controller('appointments')
export class AgendaController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  findAll(@Query('start') start: string, @Query('end') end: string) {
    return this.appointmentsService.findAll(start, end);
  }

  @Post()
  create(@Body() data: any) {
    return this.appointmentsService.create(data);
  }
}
