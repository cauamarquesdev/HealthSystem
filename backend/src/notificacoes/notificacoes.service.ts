import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, BadRequestException } from '@nestjs/common';
import { NotificacaoPrioridade, NotificacaoTipo, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const TIPOS = Object.values(NotificacaoTipo) as NotificacaoTipo[];
const PRIORIDADES = Object.values(NotificacaoPrioridade) as NotificacaoPrioridade[];
const DIA = 86_400_000;

const inicioDoDia = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const diasAte = (d: Date) => Math.round((inicioDoDia(d).getTime() - inicioDoDia().getTime()) / DIA);
const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const dataBR = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const estagio = (dias: number) => (dias < 0 ? 'vencido' : dias <= 7 ? '7d' : '30d');

/** Status de agendamento que NÃO devem gerar lembrete. */
const STATUS_ENCERRADOS = ['CANCELADO', 'CANCELADA', 'CONCLUIDO', 'CONCLUIDA', 'FINALIZADO', 'FALTOU', 'REMARCADO'];

export type NovaNotificacao = {
  tenantId: string;
  tipo?: NotificacaoTipo;
  prioridade?: NotificacaoPrioridade;
  titulo: string;
  mensagem?: string;
  href?: string;
  /** Mesma chave = o alerta é criado uma única vez por usuário. */
  dedupeKey?: string;
  /** Destinatários específicos. */
  userIds?: string[];
  /** Ou por perfil (ADMIN, PROFESSIONAL, RECEPTIONIST). Sem userIds nem roles = todos da clínica. */
  roles?: string[];
};

const SELECT = {
  id: true,
  tipo: true,
  prioridade: true,
  titulo: true,
  mensagem: true,
  href: true,
  lidaEm: true,
  createdAt: true,
} satisfies Prisma.NotificacaoSelect;

@Injectable()
export class NotificacoesService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(NotificacoesService.name);
  private timer?: ReturnType<typeof setInterval>;
  private primeiro?: ReturnType<typeof setTimeout>;
  private rodando = false;

  constructor(private readonly prisma: PrismaService) {}

  /* ── Agendador interno (sem dependências extras) ─────────────── */

  onModuleInit() {
    this.primeiro = setTimeout(() => void this.sincronizarTodos(), 30_000);
    this.timer = setInterval(() => void this.sincronizarTodos(), 10 * 60_000);
    this.primeiro.unref?.();
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.primeiro) clearTimeout(this.primeiro);
  }

  async sincronizarTodos() {
    if (this.rodando) return;
    this.rodando = true;
    try {
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
      for (const t of tenants) {
        try {
          await this.sincronizar(t.id);
        } catch (e) {
          this.log.warn(`Falha ao sincronizar alertas do tenant ${t.id}: ${(e as Error).message}`);
        }
      }
      // Higiene: remove notificações lidas com mais de 90 dias.
      await this.prisma.notificacao.deleteMany({
        where: { lidaEm: { not: null }, createdAt: { lt: new Date(Date.now() - 90 * DIA) } },
      });
    } finally {
      this.rodando = false;
    }
  }

  /* ── API para outros módulos ─────────────────────────────────── */

  /**
   * Cria uma notificação para os destinatários indicados.
   * Exemplo (em outro service):  await this.notificacoes.notificar({ tenantId, tipo: 'CRM', titulo: 'Novo lead', href: '/crm' });
   */
  async notificar(n: NovaNotificacao): Promise<number> {
    const tipo = n.tipo ?? 'SISTEMA';
    const ids = await this.destinatarios(n.tenantId, n.userIds, n.roles);
    if (!ids.length) return 0;

    const silenciados = await this.prisma.notificacaoPreferencia.findMany({
      where: { userId: { in: ids }, tipo, ativo: false },
      select: { userId: true },
    });
    const mute = new Set(silenciados.map((s) => s.userId));
    const alvo = ids.filter((id) => !mute.has(id));
    if (!alvo.length) return 0;

    const r = await this.prisma.notificacao.createMany({
      data: alvo.map((userId) => ({
        tenantId: n.tenantId,
        userId,
        tipo,
        prioridade: n.prioridade ?? 'NORMAL',
        titulo: n.titulo.slice(0, 160),
        mensagem: n.mensagem ? n.mensagem.slice(0, 500) : null,
        href: n.href ?? null,
        dedupeKey: n.dedupeKey ?? null,
      })),
      skipDuplicates: true,
    });
    return r.count;
  }

  private async destinatarios(tenantId: string, userIds?: string[], roles?: string[]) {
    const or: Prisma.UserWhereInput[] = [];
    if (userIds?.length) or.push({ id: { in: userIds } });
    if (roles?.length) or.push({ role: { in: roles } });
    const rows = await this.prisma.user.findMany({
      where: { tenantId, ...(or.length ? { OR: or } : {}) },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /* ── Consultas do usuário logado ─────────────────────────────── */

  /** Chamado a cada poucos segundos pelo frontend. Barato: um count + (opcional) as novas desde `since`. */
  async poll(tenantId: string, userId: string, since?: string) {
    const agora = new Date(); // tomado ANTES das consultas; o frontend deduplica por id
    const desde = since ? new Date(since) : null;
    const [naoLidas, novas] = await Promise.all([
      this.prisma.notificacao.count({ where: { tenantId, userId, lidaEm: null } }),
      desde && !isNaN(+desde)
        ? this.prisma.notificacao.findMany({
            where: { tenantId, userId, createdAt: { gt: desde } },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: SELECT,
          })
        : Promise.resolve([]),
    ]);
    return { agora: agora.toISOString(), naoLidas, novas };
  }

  async listar(tenantId: string, userId: string, q: Record<string, string | undefined>) {
    const take = Math.min(Math.max(Number(q.limit) || 30, 1), 100);
    const where: Prisma.NotificacaoWhereInput = { tenantId, userId };

    if (q.tipo && TIPOS.includes(q.tipo as NotificacaoTipo)) where.tipo = q.tipo as NotificacaoTipo;
    if (q.prioridade && PRIORIDADES.includes(q.prioridade as NotificacaoPrioridade)) {
      where.prioridade = q.prioridade as NotificacaoPrioridade;
    }
    if (q.status === 'nao-lidas') where.lidaEm = null;
    if (q.search?.trim()) {
      const contains = q.search.trim();
      where.OR = [
        { titulo: { contains, mode: 'insensitive' } },
        { mensagem: { contains, mode: 'insensitive' } },
      ];
    }
    if (q.before) {
      const d = new Date(q.before);
      if (!isNaN(+d)) where.createdAt = { lt: d };
    }

    const rows = await this.prisma.notificacao.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      select: SELECT,
    });
    return { data: rows.slice(0, take), hasMore: rows.length > take };
  }

  async resumo(tenantId: string, userId: string) {
    const base = { tenantId, userId };
    const [totais, naoLidasTipo, hoje, altas] = await Promise.all([
      this.prisma.notificacao.groupBy({ by: ['tipo'], where: base, _count: { _all: true } }),
      this.prisma.notificacao.groupBy({ by: ['tipo'], where: { ...base, lidaEm: null }, _count: { _all: true } }),
      this.prisma.notificacao.count({ where: { ...base, createdAt: { gte: inicioDoDia() } } }),
      this.prisma.notificacao.count({ where: { ...base, lidaEm: null, prioridade: { in: ['ALTA', 'CRITICA'] } } }),
    ]);

    const porTipo = Object.fromEntries(
      TIPOS.map((t) => [
        t,
        {
          total: totais.find((x) => x.tipo === t)?._count._all ?? 0,
          naoLidas: naoLidasTipo.find((x) => x.tipo === t)?._count._all ?? 0,
        },
      ]),
    );
    const total = Object.values(porTipo).reduce((s, x) => s + x.total, 0);
    const naoLidas = Object.values(porTipo).reduce((s, x) => s + x.naoLidas, 0);
    return { total, naoLidas, hoje, altas, porTipo };
  }

  async marcarLida(tenantId: string, userId: string, id: string, lida: boolean) {
    const r = await this.prisma.notificacao.updateMany({
      where: { id, tenantId, userId },
      data: { lidaEm: lida ? new Date() : null },
    });
    if (!r.count) throw new NotFoundException('Notificação não encontrada.');
    return this.prisma.notificacao.findFirst({ where: { id, userId }, select: SELECT });
  }

  async marcarTodas(tenantId: string, userId: string, tipo?: string) {
    const r = await this.prisma.notificacao.updateMany({
      where: {
        tenantId,
        userId,
        lidaEm: null,
        ...(tipo && TIPOS.includes(tipo as NotificacaoTipo) ? { tipo: tipo as NotificacaoTipo } : {}),
      },
      data: { lidaEm: new Date() },
    });
    return { atualizadas: r.count };
  }

  async remover(tenantId: string, userId: string, id: string) {
    const r = await this.prisma.notificacao.deleteMany({ where: { id, tenantId, userId } });
    if (!r.count) throw new NotFoundException('Notificação não encontrada.');
  }

  async limparLidas(tenantId: string, userId: string) {
    const r = await this.prisma.notificacao.deleteMany({ where: { tenantId, userId, lidaEm: { not: null } } });
    return { removidas: r.count };
  }

  async preferencias(userId: string) {
    const rows = await this.prisma.notificacaoPreferencia.findMany({ where: { userId } });
    return TIPOS.map((tipo) => ({ tipo, ativo: rows.find((r) => r.tipo === tipo)?.ativo ?? true }));
  }

  async definirPreferencia(userId: string, tipoBruto: unknown, ativo: unknown) {
    if (typeof tipoBruto !== 'string' || !TIPOS.includes(tipoBruto as NotificacaoTipo)) {
      throw new BadRequestException(`"tipo" deve ser um de: ${TIPOS.join(', ')}.`);
    }
    const tipo = tipoBruto as NotificacaoTipo;
    const valor = ativo === true || ativo === 'true';
    await this.prisma.notificacaoPreferencia.upsert({
      where: { userId_tipo: { userId, tipo } },
      update: { ativo: valor },
      create: { userId, tipo, ativo: valor },
    });
    return { tipo, ativo: valor };
  }

  /** Cria uma notificação de teste só para o usuário logado (útil para validar o tempo real). */
  async teste(tenantId: string, userId: string) {
    return this.notificar({
      tenantId,
      userIds: [userId],
      tipo: 'SISTEMA',
      prioridade: 'NORMAL',
      titulo: 'Notificação de teste',
      mensagem: 'Se você está vendo isto em outra página, as notificações em tempo real estão funcionando.',
      href: '/notificacoes',
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     ALERTAS AUTOMÁTICOS (rodam a cada 10 min; dedupeKey impede repetição)
     ═══════════════════════════════════════════════════════════════ */

  async sincronizar(tenantId: string): Promise<{ geradas: number }> {
    let geradas = 0;
    const passos = [
      this.alertasReavaliacoes,
      this.alertasAgenda,
      this.alertasFinanceiro,
      this.alertasLeads,
      this.alertasRecursos,
    ];
    for (const passo of passos) {
      try {
        geradas += await passo.call(this, tenantId);
      } catch (e) {
        this.log.warn(`${passo.name} falhou (tenant ${tenantId}): ${(e as Error).message}`);
      }
    }
    return { geradas };
  }

  private async alertasReavaliacoes(tenantId: string) {
    const hoje = inicioDoDia();
    const lista = await this.prisma.avaliacaoEstetica.findMany({
      where: {
        tenantId,
        status: 'CONCLUIDA',
        dataReavaliacao: { gte: new Date(hoje.getTime() - 60 * DIA), lte: new Date(hoje.getTime() + 3 * DIA) },
      },
      include: { cliente: { select: { name: true } } },
      take: 100,
    });

    let n = 0;
    for (const a of lista) {
      if (!a.dataReavaliacao) continue;
      const d = diasAte(a.dataReavaliacao);
      const fase = d < 0 ? 'vencida' : d === 0 ? 'hoje' : 'breve';
      const nome = a.cliente.name;
      n += await this.notificar({
        tenantId,
        tipo: 'CLINICA',
        prioridade: d < 0 ? 'ALTA' : 'NORMAL',
        titulo: d < 0 ? `Reavaliação vencida: ${nome}` : d === 0 ? `Reavaliação hoje: ${nome}` : `Reavaliação em ${d} dia(s): ${nome}`,
        mensagem: `Avaliação ${a.tipo.toLowerCase()} de ${dataBR(a.dataAvaliacao)}. Entre em contato para agendar o retorno.`,
        href: '/avaliacoes',
        dedupeKey: `reav-${a.id}-${fase}`,
        userIds: a.profissionalId ? [a.profissionalId] : undefined,
        roles: ['ADMIN'],
      });
    }
    return n;
  }

  private async alertasAgenda(tenantId: string) {
    const agora = new Date();
    const lista = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        type: 'APPOINTMENT',
        date: { gte: agora, lte: new Date(agora.getTime() + 45 * 60_000) },
        status: { notIn: STATUS_ENCERRADOS },
      },
      include: { patient: { select: { name: true } } },
      take: 100,
    });

    let n = 0;
    for (const ag of lista) {
      n += await this.notificar({
        tenantId,
        tipo: 'AGENDA',
        prioridade: 'ALTA',
        titulo: `Atendimento às ${hora(ag.date)}${ag.patient ? ` — ${ag.patient.name}` : ''}`,
        mensagem: ag.room ? `Sala: ${ag.room}.` : 'Seu próximo atendimento começa em breve.',
        href: '/agenda',
        dedupeKey: `ag-${ag.id}`,
        userIds: [ag.professionalId],
      });
    }
    return n;
  }

  private async alertasFinanceiro(tenantId: string) {
    const hoje = inicioDoDia();
    const fimHoje = new Date(hoje.getTime() + DIA - 1);
    const lista = await this.prisma.financialTransaction.findMany({
      where: {
        tenantId,
        status: 'PENDENTE',
        dueDate: { gte: new Date(hoje.getTime() - 30 * DIA), lte: fimHoje },
      },
      take: 100,
    });

    let n = 0;
    for (const t of lista) {
      const vencida = diasAte(t.dueDate) < 0;
      n += await this.notificar({
        tenantId,
        tipo: 'FINANCEIRO',
        prioridade: vencida ? 'ALTA' : 'NORMAL',
        titulo: `${vencida ? 'Conta vencida' : 'Vence hoje'}: ${t.description}`,
        mensagem: `${brl(Number(t.amount))} · vencimento ${dataBR(t.dueDate)}.`,
        href: '/financeiro',
        dedupeKey: `fin-${t.id}-${vencida ? 'vencida' : 'hoje'}`,
        roles: ['ADMIN'],
      });
    }
    return n;
  }

  private async alertasLeads(tenantId: string) {
    const lista = await this.prisma.lead.findMany({
      where: { tenantId, status: 'NOVO', createdAt: { gte: new Date(Date.now() - DIA) } },
      take: 50,
    });

    let n = 0;
    for (const l of lista) {
      n += await this.notificar({
        tenantId,
        tipo: 'CRM',
        titulo: `Novo lead: ${l.name}`,
        mensagem: [l.procedure && `Interesse: ${l.procedure}`, l.source && `Origem: ${l.source}`].filter(Boolean).join(' · ') || undefined,
        href: '/crm',
        dedupeKey: `lead-${l.id}`,
        roles: ['ADMIN', 'RECEPTIONIST'],
      });
    }
    return n;
  }

  /**
   * Estoque, documentos regulatórios e aparelhos.
   * Os models de Recursos usam "unidadeId"; aqui assumimos unidadeId === tenantId.
   * Se na sua base for diferente, o bloco simplesmente não encontra nada (não vaza dados).
   */
  private async alertasRecursos(tenantId: string) {
    const em30 = new Date(Date.now() + 30 * DIA);
    let n = 0;

    // Estoque baixo (soma dos lotes ≤ mínimo) e lotes vencendo
    const insumos = await this.prisma.insumo.findMany({
      where: { unidadeId: tenantId, ativo: true },
      select: { id: true, nome: true, estoqueMin: true, unidade: true, lotes: { select: { codigo: true, validade: true, qtd: true } } },
      take: 500,
    });
    const mes = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
    for (const i of insumos) {
      const total = i.lotes.reduce((s, l) => s + l.qtd, 0);
      if (i.estoqueMin > 0 && total <= i.estoqueMin) {
        n += await this.notificar({
          tenantId,
          tipo: 'ESTOQUE',
          prioridade: total === 0 ? 'CRITICA' : 'ALTA',
          titulo: total === 0 ? `Estoque zerado: ${i.nome}` : `Estoque baixo: ${i.nome}`,
          mensagem: `Restam ${total} ${i.unidade} (mínimo ${i.estoqueMin}).`,
          href: '/recursos',
          dedupeKey: `est-baixo-${i.id}-${mes}-${total === 0 ? 'zero' : 'baixo'}`,
          roles: ['ADMIN'],
        });
      }
      for (const l of i.lotes) {
        if (l.qtd <= 0 || l.validade > em30) continue;
        const d = diasAte(l.validade);
        if (d < -30) continue;
        const fase = estagio(d);
        n += await this.notificar({
          tenantId,
          tipo: 'ESTOQUE',
          prioridade: fase === '30d' ? 'NORMAL' : 'ALTA',
          titulo: d < 0 ? `Lote vencido: ${i.nome}` : `Lote vence em ${d} dia(s): ${i.nome}`,
          mensagem: `Lote ${l.codigo} · ${l.qtd} ${i.unidade} · validade ${dataBR(l.validade)}.`,
          href: '/recursos',
          dedupeKey: `lote-${i.id}-${l.codigo}-${fase}`,
          roles: ['ADMIN'],
        });
      }
    }

    // Documentos regulatórios
    const docs = await this.prisma.documentoRegulatorio.findMany({
      where: { unidadeId: tenantId, validade: { lte: em30 } },
      take: 100,
    });
    for (const d of docs) {
      const dias = diasAte(d.validade);
      if (dias < -30) continue;
      const fase = estagio(dias);
      n += await this.notificar({
        tenantId,
        tipo: 'ESTOQUE',
        prioridade: fase === '30d' ? 'NORMAL' : 'ALTA',
        titulo: dias < 0 ? `Documento vencido: ${d.nome}` : `Documento vence em ${dias} dia(s): ${d.nome}`,
        mensagem: `${d.orgao} · validade ${dataBR(d.validade)}.`,
        href: '/recursos',
        dedupeKey: `doc-${d.id}-${fase}`,
        roles: ['ADMIN'],
      });
    }

    // Calibração de aparelhos
    const aparelhos = await this.prisma.aparelho.findMany({
      where: { unidadeId: tenantId, proximaCalibracao: { not: null, lte: em30 } },
      take: 100,
    });
    for (const a of aparelhos) {
      if (!a.proximaCalibracao) continue;
      const dias = diasAte(a.proximaCalibracao);
      if (dias < -30) continue;
      const fase = estagio(dias);
      n += await this.notificar({
        tenantId,
        tipo: 'ESTOQUE',
        prioridade: fase === '30d' ? 'NORMAL' : 'ALTA',
        titulo: dias < 0 ? `Calibração vencida: ${a.nome}` : `Calibração em ${dias} dia(s): ${a.nome}`,
        mensagem: `Próxima calibração em ${dataBR(a.proximaCalibracao)}.`,
        href: '/recursos',
        dedupeKey: `cal-${a.id}-${fase}`,
        roles: ['ADMIN'],
      });
    }

    return n;
  }
}