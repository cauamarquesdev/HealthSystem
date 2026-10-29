import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusAvaliacao, TipoAvaliacao } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/* ── Sanitização (funciona mesmo sem ValidationPipe global) ───── */

type Body = Record<string, unknown>;

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

const lista = (v: unknown, max = 30): string[] => {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((x) => texto(x, 80)).filter((x): x is string => !!x))].slice(0, max);
};

const data = (v: unknown, campo: string): Date | null => {
  if (!v) return null;
  const s = String(v);
  // "YYYY-MM-DD" vira meio-dia UTC para não "voltar um dia" por fuso horário
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00.000Z`) : new Date(s);
  if (isNaN(+d)) throw new BadRequestException(`Data inválida em "${campo}".`);
  return d;
};

const enumVal = <T extends string>(enumObj: Record<string, T>, v: unknown, campo: string): T => {
  const valores = Object.values(enumObj);
  if (typeof v !== 'string' || !valores.includes(v as T)) {
    throw new BadRequestException(`"${campo}" deve ser um de: ${valores.join(', ')}.`);
  }
  return v as T;
};

const medidas = (v: unknown) => {
  if (v === null || v === undefined) return Prisma.DbNull;
  if (typeof v !== 'object' || Array.isArray(v)) throw new BadRequestException('"medidas" inválido.');
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Body)) {
    if (val === '' || val === null || val === undefined) continue;
    const n = Number(val);
    if (Number.isFinite(n) && n >= 0 && n <= 1000) out[k.slice(0, 40)] = n;
  }
  return Object.keys(out).length ? out : Prisma.DbNull;
};

/** Whitelist: só campos conhecidos passam; ausentes não são alterados (serve para create e update). */
function sanitizar(b: Body): Body {
  const out: Body = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k);
  const set = (k: string, fn: (v: unknown) => unknown) => {
    if (has(k)) out[k] = fn(b[k]);
  };

  set('tipo', (v) => enumVal(TipoAvaliacao, v, 'tipo'));
  set('status', (v) => enumVal(StatusAvaliacao, v, 'status'));
  set('dataAvaliacao', (v) => data(v, 'dataAvaliacao') ?? new Date());
  set('profissionalNome', (v) => texto(v, 150));
  set('profissionalId', (v) => texto(v, 80));

  set('queixaPrincipal', (v) => texto(v));
  set('expectativas', (v) => texto(v));
  set('alergias', (v) => texto(v, 1000));
  set('medicamentos', (v) => texto(v, 1000));
  set('historicoProcedimentos', (v) => texto(v));
  set('gestanteLactante', booleano);
  set('tabagista', booleano);
  set('usaProtetorSolar', booleano);
  set('ingestaoAguaLitros', (v) => decimal(v, 0, 20, 'ingestaoAguaLitros'));

  set('fototipo', (v) => inteiro(v, 1, 6, 'fototipo'));
  set('tipoPele', (v) => texto(v, 40));
  set('glogau', (v) => inteiro(v, 1, 4, 'glogau'));
  set('condicoes', (v) => lista(v));
  set('hidratacao', (v) => inteiro(v, 0, 10, 'hidratacao'));
  set('oleosidade', (v) => inteiro(v, 0, 10, 'oleosidade'));
  set('elasticidade', (v) => inteiro(v, 0, 10, 'elasticidade'));

  set('pesoKg', (v) => decimal(v, 0, 500, 'pesoKg'));
  set('alturaCm', (v) => decimal(v, 0, 260, 'alturaCm'));
  set('celulite', (v) => inteiro(v, 0, 4, 'celulite'));
  set('medidas', medidas);

  set('procedimentosSugeridos', (v) => lista(v));
  set('sessoesPrevistas', (v) => inteiro(v, 0, 200, 'sessoesPrevistas'));
  set('intervaloDias', (v) => inteiro(v, 0, 365, 'intervaloDias'));
  set('valorEstimado', (v) => decimal(v, 0, 10_000_000, 'valorEstimado'));
  set('observacoes', (v) => texto(v));
  set('consentimentoAssinado', booleano);
  set('dataReavaliacao', (v) => data(v, 'dataReavaliacao'));

  return out;
}

type Registro = Prisma.AvaliacaoEsteticaGetPayload<{ include: { cliente: { select: { id: true; name: true; phone: true; fototipo: true; skinTendency: true; allergies: true } } } }>;

/** Mantém o contrato da API: o frontend recebe cliente.nome (o Patient guarda "name"). */
const mapear = (a: Registro) => ({
  ...a,
  cliente: mapCliente(a.cliente),
  valorEstimado: a.valorEstimado === null ? null : Number(a.valorEstimado),
});

const INCLUDE_CLIENTE = {
  cliente: { select: { id: true, name: true, phone: true, fototipo: true, skinTendency: true, allergies: true } },
} as const;

type ClienteRow = { id: string; name: string; phone: string | null; fototipo: string | null; skinTendency: string | null; allergies: string | null };

const mapCliente = (c: ClienteRow) => ({
  id: c.id,
  nome: c.name,
  telefone: c.phone,
  fototipo: c.fototipo,
  tendenciaPele: c.skinTendency,
  alergias: c.allergies,
});

/* ── Service ───────────────────────────────────────────────────── */

@Injectable()
export class AvaliacoesService {
  constructor(private readonly prisma: PrismaService) {}

  /* Regra de negócio: só conclui com a queixa principal preenchida */
  private validarConclusao(a: { queixaPrincipal?: string | null }) {
    if (!a.queixaPrincipal) {
      throw new BadRequestException('Para concluir, preencha a queixa principal.');
    }
  }

  /** Marca quais pacientes têm termo de procedimento assinado (fonte: Termos & Documentos). */
  private async comTermo(tenantId: string, registros: Registro[]) {
    const ids = [...new Set(registros.map((r) => r.clienteId))];
    const assinados = ids.length
      ? await this.prisma.clinicalDocument.findMany({
          where: { tenantId, patientId: { in: ids }, type: 'TERMO_PROCEDIMENTO', signedAt: { not: null } },
          select: { patientId: true },
          distinct: ['patientId'],
        })
      : [];
    const set = new Set(assinados.map((d) => d.patientId));
    return registros.map((r) => ({ ...mapear(r), termoAssinado: set.has(r.clienteId) }));
  }

  private async um(tenantId: string, registro: Registro) {
    return (await this.comTermo(tenantId, [registro]))[0];
  }

  /** Catálogo real de procedimentos da clínica, usado para montar o plano. */
  async procedimentos(tenantId: string) {
    return this.prisma.procedure.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true, category: true, duration: true, price: true, returnDays: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  private async buscarOuFalhar(tenantId: string, id: string) {
    const a = await this.prisma.avaliacaoEstetica.findFirst({
      where: { id, tenantId },
      include: INCLUDE_CLIENTE,
    });
    if (!a) throw new NotFoundException('Avaliação não encontrada.');
    return a;
  }

  private async garantirCliente(tenantId: string, clienteId: string) {
    const c = await this.prisma.patient.findFirst({ where: { id: clienteId, tenantId }, select: { id: true } });
    if (!c) throw new BadRequestException('Cliente não encontrado nesta clínica.');
  }

  /* Autocomplete de clientes para o formulário */
  async clientes(tenantId: string, search?: string) {
    const rows = await this.prisma.patient.findMany({
      where: {
        tenantId,
        active: true,
        ...(search?.trim() ? { name: { contains: search.trim(), mode: 'insensitive' } } : {}),
      },
      select: { id: true, name: true, phone: true, fototipo: true, skinTendency: true, allergies: true },
      orderBy: { name: 'asc' },
      take: 20,
    });
    return rows.map(mapCliente);
  }

  async listar(tenantId: string, q: Record<string, string | undefined>) {
    const where: Prisma.AvaliacaoEsteticaWhereInput = { tenantId };

    if (q.status && q.status !== 'TODAS') where.status = enumVal(StatusAvaliacao, q.status, 'status');
    if (q.tipo && q.tipo !== 'TODOS') where.tipo = enumVal(TipoAvaliacao, q.tipo, 'tipo');
    if (q.clienteId) where.clienteId = q.clienteId;

    if (q.de || q.ate) {
      where.dataAvaliacao = {
        ...(q.de ? { gte: data(q.de, 'de')! } : {}),
        ...(q.ate ? { lte: data(q.ate, 'ate')! } : {}),
      };
    }

    if (q.search?.trim()) {
      const contains = q.search.trim();
      where.OR = [
        { cliente: { name: { contains, mode: 'insensitive' } } },
        { profissionalNome: { contains, mode: 'insensitive' } },
        { queixaPrincipal: { contains, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(Math.max(Number(q.limit) || 100, 1), 500);

    const [rows, total] = await Promise.all([
      this.prisma.avaliacaoEstetica.findMany({
        where,
        include: INCLUDE_CLIENTE,
        orderBy: [{ dataAvaliacao: 'desc' }, { createdAt: 'desc' }],
        take,
      }),
      this.prisma.avaliacaoEstetica.count({ where }),
    ]);

    return { data: await this.comTermo(tenantId, rows), total };
  }

  async resumo(tenantId: string) {
    const agora = new Date();
    const hoje = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()));
    const inicioMes = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), 1));
    const em30 = new Date(hoje.getTime() + 30 * 86_400_000);
    const ativas = { tenantId, status: { not: StatusAvaliacao.ARQUIVADA } };

    const [porStatus, mes, vencidas, proximas, soma] = await Promise.all([
      this.prisma.avaliacaoEstetica.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }),
      this.prisma.avaliacaoEstetica.count({ where: { ...ativas, dataAvaliacao: { gte: inicioMes } } }),
      this.prisma.avaliacaoEstetica.count({
        where: { tenantId, status: StatusAvaliacao.CONCLUIDA, dataReavaliacao: { lt: hoje } },
      }),
      this.prisma.avaliacaoEstetica.count({
        where: { tenantId, status: StatusAvaliacao.CONCLUIDA, dataReavaliacao: { gte: hoje, lte: em30 } },
      }),
      this.prisma.avaliacaoEstetica.aggregate({
        where: { tenantId, status: StatusAvaliacao.CONCLUIDA },
        _sum: { valorEstimado: true },
      }),
    ]);

    const c = (s: StatusAvaliacao) => porStatus.find((x) => x.status === s)?._count._all ?? 0;
    const rascunhos = c('RASCUNHO');
    const concluidas = c('CONCLUIDA');
    const arquivadas = c('ARQUIVADA');

    return {
      total: rascunhos + concluidas + arquivadas,
      mes,
      rascunhos,
      concluidas,
      arquivadas,
      reavaliacoesVencidas: vencidas,
      reavaliacoesProximas: proximas,
      valorPlanos: Number(soma._sum.valorEstimado ?? 0),
    };
  }

  async obter(tenantId: string, id: string) {
    return this.um(tenantId, await this.buscarOuFalhar(tenantId, id));
  }

  async criar(tenantId: string, usuario: { id?: string; nome?: string } | undefined, body: Body) {
    const clienteId = texto(body.clienteId, 80);
    if (!clienteId) throw new BadRequestException('Selecione o cliente.');
    await this.garantirCliente(tenantId, clienteId);

    const dados = sanitizar(body);
    if (dados.status === StatusAvaliacao.CONCLUIDA) this.validarConclusao(dados as never);

    const criada = await this.prisma.avaliacaoEstetica.create({
      data: {
        ...(dados as Prisma.AvaliacaoEsteticaUncheckedCreateInput),
        tenantId,
        clienteId,
        profissionalId: (dados.profissionalId as string | null) ?? usuario?.id ?? null,
        profissionalNome: (dados.profissionalNome as string | null) ?? usuario?.nome ?? null,
      },
      include: INCLUDE_CLIENTE,
    });
    return this.um(tenantId, criada);
  }

  async atualizar(tenantId: string, id: string, body: Body) {
    const atual = await this.buscarOuFalhar(tenantId, id);
    const dados = sanitizar(body);

    const novoClienteId = texto(body.clienteId, 80);
    if (novoClienteId && novoClienteId !== atual.clienteId) {
      await this.garantirCliente(tenantId, novoClienteId);
      dados.clienteId = novoClienteId;
    }

    const resultante = { ...atual, ...dados } as { status: StatusAvaliacao; queixaPrincipal?: string | null; consentimentoAssinado?: boolean };
    if (resultante.status === StatusAvaliacao.CONCLUIDA) this.validarConclusao(resultante);

    const salva = await this.prisma.avaliacaoEstetica.update({
      where: { id },
      data: dados as Prisma.AvaliacaoEsteticaUncheckedUpdateInput,
      include: INCLUDE_CLIENTE,
    });
    return this.um(tenantId, salva);
  }

  async alterarStatus(tenantId: string, id: string, statusBruto: unknown) {
    const status = enumVal(StatusAvaliacao, statusBruto, 'status');
    const atual = await this.buscarOuFalhar(tenantId, id);
    if (status === StatusAvaliacao.CONCLUIDA) this.validarConclusao(atual);

    const salva = await this.prisma.avaliacaoEstetica.update({
      where: { id },
      data: { status },
      include: INCLUDE_CLIENTE,
    });
    return this.um(tenantId, salva);
  }

  /** Cria um novo rascunho a partir de uma avaliação existente (reavaliação / retorno). */
  async duplicar(tenantId: string, id: string, usuario: { id?: string; nome?: string } | undefined) {
    const o = await this.buscarOuFalhar(tenantId, id);
    const { id: _id, createdAt: _c, updatedAt: _u, cliente: _cl, ...resto } = o;
    void _id; void _c; void _u; void _cl;

    const nova = await this.prisma.avaliacaoEstetica.create({
      data: {
        ...resto,
        medidas: resto.medidas === null ? Prisma.DbNull : (resto.medidas as Prisma.InputJsonValue),
        status: StatusAvaliacao.RASCUNHO,
        dataAvaliacao: new Date(),
        consentimentoAssinado: false,
        dataReavaliacao: null,
        profissionalId: usuario?.id ?? resto.profissionalId,
        profissionalNome: usuario?.nome ?? resto.profissionalNome,
      },
      include: INCLUDE_CLIENTE,
    });
    return this.um(tenantId, nova);
  }

  async excluir(tenantId: string, id: string) {
    await this.buscarOuFalhar(tenantId, id);
    await this.prisma.avaliacaoEstetica.delete({ where: { id } });
  }
}