import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  // Garante que o Tenant padrão existe no banco antes de qualquer operação
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
      // Caso a tabela tenant tenha alguma restrição diferente, ignoramos o erro de criação duplicada
    }
    return tenantId;
  }

  async createSale(data: {
    patientId?: string;
    userId?: string;
    totalAmount: number;
    status?: string;
    paymentType?: string;
    items?: any[];
  }) {
    if (!this.prisma || !(this.prisma as any).sale) {
      throw new InternalServerErrorException(
        "O Prisma Client não foi inicializado corretamente para o model 'sale'.",
      );
    }

    const tenantId = await this.ensureTenantExists();

    let targetPatientId = data.patientId;
    if (
      !targetPatientId ||
      targetPatientId === '' ||
      targetPatientId.length < 5 ||
      targetPatientId.includes('ID_')
    ) {
      let p = await (this.prisma as any).patient.findFirst({
        where: { tenantId },
      });
      if (!p) {
        p = await (this.prisma as any).patient.create({
          data: {
            name: 'Paciente Balcão / PDV',
            email: 'pdv@clinica.com',
            phone: '11988888888',
            tenantId,
          },
        });
      }
      targetPatientId = p.id;
    }

    let targetUserId = data.userId;
    if (
      !targetUserId ||
      targetUserId === '' ||
      targetUserId.length < 5 ||
      targetUserId.includes('ID_')
    ) {
      let u = await (this.prisma as any).user.findFirst({
        where: { tenantId },
      });
      if (!u) {
        u = await (this.prisma as any).user
          .create({
            data: {
              email: 'admin@clinica.com',
              password: 'admin',
              name: 'Administrador',
              tenantId,
            },
          })
          .catch(() => null);
      }
      targetUserId = u ? u.id : undefined;
    }

    const valorTotal = Number(data.totalAmount || 0);
    const listaItens =
      data.items && data.items.length > 0
        ? data.items
        : [
            {
              name: 'Atendimento / Procedimento Estético',
              price: valorTotal,
              quantity: 1,
            },
          ];

    try {
      return await (this.prisma as any).sale.create({
        data: {
          patientId: targetPatientId,
          ...(targetUserId ? { userId: targetUserId } : {}),
          tenantId,
          totalAmount: valorTotal,
          status: data.status || 'PAGO',
          paymentType: data.paymentType || 'CREDITO',
          items: {
            create: listaItens.map((item) => ({
              name: item.name || 'Serviço',
              price: Number(item.price || 0),
              quantity: Number(item.quantity || 1),
            })),
          },
        },
        include: { items: true },
      });
    } catch (dbError: any) {
      console.error(
        '--- ERRO DETALHADO DO PRISMA AO SALVAR VENDA ---',
        dbError,
      );
      throw new InternalServerErrorException(
        dbError.message || 'Erro ao gravar venda no banco',
      );
    }
  }

  async getDashboardMetrics() {
    if (!this.prisma || !(this.prisma as any).sale) {
      return { totalRevenue: 0, totalSalesCount: 0, averageTicket: 0 };
    }

    try {
      const sales = await (this.prisma as any).sale.findMany({
        where: { status: 'PAGO' },
      });

      const totalRevenue = sales.reduce(
        (sum: number, sale: { totalAmount: number | string }) =>
          sum + Number(sale.totalAmount),
        0,
      );
      const totalSalesCount = sales.length;
      const averageTicket =
        totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

      return {
        totalRevenue,
        totalSalesCount,
        averageTicket,
      };
    } catch (e) {
      return { totalRevenue: 0, totalSalesCount: 0, averageTicket: 0 };
    }
  }
}
