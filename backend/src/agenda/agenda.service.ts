import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgendaService {
  constructor(private prisma: PrismaService) {}

  // Garante que o Tenant padrão existe no banco
  private async ensureTenantExists() {
    const tenantId = 'default-tenant';
    try {
      const tenant = await (this.prisma as any).tenant.findUnique({
        where: { id: tenantId },
      });
      if (!tenant) {
        await (this.prisma as any).tenant.create({
          data: {
            id: tenantId,
            name: 'Clínica Padrão (Sistema)',
            document: '00.000.000/0001-00',
          },
        });
      }
    } catch (e) {
      // Ignora erro caso já exista
    }
    return tenantId;
  }

  async createAppointment(data: any, user: any) {
    return (this.prisma as any).appointment.create({
      data: {
        patient: {
          connect: { id: data.patientId }, // O Frontend deve enviar um ID real do paciente selecionado
        },
        tenant: {
          connect: { id: user.tenantId }, // O Tenant real extraído direto do token de login
        },
        date: new Date(data.date),
        procedure: data.procedure,
        status: 'AGENDADO',
      },
    });
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string) {
    try {
      return await (this.prisma as any).appointment.findMany({
        where: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        include: {
          patient: true,
        },
      });
    } catch (error) {
      return [];
    }
  }
}
