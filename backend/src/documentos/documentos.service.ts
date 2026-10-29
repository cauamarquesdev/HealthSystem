import {
  BadRequestException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
// Integração opcional: avisa a equipe quando o paciente assina pelo link. Remova estas 2 linhas (e o @Optional abaixo) se não usar notificações.
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { MODELOS_PADRAO } from './documentos.modelos-padrao';

type Body = Record<string, unknown>;
type Meta = { ip?: string; userAgent?: string };

const DIA = 86_400_000;
const TIPOS = ['TERMO_PROCEDIMENTO', 'TERMO_IMAGEM', 'TERMO_LGPD', 'ATESTADO', 'DECLARACAO', 'ORIENTACOES', 'CONTRATO', 'OUTRO'];
const STATUS = ['RASCUNHO', 'PENDENTE', 'ASSINADO', 'VENCIDO', 'CANCELADO'];

/** Documentos que toda a base de pacientes deveria ter assinados (painel de Conformidade). */
const REQUISITOS = [
  { tipo: 'TERMO_LGPD', label: 'Termo de tratamento de dados (LGPD)' },
  { tipo: 'TERMO_IMAGEM', label: 'Autorização de uso de imagem' },
];

const MAX_CONTEUDO = 100_000;
const MAX_ASSINATURA = 400_000;
const MAX_ARQUIVO = 8_000_000; // ~6 MB
const PREFIXO_ARQUIVO = /^data:(application\/pdf|image\/(jpeg|png|webp));base64,/;
const PREFIXO_PNG = /^data:image\/png;base64,/;

/* ── Sanitização ─────────────────────────────────────────────── */

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

const tipoValido = (v: unknown): string => {
  const s = texto(v, 30)?.toUpperCase() ?? 'OUTRO';
  if (!TIPOS.includes(s)) throw new BadRequestException(`Tipo inválido. Use: ${TIPOS.join(', ')}.`);
  return s;
};

const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '');

