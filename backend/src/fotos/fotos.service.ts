import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Body = Record<string, unknown>;

const DIA = 86_400_000;
/** Paciente fica "em acompanhamento" até N dias depois da primeira foto do procedimento. */
const JANELA_ACOMPANHAMENTO_DIAS = 45;

const CATEGORIAS = ['ANTES', 'EVOLUCAO', 'DEPOIS', 'EXAME', 'REFERENCIA', 'OUTRO'];
const PREFIXO_IMAGEM = /^data:image\/(jpeg|png|webp);base64,/;
const MAX_URL = 8_000_000; // ~6 MB de imagem
const MAX_THUMB = 200_000;

/* ── Datas (Brasil, UTC-3) ───────────────────────────────────── */

const diaUtc = (d: Date) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DIA);
const hojeBR = () => diaUtc(new Date(Date.now() - 3 * 3_600_000));

/* ── Sanitização (funciona mesmo sem ValidationPipe global) ───── */

const texto = (v: unknown, max = 500): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

const inteiroOpc = (v: unknown, min: number, max: number): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

const booleano = (v: unknown) => v === true || v === 'true';

const lista = (v: unknown, max = 10): string[] => {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((x) => texto(x, 30)).filter((x): x is string => !!x))].slice(0, max);
};

const dataFoto = (v: unknown): Date => {
  if (!v) return new Date(Date.now() - 3 * 3_600_000);
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00.000Z`) : new Date(s);
  if (isNaN(+d)) throw new BadRequestException('Data da foto inválida.');
  if (+d > Date.now() + DIA) throw new BadRequestException('A data da foto não pode estar no futuro.');
  return d;
};

const categoria = (v: unknown): string => {
  const s = texto(v, 20)?.toUpperCase() ?? 'OUTRO';
  if (!CATEGORIAS.includes(s)) throw new BadRequestException(`Categoria inválida. Use: ${CATEGORIAS.join(', ')}.`);
  return s;
};

/* ── Seleções ────────────────────────────────────────────────── */

const META = {
  id: true,
  patientId: true,
  category: true,
  region: true,
  description: true,
  procedimento: true,
  tags: true,
  favorite: true,
  takenAt: true,
  createdAt: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
  appointmentId: true,
} satisfies Prisma.PatientMediaSelect;

type Acomp = { procedimento: string | null; ancora: string; dias: number };

@Injectable()
export class FotosService {
  private readonly log = new Logger(FotosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Trilha de auditoria (LGPD). Nunca derruba a operação principal. */
  private async auditar(tenantId: string, userId: string | undefined, patientId: string, action: string, entityId?: string) {
    try {
      await this.prisma.recordAudit.create({
        data: { tenantId, patientId, action, entity: 'MEDIA', entityId: entityId ?? null, userId: userId ?? null },
      });
    } catch (e) {
      this.log.warn(`Falha ao registrar auditoria: ${(e as Error).message}`);
    }
  }

  private async garantirPaciente(tenantId: string, patientId: string) {
    const p = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId }, select: { id: true } });
    if (!p) throw new BadRequestException('Paciente não encontrado nesta clínica.');
  }

  /** Mapa paciente → acompanhamento ativo (procedimento mais recente dentro da janela). */
  private async acompanhamentos(tenantId: string): Promise<Map<string, Acomp>> {
    const pacientes = await this.prisma.patient.findMany({
      where: { tenantId },
      select: { id: true },
    });
    if (pacientes.length === 0) return new Map();

    const pacientesIds = pacientes.map(({ id }) => id);
    const mediaWhere: Prisma.PatientMediaWhereInput = {
      patientId: { in: pacientesIds },
    };

    const grupos = await (this.prisma.patientMedia.groupBy as any)({
      by: ['patientId', 'procedimento'],
      where: mediaWhere,
      _min: { takenAt: true },
    }) as Array<{
      patientId: string;
      procedimento: string | null;
      _min: { takenAt: Date | null };
    }>;
    const hoje = hojeBR();
    const mapa = new Map<string, Acomp>();
    for (const g of grupos) {
      const inicio = g._min.takenAt;
      if (!inicio) continue;
      const dias = hoje - diaUtc(inicio);
      if (dias < 0 || dias > JANELA_ACOMPANHAMENTO_DIAS) continue;
      const atual = mapa.get(g.patientId);
      if (!atual || dias < atual.dias) {
        mapa.set(g.patientId, { procedimento: g.procedimento, ancora: inicio.toISOString(), dias });
      }
    }
    return mapa;
  }

  /* ── Pacientes ───────────────────────────────────────────────── */

  async pacientes(tenantId: string, q: Record<string, string | undefined>) {
    const take = Math.min(Math.max(Number(q.limit) || 60, 1), 100);
    const filtro = q.filtro ?? 'ativos';
    const acomp = await this.acompanhamentos(tenantId);

    const where: Prisma.PatientWhereInput = { tenantId, active: true };
    if (q.search?.trim()) where.name = { contains: q.search.trim(), mode: 'insensitive' };
    if (filtro === 'ativos') where.id = { in: [...acomp.keys()] };
    else if (filtro === 'sem-fotos') where.media = { none: {} };
    else if (filtro === 'com-fotos') where.media = { some: {} };

    const rows = await this.prisma.patient.findMany({
      where,
      select: { id: true, name: true, tags: true, _count: { select: { media: true } } },
      orderBy: { name: 'asc' },
      take,
    });

    const ultimas = await Promise.all(
      rows.map((r) =>
        this.prisma.patientMedia.findFirst({
          where: { patientId: r.id },
          orderBy: { takenAt: 'desc' },
          select: { takenAt: true, thumb: true },
        }),
      ),
    );

    const data = rows.map((r, i) => ({
      id: r.id,
      nome: r.name,
      tags: r.tags,
      totalFotos: r._count.media,
      ultimaFotoEm: ultimas[i]?.takenAt ?? null,
      ultimaThumb: ultimas[i]?.thumb ?? null,
      acompanhamento: acomp.get(r.id) ?? null,
    }));
    if (filtro === 'ativos') data.sort((a, b) => (a.acompanhamento?.dias ?? 0) - (b.acompanhamento?.dias ?? 0));
    return { data };
  }

  async paciente(tenantId: string, id: string) {
    const p = await this.prisma.patient.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        avatar: true,
        tags: true,
        fototipo: true,
        skinTendency: true,
        allergies: true,
        birthDate: true,
      },
    });
    if (!p) throw new NotFoundException('Paciente não encontrado.');

    const mediaPacienteWhere: Prisma.PatientMediaWhereInput = { patientId: id };

    const [porCat, grupos, termo, ultimoAtend] = await Promise.all([
      this.prisma.patientMedia.groupBy({
        by: ['category'],
        where: mediaPacienteWhere as any,
        _count: { _all: true },
      }),
      this.prisma.patientMedia.groupBy({
        by: ['procedimento'],
        where: mediaPacienteWhere as any,
        _min: { takenAt: true },
        _max: { takenAt: true },
        _count: { _all: true },
      }),
      this.prisma.clinicalDocument.findFirst({
        where: { tenantId, patientId: id, type: 'TERMO_IMAGEM', signedAt: { not: null } },
        select: { id: true },
      }),
      this.prisma.appointment.findFirst({
        where: { tenantId, patientId: id, type: 'APPOINTMENT' },
        orderBy: { date: 'desc' },
        select: { professional: { select: { name: true } } },
      }),
    ]);

    return {
      id: p.id,
      nome: p.name,
      telefone: p.phone,
      avatar: p.avatar,
      tags: p.tags,
      fototipo: p.fototipo,
      tendenciaPele: p.skinTendency,
      alergias: p.allergies,
      nascimento: p.birthDate,
      codigo: `PAC-${p.id.slice(0, 4).toUpperCase()}`,
      termoImagem: !!termo,
      responsavel: ultimoAtend?.professional.name ?? null,
      total: porCat.reduce((s, c) => s + c._count._all, 0),
      porCategoria: Object.fromEntries(porCat.map((c) => [c.category, c._count._all])),
      procedimentos: grupos
        .filter((g) => g._min.takenAt && g._max.takenAt)
        .map((g) => ({ nome: g.procedimento, ancora: g._min.takenAt, ultima: g._max.takenAt, total: g._count._all }))
        .sort((a, b) => +new Date(b.ancora as Date) - +new Date(a.ancora as Date)),
    };
  }

  /** Atendimentos recentes, para vincular as fotos a um procedimento realizado. */
  async atendimentos(tenantId: string, patientId: string) {
    const rows = await this.prisma.appointment.findMany({
      where: { tenantId, patientId, type: 'APPOINTMENT' },
      orderBy: { date: 'desc' },
      take: 20,
      select: {
        id: true,
        date: true,
        status: true,
        procedure: { select: { name: true } },
        items: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });
    return rows.map((a) => ({
      id: a.id,
      date: a.date,
      status: a.status,
      procedimentos: a.items.length ? a.items.map((i) => i.name) : a.procedure ? [a.procedure.name] : [],
      profissional: a.professional.name,
    }));
  }

  /* ── Visão geral da clínica ──────────────────────────────────── */

  async resumo(tenantId: string) {
    const base: Prisma.PatientMediaWhereInput = { patient: { tenantId } };
    const inicioMes = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

    const [total, mes, soma, porPaciente, acomp] = await Promise.all([
      this.prisma.patientMedia.count({ where: base }),
      this.prisma.patientMedia.count({ where: { ...base, createdAt: { gte: inicioMes } } }),
      this.prisma.patientMedia.aggregate({ where: base, _sum: { sizeBytes: true } }),
      this.prisma.patientMedia.groupBy({ by: ['patientId'], where: base, _count: { _all: true } }),
      this.acompanhamentos(tenantId),
    ]);

    const ids = porPaciente.map((g) => g.patientId);
    const assinados = ids.length
      ? await this.prisma.clinicalDocument.findMany({
          where: { tenantId, patientId: { in: ids }, type: 'TERMO_IMAGEM', signedAt: { not: null } },
          select: { patientId: true },
          distinct: ['patientId'],
        })
      : [];
    const ok = new Set(assinados.map((a) => a.patientId));
    const semTermo = porPaciente.filter((g) => !ok.has(g.patientId));
    const totais = new Map(porPaciente.map((g) => [g.patientId, g._count._all]));

    const topAtivos = [...acomp.entries()].sort((a, b) => a[1].dias - b[1].dias).slice(0, 8);
    const nomesIds = [...new Set([...topAtivos.map(([id]) => id), ...semTermo.slice(0, 8).map((g) => g.patientId)])];
    const nomes = nomesIds.length
      ? await this.prisma.patient.findMany({ where: { id: { in: nomesIds }, tenantId }, select: { id: true, name: true, tags: true } })
      : [];
    const info = new Map(nomes.map((n) => [n.id, n]));

    const ultimas = await Promise.all(
      topAtivos.map(([id]) =>
        this.prisma.patientMedia.findFirst({ where: { patientId: id }, orderBy: { takenAt: 'desc' }, select: { takenAt: true, thumb: true } }),
      ),
    );

    return {
      totalFotos: total,
      pacientesComFotos: porPaciente.length,
      emAcompanhamento: acomp.size,
      semTermo: semTermo.length,
      mes,
      armazenamentoMb: Math.round(((soma._sum.sizeBytes ?? 0) / 1_048_576) * 10) / 10,
      acompanhamentos: topAtivos.map(([id, a], i) => ({
        id,
        nome: info.get(id)?.name ?? 'Paciente',
        tags: info.get(id)?.tags ?? [],
        totalFotos: totais.get(id) ?? 0,
        ultimaFotoEm: ultimas[i]?.takenAt ?? null,
        ultimaThumb: ultimas[i]?.thumb ?? null,
        acompanhamento: a,
      })),
      pendenciasTermo: semTermo.slice(0, 8).map((g) => ({
        id: g.patientId,
        nome: info.get(g.patientId)?.name ?? 'Paciente',
        total: g._count._all,
      })),
    };
  }

  /* ── Fotos ───────────────────────────────────────────────────── */

  /** Lista leve: traz só a miniatura, nunca a imagem inteira. */
  async listar(tenantId: string, q: Record<string, string | undefined>) {
    if (!q.patientId) throw new BadRequestException('Informe o paciente (patientId).');
    const where: Prisma.PatientMediaWhereInput = { patientId: q.patientId, patient: { tenantId } };
    if (q.categoria && CATEGORIAS.includes(q.categoria)) where.category = q.categoria;

    const rows = await this.prisma.patientMedia.findMany({
      where,
      select: { ...META, thumb: true },
      orderBy: [{ takenAt: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });

    // Fotos antigas (antes das miniaturas existirem): usa a própria imagem se for pequena.
    const semThumb = rows.filter((r) => !r.thumb).slice(0, 40).map((r) => r.id);
    const legadas = new Map<string, string>();
    if (semThumb.length) {
      const full = await this.prisma.patientMedia.findMany({ where: { id: { in: semThumb } }, select: { id: true, url: true } });
      full.forEach((f) => {
        if (f.url.length <= 150_000) legadas.set(f.id, f.url);
      });
    }

    return { data: rows.map((r) => ({ ...r, thumb: r.thumb ?? legadas.get(r.id) ?? null })) };
  }

  async obter(tenantId: string, userId: string | undefined, id: string) {
    const f = await this.prisma.patientMedia.findFirst({
      where: { id, patient: { tenantId } },
      select: { ...META, thumb: true, url: true },
    });
    if (!f) throw new NotFoundException('Foto não encontrada.');
    await this.auditar(tenantId, userId, f.patientId, 'VIEW', f.id);
    return f;
  }

  async criar(tenantId: string, userId: string | undefined, body: Body) {
    const patientId = texto(body.patientId, 80);
    if (!patientId) throw new BadRequestException('Selecione o paciente.');
    await this.garantirPaciente(tenantId, patientId);

    const url = typeof body.url === 'string' ? body.url : '';
    if (!PREFIXO_IMAGEM.test(url)) throw new BadRequestException('Envie uma imagem JPG, PNG ou WebP.');
    if (url.length > MAX_URL) throw new BadRequestException('Imagem muito grande (máximo ~6 MB após a compressão).');

    const thumb = typeof body.thumb === 'string' && PREFIXO_IMAGEM.test(body.thumb) && body.thumb.length <= MAX_THUMB ? body.thumb : null;

    let appointmentId = texto(body.appointmentId, 80);
    if (appointmentId) {
      const ag = await this.prisma.appointment.findFirst({ where: { id: appointmentId, tenantId, patientId }, select: { id: true } });
      if (!ag) appointmentId = null;
    }

    const criada = await this.prisma.patientMedia.create({
      data: {
        patientId,
        appointmentId,
        url,
        thumb,
        category: categoria(body.categoria),
        region: texto(body.regiao, 60),
        angle: texto(body.angulo, 40),
        procedimento: texto(body.procedimento, 160),
        description: texto(body.descricao, 500),
        tags: lista(body.tags),
        favorite: booleano(body.favorita),
        mimeType: texto(body.mimeType, 40),
        sizeBytes: inteiroOpc(body.sizeBytes, 0, 50_000_000),
        width: inteiroOpc(body.width, 1, 20_000),
        height: inteiroOpc(body.height, 1, 20_000),
        takenAt: dataFoto(body.takenAt),
        uploadedById: userId ?? null,
      },
      select: { ...META, thumb: true },
    });
    await this.auditar(tenantId, userId, patientId, 'CREATE', criada.id);
    return criada;
  }

  async atualizar(tenantId: string, userId: string | undefined, id: string, body: Body) {
    const atual = await this.prisma.patientMedia.findFirst({ where: { id, patient: { tenantId } }, select: { id: true, patientId: true } });
    if (!atual) throw new NotFoundException('Foto não encontrada.');

    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
    const data: Prisma.PatientMediaUpdateInput & { procedimento?: string | null } = {};
    if (has('categoria')) data.category = categoria(body.categoria);
    if (has('regiao')) data.region = texto(body.regiao, 60);
    if (has('angulo')) data.angle = texto(body.angulo, 40);
    if (has('procedimento')) data.procedimento = texto(body.procedimento, 160);
    if (has('descricao')) data.description = texto(body.descricao, 500);
    if (has('tags')) data.tags = lista(body.tags);
    if (has('favorita')) data.favorite = booleano(body.favorita);
    if (has('takenAt')) data.takenAt = dataFoto(body.takenAt);

    const salva = await this.prisma.patientMedia.update({ where: { id }, data, select: { ...META, thumb: true } });
    await this.auditar(tenantId, userId, atual.patientId, 'UPDATE', id);
    return salva;
  }

  /** Alteração em massa: categoria e/ou procedimento. */
  async atualizarLote(tenantId: string, userId: string | undefined, body: Body) {
    const ids = Array.isArray(body.ids) ? body.ids.map((x) => texto(x, 80)).filter((x): x is string => !!x) : [];
    if (!ids.length) throw new BadRequestException('Selecione ao menos uma foto.');
    if (ids.length > 200) throw new BadRequestException('Máximo de 200 fotos por operação.');

    const data: Prisma.PatientMediaUpdateManyMutationInput = {};
    if (body.categoria !== undefined) data.category = categoria(body.categoria);
    if (body.procedimento !== undefined) data.procedimento = texto(body.procedimento, 160);
    if (!Object.keys(data).length) throw new BadRequestException('Nada para atualizar.');

    const alvo = await this.prisma.patientMedia.findMany({ where: { id: { in: ids }, patient: { tenantId } }, select: { id: true, patientId: true } });
    const r = await this.prisma.patientMedia.updateMany({ where: { id: { in: alvo.map((a) => a.id) } }, data });
    await Promise.all(alvo.map((a) => this.auditar(tenantId, userId, a.patientId, 'UPDATE', a.id)));
    return { atualizadas: r.count };
  }

  async excluirLote(tenantId: string, userId: string | undefined, ids: string[]) {
    const lim = ids.slice(0, 200);
    const alvo = await this.prisma.patientMedia.findMany({ where: { id: { in: lim }, patient: { tenantId } }, select: { id: true, patientId: true } });
    if (!alvo.length) throw new NotFoundException('Nenhuma foto encontrada.');
    await this.prisma.patientMedia.deleteMany({ where: { id: { in: alvo.map((a) => a.id) } } });
    await Promise.all(alvo.map((a) => this.auditar(tenantId, userId, a.patientId, 'DELETE', a.id)));
    return { removidas: alvo.length };
  }
}