import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MedicalRecordService {
  constructor(private prisma: PrismaService) {}

  private get clinicalNoteDelegate() {
    const prisma = this.prisma as PrismaService & {
      clinicalNote?: {
        create: (args: any) => Promise<any>;
        findMany: (args: any) => Promise<any[]>;
      };
      clinicalNotes?: {
        create: (args: any) => Promise<any>;
        findMany: (args: any) => Promise<any[]>;
      };
    };

    return prisma.clinicalNote ?? prisma.clinicalNotes ?? null;
  }

  // Salva uma nova evolução clínica
  async createClinicalNote(data: {
    patientId: string;
    userId: string;
    content: string;
    isAI?: boolean;
  }) {
    const clinicalNoteDelegate = this.clinicalNoteDelegate;

    if (!clinicalNoteDelegate) {
      throw new Error('Clinical note model is not available in Prisma client.');
    }

    return clinicalNoteDelegate.create({
      data: {
        patientId: data.patientId,
        userId: data.userId,
        content: data.content,
        isAI: data.isAI || false,
      },
    });
  }

  // Retorna o histórico unificado (Timeline) de um paciente
  async getPatientHistory(patientId: string) {
    const clinicalNoteDelegate = this.clinicalNoteDelegate;

    if (!clinicalNoteDelegate) {
      throw new Error('Clinical note model is not available in Prisma client.');
    }

    const notes = await clinicalNoteDelegate.findMany({
      where: { patientId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const extendedPrisma = this.prisma as PrismaService & {
      prescription?: {
        findMany: (args: any) => Promise<any[]>;
      };
      prescriptions?: {
        findMany: (args: any) => Promise<any[]>;
      };
      patientMedia?: {
        findMany: (args: any) => Promise<any[]>;
      };
      patientMedias?: {
        findMany: (args: any) => Promise<any[]>;
      };
    };

    const prescriptionDelegate =
      extendedPrisma.prescription ?? extendedPrisma.prescriptions;
    const mediaDelegate =
      extendedPrisma.patientMedia ?? extendedPrisma.patientMedias;

    const prescriptions = prescriptionDelegate
      ? await prescriptionDelegate.findMany({
          where: { patientId },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const media = mediaDelegate
      ? await mediaDelegate.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // Retorna tudo separado para o Frontend organizar nas abas da Sala de Atendimento
    return {
      notes,
      prescriptions,
      media,
    };
  }
}