function validarCpf(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (base: string, pesoIni: number) => {
    const soma = base.split('').reduce((s, d, i) => s + Number(d) * (pesoIni - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(cpf.slice(0, 9), 10) === Number(cpf[9]) && calc(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

const formatarCpf = (v?: string | null) => {
  const d = soDigitos(v);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : v ?? '';
};

const mascararCpf = (v?: string | null) => {
  const d = soDigitos(v);
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : null;
};

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/* ── Variáveis do texto ──────────────────────────────────────── */

const REGEX_VAR = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function resolver(conteudo: string, ctx: Record<string, string>, custom: Record<string, string>) {
  return conteudo.replace(REGEX_VAR, (original, nome: string) => {
    const v = ctx[nome] ?? custom[nome];
    return v !== undefined && v !== '' ? v : original;
  });
}

const temVariavelPendente = (s: string) => /\{\{[^}]+\}\}/.test(s);

function variaveisCustom(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Body)) {
    const s = texto(val, 300);
    if (s && /^[a-zA-Z0-9_.]{1,60}$/.test(k)) out[k] = s;
  }
  return out;
}

const fmtData = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const fmtExtenso = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const fmtHora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

/* ── Status calculado ────────────────────────────────────────── */

type Statusavel = {
  signedAt: Date | null;
  canceledAt: Date | null;
  expiresAt: Date | null;
  signToken: string | null;
  signTokenExpiresAt: Date | null;
};

function statusDe(d: Statusavel, agora = new Date()): string {
  if (d.canceledAt) return 'CANCELADO';
  if (d.signedAt) return d.expiresAt && d.expiresAt < agora ? 'VENCIDO' : 'ASSINADO';
  if (d.signToken && d.signTokenExpiresAt && d.signTokenExpiresAt > agora) return 'PENDENTE';
  return 'RASCUNHO';
}

function filtroStatus(status: string, agora: Date): Prisma.ClinicalDocumentWhereInput | null {
  switch (status) {
    case 'RASCUNHO':
      return { signedAt: null, canceledAt: null, OR: [{ signToken: null }, { signTokenExpiresAt: { lte: agora } }] };
    case 'PENDENTE':
      return { signedAt: null, canceledAt: null, signToken: { not: null }, signTokenExpiresAt: { gt: agora } };
    case 'ASSINADO':
      return { signedAt: { not: null }, canceledAt: null, OR: [{ expiresAt: null }, { expiresAt: { gte: agora } }] };
    case 'VENCIDO':
      return { signedAt: { not: null }, canceledAt: null, expiresAt: { lt: agora } };
    case 'CANCELADO':
      return { canceledAt: { not: null } };
    default:
      return null;
  }
}

/* ── Seleções e mapeamentos ──────────────────────────────────── */

const LISTA_SELECT = {
  id: true,
  type: true,
  title: true,
  createdAt: true,
  signedAt: true,
  expiresAt: true,
  canceledAt: true,
  signerName: true,
  signerMethod: true,
  signToken: true,
  signTokenExpiresAt: true,
  fileName: true,
  patient: { select: { id: true, name: true } },
  template: { select: { name: true } },
  user: { select: { name: true } },
} satisfies Prisma.ClinicalDocumentSelect;

type LinhaLista = Prisma.ClinicalDocumentGetPayload<{ select: typeof LISTA_SELECT }>;

const mapItem = (d: LinhaLista, agora = new Date()) => {
  const status = statusDe(d, agora);
  return {
    id: d.id,
    type: d.type,
    title: d.title,
    status,
    patient: { id: d.patient.id, nome: d.patient.name },
    templateName: d.template?.name ?? null,
    createdAt: d.createdAt,
    signedAt: d.signedAt,
    expiresAt: d.expiresAt,
    canceledAt: d.canceledAt,
    signerName: d.signerName,
    signerMethod: d.signerMethod,
    temArquivo: !!d.fileName,
    linkExpiraEm: status === 'PENDENTE' ? d.signTokenExpiresAt : null,
    criadoPor: d.user.name,
  };
};

const DETALHE_SELECT = {
  ...LISTA_SELECT,
  content: true,
  updatedAt: true,
  validityDays: true,
  canceledReason: true,
  signerCpf: true,
  signerIp: true,
  signerUserAgent: true,
  signatureData: true,
  signatureHash: true,
  fileData: true,
  fileMime: true,
  fileSize: true,
  patient: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.ClinicalDocumentSelect;

type LinhaDetalhe = Prisma.ClinicalDocumentGetPayload<{ select: typeof DETALHE_SELECT }>;

const mapDetalhe = (d: LinhaDetalhe) => {
  const base = mapItem(d as unknown as LinhaLista);
  return {
    ...base,
    patient: { id: d.patient.id, nome: d.patient.name, telefone: d.patient.phone },
    content: d.content,
    updatedAt: d.updatedAt,
    validityDays: d.validityDays,
    canceledReason: d.canceledReason,
    signerCpfMascarado: mascararCpf(d.signerCpf),
    signerIp: d.signerIp,
    signerUserAgent: d.signerUserAgent,
    signatureData: d.signatureData,
    signatureHash: d.signatureHash,
    fileName: d.fileName,
    fileMime: d.fileMime,
    fileSize: d.fileSize,
    fileData: d.fileData,
    linkToken: base.status === 'PENDENTE' ? d.signToken : null,
  };
};

type ParaHash = {
  id: string;
  content: string;
  signerName: string;
  signerCpf: string | null;
  signedAt: Date;
  signatureData: string | null;
  fileData: string | null;
};

const calcularHash = (d: ParaHash) =>
  sha256(
    [d.id, d.content, d.signerName, d.signerCpf ?? '', d.signedAt.toISOString(), d.signatureData ? sha256(d.signatureData) : '', d.fileData ? sha256(d.fileData) : ''].join('|'),
  );

/* ── Service ─────────────────────────────────────────────────── */

@Injectable()
export class DocumentosService {
  private readonly log = new Logger(DocumentosService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificacoes?: NotificacoesService,
  ) {}

  private async auditar(tenantId: string, userId: string | undefined, patientId: string, action: string, entityId: string) {
    try {
      await this.prisma.recordAudit.create({
        data: { tenantId, patientId, action, entity: 'DOCUMENT', entityId, userId: userId ?? null },
      });
    } catch (e) {
      this.log.warn(`Falha ao registrar auditoria: ${(e as Error).message}`);
    }
  }

  private async paciente(tenantId: string, id: string) {
    const p = await this.prisma.patient.findFirst({
      where: { id, tenantId },
      select: { id: true, name: true, cpf: true, birthDate: true, phone: true, email: true },
    });
    if (!p) throw new BadRequestException('Paciente não encontrado nesta clínica.');
    return p;
  }

  private async contexto(tenantId: string, userId: string | undefined, p: { name: string; cpf: string | null; birthDate: Date | null; phone: string; email: string | null }) {
    const [tenant, usuario] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      userId ? this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }) : null,
    ]);
    const agora = new Date();
    return {
      'paciente.nome': p.name,
      'paciente.cpf': formatarCpf(p.cpf) || '—',
      'paciente.nascimento': p.birthDate ? fmtData(p.birthDate) : '—',
      'paciente.telefone': p.phone,
      'paciente.email': p.email ?? '—',
      'clinica.nome': tenant?.name ?? '',
      'profissional.nome': usuario?.name ?? '',
      data: fmtData(agora),
      'data.extenso': fmtExtenso(agora),
      hora: fmtHora(agora),
    } as Record<string, string>;
  }

  private async buscar(tenantId: string, id: string) {
    const d = await this.prisma.clinicalDocument.findFirst({ where: { id, tenantId } });
    if (!d) throw new NotFoundException('Documento não encontrado.');
    return d;
  }

  private async detalhe(tenantId: string, id: string) {
    const d = await this.prisma.clinicalDocument.findFirst({ where: { id, tenantId }, select: DETALHE_SELECT });
    if (!d) throw new NotFoundException('Documento não encontrado.');
    return mapDetalhe(d);
  }

  /* ── Pacientes (busca para os formulários) ─────────────────── */

  async pacientes(tenantId: string, search?: string) {
    const rows = await this.prisma.patient.findMany({
      where: {
        tenantId,
        active: true,
        ...(search?.trim() ? { name: { contains: search.trim(), mode: 'insensitive' } } : {}),
      },
      select: { id: true, name: true, phone: true, cpf: true, birthDate: true, email: true },
      orderBy: { name: 'asc' },
      take: 20,
    });
    return rows.map((r) => ({
      id: r.id,
      nome: r.name,
      telefone: r.phone,
      cpf: formatarCpf(r.cpf) || null,
      nascimento: r.birthDate ? fmtData(r.birthDate) : null,
      email: r.email,
    }));
  }

  /* ── Listagem e indicadores ────────────────────────────────── */

  async listar(tenantId: string, q: Record<string, string | undefined>) {
    const take = Math.min(Math.max(Number(q.limit) || 50, 1), 200);
    const agora = new Date();
    const and: Prisma.ClinicalDocumentWhereInput[] = [{ tenantId }];

    if (q.status && STATUS.includes(q.status)) {
      const f = filtroStatus(q.status, agora);
      if (f) and.push(f);
    }
    if (q.tipo && TIPOS.includes(q.tipo)) and.push({ type: q.tipo });
    if (q.patientId) and.push({ patientId: q.patientId });
    if (q.search?.trim()) {
      const contains = q.search.trim();
      and.push({ OR: [{ title: { contains, mode: 'insensitive' } }, { patient: { name: { contains, mode: 'insensitive' } } }] });
    }

    const where: Prisma.ClinicalDocumentWhereInput = { AND: and };
    const [rows, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({ where, select: LISTA_SELECT, orderBy: { createdAt: 'desc' }, take }),
      this.prisma.clinicalDocument.count({ where }),
    ]);
    return { data: rows.map((r) => mapItem(r, agora)), total };
  }

  async resumo(tenantId: string) {
    const agora = new Date();
    const inicioMes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));
    const contar = (status: string) => {
      const f = filtroStatus(status, agora);
      return this.prisma.clinicalDocument.count({ where: { tenantId, ...(f ?? {}) } });
    };

    const [total, rascunhos, pendentes, assinados, vencidos, cancelados, assinadosMes, vencendo30, conf] = await Promise.all([
      this.prisma.clinicalDocument.count({ where: { tenantId } }),
      contar('RASCUNHO'),
      contar('PENDENTE'),
      contar('ASSINADO'),
      contar('VENCIDO'),
      contar('CANCELADO'),
      this.prisma.clinicalDocument.count({ where: { tenantId, signedAt: { gte: inicioMes }, canceledAt: null } }),
      this.prisma.clinicalDocument.count({
        where: { tenantId, signedAt: { not: null }, canceledAt: null, expiresAt: { gte: agora, lte: new Date(+agora + 30 * DIA) } },
      }),
      this.conformidade(tenantId, false),
    ]);

    return { total, rascunhos, pendentes, assinados, vencidos, cancelados, assinadosMes, vencendo30, conformidade: conf.percentualGeral };
  }

  /** Cobertura dos documentos obrigatórios na base de pacientes ativos. */
  async conformidade(tenantId: string, comLista = true) {
    const agora = new Date();
    const totalPacientes = await this.prisma.patient.count({ where: { tenantId, active: true } });
    const valido = (tipo: string): Prisma.ClinicalDocumentWhereInput => ({
      type: tipo,
      signedAt: { not: null },
      canceledAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gte: agora } }],
    });

    const requisitos = await Promise.all(
      REQUISITOS.map(async (r) => {
        const assinados = await this.prisma.patient.count({ where: { tenantId, active: true, documents: { some: valido(r.tipo) } } });
        const pendentes = comLista
          ? await this.prisma.patient.findMany({
              where: { tenantId, active: true, NOT: { documents: { some: valido(r.tipo) } } },
              select: {
                id: true,
                name: true,
                phone: true,
                documents: {
                  where: { type: r.tipo, signedAt: null, canceledAt: null, signToken: { not: null }, signTokenExpiresAt: { gt: agora } },
                  select: { id: true },
                  take: 1,
                },
              },
              orderBy: { name: 'asc' },
              take: 12,
            })
          : [];
        return {
          tipo: r.tipo,
          label: r.label,
          assinados,
          faltando: Math.max(0, totalPacientes - assinados),
          percentual: totalPacientes ? Math.round((assinados / totalPacientes) * 100) : 100,
          pendentes: pendentes.map((p) => ({ id: p.id, nome: p.name, telefone: p.phone, temLink: p.documents.length > 0 })),
        };
      }),
    );

    const percentualGeral = requisitos.length ? Math.round(requisitos.reduce((s, r) => s + r.percentual, 0) / requisitos.length) : 100;
    return { totalPacientes, percentualGeral, requisitos };
  }

  /* ── CRUD de documentos ────────────────────────────────────── */

  async obter(tenantId: string, userId: string | undefined, id: string) {
    const d = await this.detalhe(tenantId, id);
    await this.auditar(tenantId, userId, d.patient.id, 'VIEW', id);
    return d;
  }

  async criar(tenantId: string, userId: string | undefined, body: Body) {
    const pac = await this.paciente(tenantId, texto(body.patientId, 80) ?? '');

    const templateId = texto(body.templateId, 80);
    const modelo = templateId ? await this.prisma.documentTemplate.findFirst({ where: { id: templateId, tenantId } }) : null;
    if (templateId && !modelo) throw new BadRequestException('Modelo não encontrado.');

    const title = texto(body.title, 160) ?? modelo?.name;
    if (!title) throw new BadRequestException('Informe o título do documento.');
    const bruto = typeof body.content === 'string' ? body.content : modelo?.content ?? '';
    if (!bruto.trim()) throw new BadRequestException('O documento precisa ter conteúdo.');
    if (bruto.length > MAX_CONTEUDO) throw new BadRequestException('Conteúdo muito longo.');

    const ctx = await this.contexto(tenantId, userId, pac);
    const content = resolver(bruto, ctx, variaveisCustom(body.variaveis));

    const criado = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: pac.id,
        userId: userId ?? '',
        templateId: modelo?.id ?? null,
        type: tipoValido(body.type ?? modelo?.type),
        title,
        content,
        validityDays: inteiroOpc(body.validityDays, 1, 3650) ?? modelo?.validityDays ?? null,
      },
      select: { id: true },
    });
    await this.auditar(tenantId, userId, pac.id, 'CREATE', criado.id);
    return this.detalhe(tenantId, criado.id);
  }

  async atualizar(tenantId: string, userId: string | undefined, id: string, body: Body) {
    const d = await this.buscar(tenantId, id);
    if (d.signedAt) throw new BadRequestException('Documento assinado não pode ser alterado. Cancele-o e gere um novo.');
    if (d.canceledAt) throw new BadRequestException('Documento cancelado não pode ser alterado.');

    const data: Prisma.ClinicalDocumentUpdateInput = {};
    if (body.title !== undefined) {
      const t = texto(body.title, 160);
      if (!t) throw new BadRequestException('Informe o título do documento.');
      data.title = t;
    }
    if (body.type !== undefined) data.type = tipoValido(body.type);
    if (body.validityDays !== undefined) data.validityDays = inteiroOpc(body.validityDays, 1, 3650);
    if (body.content !== undefined) {
      const c = String(body.content);
      if (!c.trim()) throw new BadRequestException('O documento precisa ter conteúdo.');
      if (c.length > MAX_CONTEUDO) throw new BadRequestException('Conteúdo muito longo.');
      const pac = await this.paciente(tenantId, d.patientId);
      data.content = resolver(c, await this.contexto(tenantId, userId, pac), variaveisCustom(body.variaveis));
      // editar o texto invalida um link já enviado: o paciente precisa ver a versão final
      data.signToken = null;
      data.signTokenExpiresAt = null;
    }

    await this.prisma.clinicalDocument.update({ where: { id }, data });
    await this.auditar(tenantId, userId, d.patientId, 'UPDATE', id);
    return this.detalhe(tenantId, id);
  }

  async excluir(tenantId: string, userId: string | undefined, id: string) {
    const d = await this.buscar(tenantId, id);
    if (d.signedAt) throw new BadRequestException('Documento assinado não pode ser excluído (guarda legal). Use "Cancelar / revogar".');
    await this.prisma.clinicalDocument.delete({ where: { id } });
    await this.auditar(tenantId, userId, d.patientId, 'DELETE', id);
  }

  async cancelar(tenantId: string, userId: string | undefined, id: string, motivo: unknown) {
    const d = await this.buscar(tenantId, id);
    if (d.canceledAt) throw new BadRequestException('Documento já cancelado.');
    const m = texto(motivo, 300);
    if (!m) throw new BadRequestException('Informe o motivo do cancelamento.');
    await this.prisma.clinicalDocument.update({
      where: { id },
      data: { canceledAt: new Date(), canceledReason: m, signToken: null, signTokenExpiresAt: null },
    });
    await this.auditar(tenantId, userId, d.patientId, 'UPDATE', id);
    return this.detalhe(tenantId, id);
  }

  /* ── Assinatura ────────────────────────────────────────────── */

  private async registrarAssinatura(
    d: { id: string; tenantId: string; patientId: string; content: string; validityDays: number | null; signedAt: Date | null; canceledAt: Date | null; fileData: string | null },
    dados: { signerName: unknown; signerCpf: unknown; signatureData: unknown; method: 'PRESENCIAL' | 'REMOTO' },
    meta: Meta,
  ) {
    if (d.canceledAt) throw new BadRequestException('Este documento foi cancelado.');
    if (d.signedAt) throw new BadRequestException('Este documento já foi assinado.');
    if (temVariavelPendente(d.content)) {
      throw new BadRequestException('O documento ainda tem campos {{…}} sem preencher. Edite o texto antes de coletar a assinatura.');
    }

    const signerName = texto(dados.signerName, 150);
    if (!signerName || signerName.length < 3) throw new BadRequestException('Informe o nome completo de quem assina.');

    const cpf = soDigitos(dados.signerCpf);
    if (cpf && !validarCpf(cpf)) throw new BadRequestException('CPF inválido.');

    const sig = typeof dados.signatureData === 'string' ? dados.signatureData : '';
    if (!PREFIXO_PNG.test(sig) || sig.length > MAX_ASSINATURA) throw new BadRequestException('Assinatura inválida. Desenhe a assinatura novamente.');

    const signedAt = new Date();
    const hash = calcularHash({ id: d.id, content: d.content, signerName, signerCpf: cpf || null, signedAt, signatureData: sig, fileData: d.fileData });

    await this.prisma.clinicalDocument.update({
      where: { id: d.id },
      data: {
        signedAt,
        signerName,
        signerCpf: cpf || null,
        signatureData: sig,
        signatureHash: hash,
        signerMethod: dados.method,
        signerIp: meta.ip?.slice(0, 64) ?? null,
        signerUserAgent: meta.userAgent?.slice(0, 300) ?? null,
        expiresAt: d.validityDays ? new Date(+signedAt + d.validityDays * DIA) : null,
      },
    });
  }

  async assinar(tenantId: string, userId: string | undefined, id: string, body: Body, meta: Meta) {
    const d = await this.buscar(tenantId, id);
    await this.registrarAssinatura(d, { signerName: body.signerName, signerCpf: body.signerCpf, signatureData: body.signatureData, method: 'PRESENCIAL' }, meta);
    await this.auditar(tenantId, userId, d.patientId, 'SIGN', id);
    return this.detalhe(tenantId, id);
  }

  async gerarLink(tenantId: string, userId: string | undefined, id: string, diasBruto?: unknown) {
    const d = await this.buscar(tenantId, id);
    if (d.canceledAt) throw new BadRequestException('Documento cancelado.');
    if (d.signedAt) throw new BadRequestException('Documento já assinado.');
    if (temVariavelPendente(d.content)) throw new BadRequestException('Preencha todos os campos {{…}} antes de enviar o link.');

    const dias = inteiroOpc(diasBruto, 1, 30) ?? 7;
    const token = randomBytes(24).toString('hex');
    await this.prisma.clinicalDocument.update({
      where: { id },
      data: { signToken: token, signTokenExpiresAt: new Date(Date.now() + dias * DIA) },
    });
    await this.auditar(tenantId, userId, d.patientId, 'UPDATE', id);
    return this.detalhe(tenantId, id);
  }

  async revogarLink(tenantId: string, userId: string | undefined, id: string) {
    const d = await this.buscar(tenantId, id);
    await this.prisma.clinicalDocument.update({ where: { id }, data: { signToken: null, signTokenExpiresAt: null } });
    await this.auditar(tenantId, userId, d.patientId, 'UPDATE', id);
    return this.detalhe(tenantId, id);
  }

  /** Confere se o conteúdo/assinatura foram alterados depois de assinados. */
  async verificar(tenantId: string, id: string) {
    const d = await this.buscar(tenantId, id);
    if (!d.signedAt || !d.signatureHash || !d.signerName) throw new BadRequestException('Este documento não está assinado.');
    const calculado = calcularHash({
      id: d.id,
      content: d.content,
      signerName: d.signerName,
      signerCpf: d.signerCpf,
      signedAt: d.signedAt,
      signatureData: d.signatureData,
      fileData: d.fileData,
    });
    return { integro: calculado === d.signatureHash, assinadoEm: d.signedAt, hashArmazenado: d.signatureHash, hashCalculado: calculado };
  }

  /* ── Documento físico digitalizado ─────────────────────────── */

  async anexar(tenantId: string, userId: string | undefined, body: Body) {
    const pac = await this.paciente(tenantId, texto(body.patientId, 80) ?? '');
    const title = texto(body.title, 160);
    if (!title) throw new BadRequestException('Informe o título do documento.');

    const fileData = typeof body.fileData === 'string' ? body.fileData : '';
    if (!PREFIXO_ARQUIVO.test(fileData)) throw new BadRequestException('Envie um arquivo PDF, JPG, PNG ou WebP.');
    if (fileData.length > MAX_ARQUIVO) throw new BadRequestException('Arquivo muito grande (máximo ~6 MB).');
    const mime = fileData.slice(5, fileData.indexOf(';'));

    const assinadoEm = body.signedAt ? new Date(`${String(body.signedAt).slice(0, 10)}T12:00:00.000Z`) : new Date();
    if (isNaN(+assinadoEm)) throw new BadRequestException('Data da assinatura inválida.');
    if (+assinadoEm > Date.now() + DIA) throw new BadRequestException('A data da assinatura não pode estar no futuro.');

    const validityDays = inteiroOpc(body.validityDays, 1, 3650);
    const content = `Documento físico digitalizado.\n\nTítulo: ${title}\nPaciente: ${pac.name}\nAssinado em papel em ${fmtData(assinadoEm)}.`;
    const id = randomBytes(16).toString('hex');
    const hash = calcularHash({ id, content, signerName: pac.name, signerCpf: null, signedAt: assinadoEm, signatureData: null, fileData });

    const criado = await this.prisma.clinicalDocument.create({
      data: {
        id,
        tenantId,
        patientId: pac.id,
        userId: userId ?? '',
        type: tipoValido(body.type),
        title,
        content,
        validityDays,
        signerName: pac.name,
        signedAt: assinadoEm,
        signerMethod: 'PAPEL',
        signatureHash: hash,
        expiresAt: validityDays ? new Date(+assinadoEm + validityDays * DIA) : null,
        fileData,
        fileName: (texto(body.fileName, 150) ?? 'documento').replace(/[^\w.\- ()À-ú]/g, '_'),
        fileMime: mime,
        fileSize: Math.round(fileData.length * 0.75),
      },
      select: { id: true },
    });
    await this.auditar(tenantId, userId, pac.id, 'CREATE', criado.id);
    return this.detalhe(tenantId, criado.id);
  }

  /* ── Solicitação em 1 clique (painel de Conformidade) ──────── */

  async solicitar(tenantId: string, userId: string | undefined, body: Body) {
    const tipo = tipoValido(body.tipo);
    const patientId = texto(body.patientId, 80) ?? '';
    await this.paciente(tenantId, patientId);

    // Reaproveita um link ainda válido para não duplicar pedidos
    const agora = new Date();
    const existente = await this.prisma.clinicalDocument.findFirst({
      where: { tenantId, patientId, type: tipo, ...(filtroStatus('PENDENTE', agora) ?? {}) },
      select: { id: true },
    });
    if (existente) return this.detalhe(tenantId, existente.id);

    const modelo = await this.prisma.documentTemplate.findFirst({
      where: { tenantId, type: tipo, active: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    if (!modelo) throw new BadRequestException('Não há modelo ativo para este tipo. Crie um em "Modelos".');

    const doc = await this.criar(tenantId, userId, { patientId, templateId: modelo.id });
    return this.gerarLink(tenantId, userId, doc.id, 7);
  }

  /* ── Páginas públicas de assinatura (sem login) ────────────── */

  private async porToken(token: string) {
    if (!/^[a-f0-9]{48}$/.test(token)) throw new NotFoundException('Link inválido.');
    const d = await this.prisma.clinicalDocument.findUnique({
      where: { signToken: token },
      include: { patient: { select: { name: true } }, tenant: { select: { name: true } } },
    });
    if (!d) throw new NotFoundException('Link inválido.');
    if (d.canceledAt) throw new GoneException('Este documento foi cancelado pela clínica.');
    if (d.signedAt) throw new GoneException('Este documento já foi assinado. Obrigado!');
    if (!d.signTokenExpiresAt || d.signTokenExpiresAt < new Date()) {
      throw new GoneException('Este link expirou. Solicite um novo link à clínica.');
    }
    return d;
  }

  async publicoObter(token: string) {
    const d = await this.porToken(token);
    return {
      titulo: d.title,
      conteudo: d.content,
      clinica: d.tenant.name,
      assinante: d.patient.name,
      expiraEm: d.signTokenExpiresAt,
      exigeCpf: false,
    };
  }

  async publicoAssinar(token: string, body: Body, meta: Meta) {
    const d = await this.porToken(token);
    if (!booleano(body.aceite)) throw new BadRequestException('É necessário confirmar que leu e concorda com o documento.');

    await this.registrarAssinatura(d, { signerName: body.signerName, signerCpf: body.signerCpf, signatureData: body.signatureData, method: 'REMOTO' }, meta);
    await this.auditar(d.tenantId, d.userId || undefined, d.patientId, 'SIGN', d.id);

    // Avisa a equipe em tempo real (melhor esforço)
    try {
      await this.notificacoes?.notificar({
        tenantId: d.tenantId,
        tipo: 'CLINICA',
        prioridade: 'NORMAL',
        titulo: `Documento assinado: ${d.title}`,
        mensagem: `${d.patient.name} assinou pelo link.`,
        href: '/termos',
        dedupeKey: `doc-assinado-${d.id}`,
        userIds: d.userId ? [d.userId] : undefined,
        roles: ['ADMIN', 'RECEPTIONIST'],
      });
    } catch (e) {
      this.log.warn(`Não foi possível notificar a assinatura: ${(e as Error).message}`);
    }
    return { ok: true, clinica: d.tenant.name };
  }

  /* ── Modelos ───────────────────────────────────────────────── */

  async modelos(tenantId: string) {
    const total = await this.prisma.documentTemplate.count({ where: { tenantId } });
    if (total === 0) {
      await this.prisma.documentTemplate.createMany({
        data: MODELOS_PADRAO.map((m) => ({ tenantId, name: m.name, type: m.type, description: m.description, content: m.content, validityDays: m.validityDays, isDefault: true })),
      });
    }
    const rows = await this.prisma.documentTemplate.findMany({
      where: { tenantId },
      orderBy: [{ active: 'desc' }, { type: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { documents: true } } },
    });
    return rows.map(({ _count, ...m }) => ({ ...m, usos: _count.documents }));
  }

  private camposModelo(body: Body) {
    const name = texto(body.name, 160);
    if (!name) throw new BadRequestException('Informe o nome do modelo.');
    const content = typeof body.content === 'string' ? body.content : '';
    if (!content.trim()) throw new BadRequestException('O modelo precisa ter conteúdo.');
    if (content.length > MAX_CONTEUDO) throw new BadRequestException('Conteúdo muito longo.');
    return {
      name,
      type: tipoValido(body.type),
      description: texto(body.description, 300),
      content,
      validityDays: inteiroOpc(body.validityDays, 1, 3650),
    };
  }

  async criarModelo(tenantId: string, body: Body) {
    const c = this.camposModelo(body);
    return this.prisma.documentTemplate.create({ data: { ...c, tenantId, active: body.active === undefined ? true : booleano(body.active) } });
  }

  async atualizarModelo(tenantId: string, id: string, body: Body) {
    const atual = await this.prisma.documentTemplate.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!atual) throw new NotFoundException('Modelo não encontrado.');
    // atualização parcial (ex.: só "active") ou completa
    if (Object.keys(body).length === 1 && body.active !== undefined) {
      return this.prisma.documentTemplate.update({ where: { id }, data: { active: booleano(body.active) } });
    }
    const c = this.camposModelo(body);
    return this.prisma.documentTemplate.update({
      where: { id },
      data: { ...c, ...(body.active !== undefined ? { active: booleano(body.active) } : {}) },
    });
  }

  async excluirModelo(tenantId: string, id: string) {
    const r = await this.prisma.documentTemplate.deleteMany({ where: { id, tenantId } });
    if (!r.count) throw new NotFoundException('Modelo não encontrado.');
  }
}