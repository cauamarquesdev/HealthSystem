// src/patients/patients.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const birthDate = data.birthDate ? new Date(data.birthDate) : null;

    // TODO: Num ambiente real, o tenantId vem do contexto da requisição (ex: Req.user.tenantId)
    // Para simplificar o teste, se não vier tenantId, vamos pegar ou criar um genérico
    let tenantId = data.tenantId;
    if (!tenantId) {
      let defaultTenant = await this.prisma.tenant.findFirst();
      if (!defaultTenant) {
        defaultTenant = await this.prisma.tenant.create({ data: { name: "Ellevare Estética Matriz" } });
      }
      tenantId = defaultTenant.id;
    }

    return this.prisma.patient.create({
      data: {
        name: data.name,
        cpf: data.cpf,
        phone: data.phone,
        email: data.email,
        hasWhatsapp: data.hasWhatsapp ?? true,
        active: data.active ?? true,
        birthDate,
        
        // --- Campos de CRM ---
        tags: data.tags || [],
        fototipo: data.fototipo,
        skinTendency: data.skinTendency,
        allergies: data.allergies,
        // ---------------------

        tenant: {
          connect: {
            id: tenantId,
          },
        },
      },
    });
  }

  async findAll(search?: string) {
    // 1. Buscamos os pacientes com as suas relações
    const patients = await this.prisma.patient.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { cpf: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        sales: true, // Necessário para calcular o LTV
        appointments: {
          orderBy: { date: 'desc' },
          take: 5, // Traz os últimos 5 agendamentos para o histórico
          include: {
            procedure: true, // Traz o nome do procedimento
            professional: true // Traz o nome do médico
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 2. Mapeamos os dados para entregar o DTO exato que o Frontend precisa
    return patients.map(p => {
      const patient = p as any;

      // Cálculo do LTV (Lifetime Value) somando as vendas
      const ltvTotal = patient.sales.reduce((acc: number, sale: any) => acc + Number(sale.totalAmount), 0);
      const ticketMedio = patient.sales.length > 0 ? ltvTotal / patient.sales.length : 0;
      
      const lastAppt = patient.appointments[0];
      const lastVisit = lastAppt ? new Date(lastAppt.date).toLocaleDateString('pt-BR') : 'Sem visitas';
      const lastProc = lastAppt?.procedure?.name || '-';
      const medicoResp = lastAppt?.professional?.name || 'Não definido';

      // Calcula a idade
      let age = '-';
      if (patient.birthDate) {
        const diff = Date.now() - new Date(patient.birthDate).getTime();
        age = `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))} anos`;
      }

      // Prepara as tags (adiciona Ativo/Inativo na lista de tags)
      const displayTags = [...(patient.tags ?? [])];
      displayTags.unshift(patient.active ? "ATIVO" : "INATIVO");

      return {
        id: p.id,
        name: p.name,
        pacId: `#PAC-${p.id.substring(0,4).toUpperCase()}`,
        age: age,
        cpf: p.cpf || '-',
        phone: p.phone,
        email: p.email || '-',
        hasWhatsapp: p.hasWhatsapp,
        active: p.active,
        avatar: p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=0D8ABC&color=fff`,
        
        // Dados de CRM
        fototipo: patient.fototipo || "Não informado",
        skinTendency: patient.skinTendency || "Não informado",
        alergias: patient.allergies || "Nenhuma relatada",
        medico: medicoResp,
        crm: "148.920", // Mock (idealmente viria do Professional)
        
        // Dados Financeiros
        ltvTotal: ltvTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        ticketMedio: ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        contracts: `${patient.sales.length} contratos`,
        contratosPlanos: `${patient.sales.length} quitados`, // Mock simplificado
        inadimplencia: "0 Inadimplência", // Mock simplificado
        
        // Dados da Lista
        tags: displayTags,
        lastVisit: lastVisit,
        lastProc: lastProc,

        // Histórico para o painel lateral
        history: patient.appointments.map((a: any) => ({
          id: a.id,
          title: a.procedure?.name || "Consulta",
          date: new Date(a.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          desc: `Status: ${a.status} • Profissional: ${a.professional?.name || '-'}`
        }))
      };
    });
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    return patient;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data,
    });
  }

  async toggleStatus(id: string, active: boolean) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: { active },
    });
  }

  // --- ALTERAÇÕES AQUI PARA RESOLVER A RESTRIÇÃO FOREIGN KEY ---
  async deleteBatch(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new NotFoundException('Nenhum ID fornecido para exclusão.');
    }

    // 1. Apaga primeiro as vendas (Sale) vinculadas ao(s) paciente(s)
    await this.prisma.sale.deleteMany({
      where: {
        patientId: { in: ids }
      }
    });

    // 2. Apaga também os agendamentos (Appointment) se os tiveres definidos
    // Se o teu schema não tiver o modelo appointment com a relação patientId, apaga estas linhas.
    await this.prisma.appointment.deleteMany({
      where: {
        patientId: { in: ids }
      }
    });

    // 3. Agora sim, apaga os pacientes em segurança
    const result = await this.prisma.patient.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Nenhum paciente encontrado com os IDs fornecidos. O ID pode estar divergente.');
    }

    return { 
      message: 'Pacientes e as suas dependências foram excluídos com sucesso.', 
      count: result.count 
    };
  }

  async remove(id: string) {
    return this.deleteBatch([id]);
  }
}
