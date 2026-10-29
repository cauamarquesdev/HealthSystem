import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Body = Record<string, unknown>;
const DIA = 86_400_000;

/* ── Sanitização (funciona mesmo sem ValidationPipe global) ───── */

const texto = (v: unknown, max = 4000): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

const inteiro = (v: unknown, min: number, max: number, campo: string): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new BadRequestException(`Valor inválido para "${campo}" (${min}–${max}).`);
  }
  return n;
};

const decimal = (v: unknown, min: number, max: number, campo: string): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new BadRequestException(`Valor inválido para "${campo}" (${min}–${max}).`);
  }
  return n;
};

const booleano = (v: unknown) => v === true || v === 'true';

const data = (v: unknown, campo: string): Date | null => {
  if (!v) return null;
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00.000Z`) : new Date(s);
  if (isNaN(+d)) throw new BadRequestException(`Data inválida em "${campo}".`);
  return d;
};

function camposProtocolo(b: Body) {
  const name = texto(b.name, 120);
  if (!name) throw new BadRequestException('Informe o nome do protocolo.');
  return {
    name,
    category: texto(b.category, 60) ?? 'Geral',
    objetivo: texto(b.objetivo),
    resultadoEsperado: texto(b.resultadoEsperado),
    indicacoes: texto(b.indicacoes),
    contraindicacoes: texto(b.contraindicacoes),
    cuidadosPre: texto(b.cuidadosPre),
    cuidadosPos: texto(b.cuidadosPos),
    observacoes: texto(b.observacoes),
    desconto: decimal(b.desconto, 0, 100, 'desconto') ?? 0,
    precoManual: decimal(b.precoManual, 0, 10_000_000, 'preço manual'),
    manutencaoDias: inteiro(b.manutencaoDias, 0, 3650, 'manutenção (dias)'),
  };
}

function camposEtapas(v: unknown) {
  if (!Array.isArray(v) || v.length === 0) {
    throw new BadRequestException('Adicione pelo menos uma etapa ao protocolo.');
  }
  if (v.length > 50) throw new BadRequestException('Um protocolo pode ter no máximo 50 etapas.');

  return v.map((raw, i) => {
    const e = (raw ?? {}) as Body;
    const n = i + 1;
    const titulo = texto(e.titulo, 160);
    if (!titulo) throw new BadRequestException(`Informe o título da etapa ${n}.`);
    return {
      ordem: n,
      titulo,
      descricao: texto(e.descricao),
      duracao: inteiro(e.duracao, 0, 1440, `duração da etapa ${n}`) ?? 0,
      intervaloDias: inteiro(e.intervaloDias, 0, 3650, `intervalo da etapa ${n}`) ?? 0,
      procedureId: texto(e.procedureId, 80),
      procedureNome: texto(e.procedureNome, 160),
      preco: decimal(e.preco, 0, 10_000_000, `preço da etapa ${n}`) ?? 0,
      orientacoes: texto(e.orientacoes),
    };
  });
}

/* ── Cálculos e mapeamentos ───────────────────────────────────── */

type EtapaNum = { duracao: number; intervaloDias: number; preco: number };

function totais(p: { etapas: EtapaNum[]; desconto: number; precoManual: number | null }) {
  const duracaoMin = p.etapas.reduce((s, e) => s + e.duracao, 0);
  const prazoDias = p.etapas.slice(0, -1).reduce((s, e) => s + e.intervaloDias, 0);
  const precoBase = p.etapas.reduce((s, e) => s + e.preco, 0);
  const precoFinal = p.precoManual ?? Math.round(precoBase * (1 - p.desconto / 100) * 100) / 100;
  return { etapas: p.etapas.length, duracaoMin, prazoDias, precoBase, precoFinal };
}

const INCLUDE = {
  etapas: { orderBy: { ordem: 'asc' } },
  _count: { select: { aplicacoes: true } },
} satisfies Prisma.ProtocoloInclude;

type Linha = Prisma.ProtocoloGetPayload<{ include: typeof INCLUDE }>;

const mapear = (p: Linha, emAndamento: number) => {
  const { _count, ...resto } = p;
  return { ...resto, totais: totais(p), usos: _count.aplicacoes, emAndamento };
};

const INCLUDE_APLIC = { patient: { select: { id: true, name: true, phone: true } } } satisfies Prisma.ProtocoloAplicacaoInclude;
type AplicRow = Prisma.ProtocoloAplicacaoGetPayload<{ include: typeof INCLUDE_APLIC }>;

const mapAplic = (a: AplicRow) => ({
  id: a.id,
  protocoloId: a.protocoloId,
  patientId: a.patientId,
  status: a.status,
  etapasConcluidas: a.etapasConcluidas,
  iniciadoEm: a.iniciadoEm,
  proximaEtapaEm: a.proximaEtapaEm,
  concluidoEm: a.concluidoEm,
  observacoes: a.observacoes,
  paciente: { id: a.patient.id, nome: a.patient.name, telefone: a.patient.phone },
});

/* ── Service ───────────────────────────────────────────────────── */

@Injectable()
export class ProtocolosService {
  constructor(private readonly prisma: PrismaService) {}

  private async buscarOuFalhar(tenantId: string, id: string) {
    const p = await this.prisma.protocolo.findFirst({ where: { id, tenantId }, include: INCLUDE });
    if (!p) throw new NotFoundException('Protocolo não encontrado.');
    return p;
  }

  private async emAndamento(protocoloId: string) {
    return this.prisma.protocoloAplicacao.count({ where: { protocoloId, status: 'EM_ANDAMENTO' } });
  }

  /** Confere os procedimentos vinculados no catálogo da clínica e grava o nome oficial. */
  private async vincular(tenantId: string, etapas: ReturnType<typeof camposEtapas>) {
    const ids = [...new Set(etapas.map((e) => e.procedureId).filter((x): x is string => !!x))];
    const achados = ids.length
      ? await this.prisma.procedure.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, name: true } })
      : [];
    const nomes = new Map(achados.map((p) => [p.id, p.name]));
    return etapas.map((e) =>
      e.procedureId && nomes.has(e.procedureId)
        ? { ...e, procedureNome: nomes.get(e.procedureId) ?? e.procedureNome }
        : { ...e, procedureId: null, procedureNome: e.procedureNome },
    );
  }

  /* Catálogo e busca de pacientes para os formulários */

  async procedimentos(tenantId: string) {
    return this.prisma.procedure.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true, category: true, duration: true, price: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async pacientes(tenantId: string, search?: string) {
    const rows = await this.prisma.patient.findMany({
      where: {
        tenantId,
        active: true,
        ...(search?.trim() ? { name: { contains: search.trim(), mode: 'insensitive' } } : {}),
      },
      select: { id: true, name: true, phone: true },
      orderBy: { name: 'asc' },
      take: 20,
    });
    return rows.map((r) => ({ id: r.id, nome: r.name, telefone: r.phone }));
  }

  /* Protocolos */

  async listar(tenantId: string) {
    const [rows, andamento] = await Promise.all([
      this.prisma.protocolo.findMany({ where: { tenantId }, include: INCLUDE, orderBy: { name: 'asc' }, take: 500 }),
      this.prisma.protocoloAplicacao.groupBy({
        by: ['protocoloId'],
        where: { tenantId, status: 'EM_ANDAMENTO' },
        _count: { _all: true },
      }),
    ]);
    const mapa = new Map(andamento.map((a) => [a.protocoloId, a._count._all]));
    return { data: rows.map((r) => mapear(r, mapa.get(r.id) ?? 0)) };
  }

  async obter(tenantId: string, id: string) {
    const p = await this.buscarOuFalhar(tenantId, id);
    const aplicacoes = await this.prisma.protocoloAplicacao.findMany({
      where: { protocoloId: id, tenantId },
      include: INCLUDE_APLIC,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
    const emAndamento = aplicacoes.filter((a) => a.status === 'EM_ANDAMENTO').length;
    return { ...mapear(p, emAndamento), aplicacoes: aplicacoes.map(mapAplic) };
  }

  async criar(tenantId: string, body: Body) {
    const campos = camposProtocolo(body);
    const etapas = await this.vincular(tenantId, camposEtapas(body.etapas));
    const criado = await this.prisma.protocolo.create({
      data: {
        ...campos,
        active: body.active === undefined ? true : booleano(body.active),
        tenantId,
        etapas: { create: etapas },
      },
      include: INCLUDE,
    });
    return mapear(criado, 0);
  }

  async atualizar(tenantId: string, id: string, body: Body) {
    await this.buscarOuFalhar(tenantId, id);
    const campos = camposProtocolo(body);
    const etapas = await this.vincular(tenantId, camposEtapas(body.etapas));

    const [, salvo] = await this.prisma.$transaction([
      this.prisma.protocoloEtapa.deleteMany({ where: { protocoloId: id } }),
      this.prisma.protocolo.update({
        where: { id },
        data: {
          ...campos,
          ...(body.active !== undefined ? { active: booleano(body.active) } : {}),
          etapas: { create: etapas },
        },
        include: INCLUDE,
      }),
    ]);
    return mapear(salvo, await this.emAndamento(id));
  }

  async alterarAtivo(tenantId: string, id: string, active: unknown) {
    await this.buscarOuFalhar(tenantId, id);
    const salvo = await this.prisma.protocolo.update({
      where: { id },
      data: { active: booleano(active) },
      include: INCLUDE,
    });
    return mapear(salvo, await this.emAndamento(id));
  }

  async duplicar(tenantId: string, id: string) {
    const o = await this.buscarOuFalhar(tenantId, id);
    const copia = await this.prisma.protocolo.create({
      data: {
        tenantId,
        name: `${o.name} (cópia)`.slice(0, 120),
        category: o.category,
        objetivo: o.objetivo,
        resultadoEsperado: o.resultadoEsperado,
        indicacoes: o.indicacoes,
        contraindicacoes: o.contraindicacoes,
        cuidadosPre: o.cuidadosPre,
        cuidadosPos: o.cuidadosPos,
        observacoes: o.observacoes,
        desconto: o.desconto,
        precoManual: o.precoManual,
        manutencaoDias: o.manutencaoDias,
        active: true,
        etapas: {
          create: o.etapas.map((e) => ({
            ordem: e.ordem,
            titulo: e.titulo,
            descricao: e.descricao,
            duracao: e.duracao,
            intervaloDias: e.intervaloDias,
            procedureId: e.procedureId,
            procedureNome: e.procedureNome,
            preco: e.preco,
            orientacoes: e.orientacoes,
          })),
        },
      },
      include: INCLUDE,
    });
    return mapear(copia, 0);
  }

  async excluir(tenantId: string, id: string) {
    const p = await this.buscarOuFalhar(tenantId, id);
    if (p._count.aplicacoes > 0) {
      throw new BadRequestException(
        'Este protocolo já foi aplicado a pacientes. Desative-o para preservar o histórico.',
      );
    }
    await this.prisma.protocolo.delete({ where: { id } });
  }

  /* Aplicação a pacientes */

  async aplicar(tenantId: string, protocoloId: string, body: Body) {
    const p = await this.buscarOuFalhar(tenantId, protocoloId);
    if (!p.active) throw new BadRequestException('Ative o protocolo antes de aplicá-lo a um paciente.');

    const patientId = texto(body.patientId, 80);
    if (!patientId) throw new BadRequestException('Selecione o paciente.');
    const paciente = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId }, select: { id: true } });
    if (!paciente) throw new BadRequestException('Paciente não encontrado nesta clínica.');

    const jaFazendo = await this.prisma.protocoloAplicacao.findFirst({
      where: { tenantId, protocoloId, patientId, status: 'EM_ANDAMENTO' },
      select: { id: true },
    });
    if (jaFazendo) throw new BadRequestException('Este paciente já está em andamento neste protocolo.');

    const iniciadoEm = data(body.iniciadoEm, 'iniciadoEm') ?? new Date();
    const criada = await this.prisma.protocoloAplicacao.create({
      data: {
        tenantId,
        protocoloId,
        patientId,
        iniciadoEm,
        proximaEtapaEm: iniciadoEm,
        observacoes: texto(body.observacoes),
      },
      include: INCLUDE_APLIC,
    });
    return mapAplic(criada);
  }

  /** acao: avancar (conclui a próxima etapa) | desfazer | cancelar | retomar */
  async acaoAplicacao(tenantId: string, id: string, acaoBruta: unknown) {
    const ap = await this.prisma.protocoloAplicacao.findFirst({
      where: { id, tenantId },
      include: {
        ...INCLUDE_APLIC,
        protocolo: {
          select: { manutencaoDias: true, etapas: { select: { intervaloDias: true }, orderBy: { ordem: 'asc' } } },
        },
      },
    });
    if (!ap) throw new NotFoundException('Acompanhamento não encontrado.');

    const etapas = ap.protocolo.etapas;
    const total = etapas.length;
    const agora = new Date();
    let dados: Prisma.ProtocoloAplicacaoUpdateInput;

    switch (acaoBruta) {
      case 'avancar': {
        if (ap.status !== 'EM_ANDAMENTO') throw new BadRequestException('Só é possível avançar um acompanhamento em andamento.');
        const feitas = ap.etapasConcluidas + 1;
        dados =
          feitas >= total
            ? {
                etapasConcluidas: total,
                status: 'CONCLUIDO',
                concluidoEm: agora,
                proximaEtapaEm: ap.protocolo.manutencaoDias ? new Date(agora.getTime() + ap.protocolo.manutencaoDias * DIA) : null,
              }
            : {
                etapasConcluidas: feitas,
                proximaEtapaEm: new Date(agora.getTime() + (etapas[feitas - 1]?.intervaloDias ?? 0) * DIA),
              };
        break;
      }
      case 'desfazer': {
        if (ap.etapasConcluidas <= 0) throw new BadRequestException('Nenhuma etapa concluída para desfazer.');
        dados = { etapasConcluidas: ap.etapasConcluidas - 1, status: 'EM_ANDAMENTO', concluidoEm: null, proximaEtapaEm: agora };
        break;
      }
      case 'cancelar': {
        if (ap.status === 'CANCELADO') throw new BadRequestException('Acompanhamento já cancelado.');
        dados = { status: 'CANCELADO', proximaEtapaEm: null };
        break;
      }
      case 'retomar': {
        if (ap.status !== 'CANCELADO') throw new BadRequestException('Só é possível retomar um acompanhamento cancelado.');
        dados = { status: 'EM_ANDAMENTO', proximaEtapaEm: agora };
        break;
      }
      default:
        throw new BadRequestException('Ação inválida. Use: avancar, desfazer, cancelar ou retomar.');
    }

    const salva = await this.prisma.protocoloAplicacao.update({ where: { id }, data: dados, include: INCLUDE_APLIC });
    return mapAplic(salva);
  }
}