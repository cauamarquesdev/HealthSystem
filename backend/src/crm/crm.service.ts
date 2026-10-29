import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const tenant = await this.prisma.tenant.findFirst();
    if (!tenant) return [];

    const leads = await this.prisma.lead.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' }
    });

    return leads.map(lead => ({
      id: lead.id,
      name: lead.name,
      procedure: lead.procedure || '-',
      source: lead.source || 'WhatsApp',
      time: new Date(lead.createdAt).toLocaleDateString('pt-BR'),
      val: lead.val || 'R$ 0,00',
      doc: lead.doc || '-',
      status: lead.status,
      initials: lead.name.substring(0, 2).toUpperCase(),
    }));
  }

  async create(data: any) {
    let tenant = await this.prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await this.prisma.tenant.create({ data: { name: "Ellevare Estética Matriz" } });
    }

    return this.prisma.lead.create({
      data: {
        tenantId: tenant.id,
        name: data.name,
        phone: data.phone,
        procedure: data.procedure,
        source: data.source,
        val: data.val,
        doc: data.doc,
        status: data.status || 'NOVO',
      }
    });
  }

  // Nova função para Editar o Lead
  async update(id: string, data: any) {
    return this.prisma.lead.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        procedure: data.procedure,
        source: data.source,
        val: data.val,
        doc: data.doc,
      }
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.lead.update({
      where: { id },
      data: { status }
    });
  }

  // Nova função para Deletar o Lead
  async remove(id: string) {
    return this.prisma.lead.delete({
      where: { id }
    });
  }
}