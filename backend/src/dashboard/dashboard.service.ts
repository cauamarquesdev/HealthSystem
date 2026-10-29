import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDailyMetrics() {
    try {
      // Define o início e fim do dia para filtrar vendas e agendamentos de HOJE
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // 1. Faturamento Hoje (Soma do totalAmount das Vendas)
      const salesToday = await this.prisma.sale.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: { createdAt: { gte: startOfDay, lte: endOfDay } }
      });
      
      const faturamento = Number(salesToday._sum.totalAmount || 0);
      const qtdVendas = salesToday._count.id || 0;

      // 2. Contagem de Agendamentos de Hoje
      const agendamentos = await this.prisma.appointment.count({
        where: { date: { gte: startOfDay, lte: endOfDay } }
      });

      // 3. Pacientes Atendidos (Agendamentos 'CONCLUIDO')
      const atendidos = await this.prisma.appointment.count({
        where: { 
          date: { gte: startOfDay, lte: endOfDay }, 
          status: 'CONCLUIDO' 
        }
      });

      // 4. Ticket Médio
      const ticketMedio = qtdVendas > 0 ? faturamento / qtdVendas : 0;

      return {
        faturamentoHoje: faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        agendamentosHoje: agendamentos,
        pacientesAtendidos: atendidos,
        ticketMedio: ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        taxaComparecimento: "0%",
        conversaoAvaliacoes: "0%",
        ocupacaoAgenda: "0%",
        recorrencia: "0%",
        agenda: [], // Deixamos arrays vazios para não quebrar o Frontend
        crm: [], 
        alerts: [],
        mixChart: []
      };
    } catch (error) {
      console.error("Erro no Prisma ao buscar métricas:", error);
      throw error;
    }
  }
}