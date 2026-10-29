import { Module } from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { AgendaController } from './agenda.controller';
import { AppointmentsService } from '../appointments/appointments.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [AgendaService, AppointmentsService, PrismaService],
  controllers: [AgendaController],
})
export class AgendaModule {}
