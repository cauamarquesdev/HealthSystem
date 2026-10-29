import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const sha256 = (v: unknown) =>
  createHash('sha256').update(JSON.stringify(v)).digest('hex');

const NOTE_TYPES = ['ANAMNESE', 'EVOLUCAO'];
const DOC_TYPES = [
  'TERMO_PROCEDIMENTO',
  'TERMO_IMAGEM',
  'TERMO_LGPD',
  'ATESTADO',
  'DECLARACAO',
  'OUTRO',
];
const MEDIA_CATEGORIES = ['ANTES', 'DEPOIS', 'EXAME', 'REFERENCIA', 'OUTRO'];
// Suporta ambas as variações de capitalização usadas no banco/sistema
const CANCELLED_STATUSES = ['Cancelado', 'CANCELADO'];
const IMAGE_RE = /^data:(image\/(?:jpeg|png|webp));base64,/;
const MAX_IMAGE_CHARS = 8_000_000; // ~6 MB em base64
const MAX_SIGNATURE_CHARS = 400_000;
const MEDIA_DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

@Injectable()
export class RecordsService {
  constructor(private prisma: PrismaService) {}

  // ------------------------------------------------------------ helpers

  private async tenantId() {
    const t = await this.prisma.tenant.findFirst({ select: { id: true } });
    if (!t) throw new NotFoundException('Nenhuma clínica cadastrada.');
    return t.id;
  }

  private async author(userId?: string, knownTenantId?: string) {
    if (userId) {
      const u = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!u) throw new NotFoundException('Profissional não encontrado.');
      return u;
    }
    const tenantId = knownTenantId ?? (await this.tenantId());
    const first = await this.prisma.user.findFirst({
      where: { tenantId },
    });
    if (!first) throw new NotFoundException('Nenhum profissional cadastrado.');
    return first;
  }

  private async patientOrFail(id: string) {
    const p = await this.prisma.patient.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Paciente não encontrado.');
    return p;
  }

  /** Trilha de auditoria (LGPD). Nunca derruba a requisição principal. */
  private async audit(
    patientId: string,
    action: string,
    entity: string,
    entityId?: string,
    userId?: string,
    knownTenantId?: string,
  ) {
    try {
      const tenantId = knownTenantId ?? (await this.tenantId());
      await this.prisma.recordAudit.create({
        data: {
          tenantId,
          patientId,
          action,
          entity,
          entityId: entityId ?? null,
          userId: userId ?? null,
        },
      });
    } catch {
      /* auditoria é best-effort */
    }
  }

  // ------------------------------------------------------------ pacientes

  private summarize(
    p: any,
    last?: Date | null,
    next?: Date | null,
    lgpd = false,
  ) {
    const { _count, ...rest } = p;
    return {
      id: rest.id,
      name: rest.name,
      cpf: rest.cpf,
      phone: rest.phone,
      email: rest.email,
      avatar: rest.avatar,
      birthDate: rest.birthDate,
      active: rest.active,
      tags: rest.tags ?? [],
      fototipo: rest.fototipo,
      skinTendency: rest.skinTendency,
      allergies: rest.allergies,
      lastVisit: last ?? null,
      nextVisit: next ?? null,
      hasLgpd: lgpd,
      counts: {
        notes: _count?.clinicalNotes ?? 0,
        media: _count?.media ?? 0,
        documents: _count?.documents ?? 0,
        prescriptions: _count?.prescriptions ?? 0,
        appointments: _count?.appointments ?? 0,
      },
    };
  }

  private readonly COUNT = {
    select: {
      clinicalNotes: true,
      media: true,
      documents: true,
      prescriptions: true,
      appointments: true,
    },
  } as const;

  async listPatients(q?: string) {
    const tenantId = await this.tenantId();
    const term = (q ?? '').trim();
    const digits = term.replace(/\D/g, '');
    const where: Prisma.PatientWhereInput = { tenantId };

    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        ...(digits
          ? [{ cpf: { contains: digits } }, { phone: { contains: digits } }]
          : []),
      ];
    }

    const patients = await this.prisma.patient.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 300,
      include: { _count: this.COUNT },
    });

    if (!patients.length) return [];

    const ids = patients.map((p) => p.id);
    const now = new Date();

    const [past, upcoming, lgpd] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ['patientId'],
        where: {
          patientId: { in: ids },
          type: 'APPOINTMENT',
          status: { notIn: CANCELLED_STATUSES },
          date: { lt: now },
        },
        _max: { date: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['patientId'],
        where: {
          patientId: { in: ids },
          type: 'APPOINTMENT',
          status: { notIn: CANCELLED_STATUSES },
          date: { gte: now },
        },
        _min: { date: true },
      }),
      this.prisma.clinicalDocument.findMany({
        where: {
          patientId: { in: ids },
          type: 'TERMO_LGPD',
          signedAt: { not: null },
        },
        select: { patientId: true },
      }),
    ]);

    const lastMap = new Map<string, Date | null>();
    for (const r of past) {
      if (r.patientId) lastMap.set(r.patientId, r._max.date);
    }

    const nextMap = new Map<string, Date | null>();
    for (const r of upcoming) {
      if (r.patientId) nextMap.set(r.patientId, r._min.date);
    }

    const lgpdSet = new Set(lgpd.map((d) => d.patientId));

    return patients.map((p) =>
      this.summarize(
        p,
        lastMap.get(p.id),
        nextMap.get(p.id),
        lgpdSet.has(p.id),
      ),
    );
  }

  async updateProfile(id: string, body: any, userId?: string) {
    const patient = await this.patientOrFail(id);
    const data: Prisma.PatientUpdateInput = {};

    if (body.allergies !== undefined)
      data.allergies = str(body.allergies, 500) || null;
    if (body.fototipo !== undefined)
      data.fototipo = str(body.fototipo, 60) || null;
    if (body.skinTendency !== undefined)
      data.skinTendency = str(body.skinTendency, 200) || null;
    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags))
        throw new BadRequestException('tags deve ser uma lista.');
      data.tags = [
        ...new Set<string>(
          body.tags.map((t: any) => str(t, 30)).filter(Boolean),
        ),
      ].slice(0, 12);
    }

    const now = new Date();
    const [updated, lastAppt, nextAppt, lgpdDoc] = await Promise.all([
      this.prisma.patient.update({
        where: { id },
        data,
        include: { _count: this.COUNT },
      }),
      this.prisma.appointment.findFirst({
        where: {
          patientId: id,
          type: 'APPOINTMENT',
          status: { notIn: CANCELLED_STATUSES },
          date: { lt: now },
        },
        orderBy: { date: 'desc' },
        select: { date: true },
      }),
      this.prisma.appointment.findFirst({
        where: {
          patientId: id,
          type: 'APPOINTMENT',
          status: { notIn: CANCELLED_STATUSES },
          date: { gte: now },
        },
        orderBy: { date: 'asc' },
        select: { date: true },
      }),
      this.prisma.clinicalDocument.findFirst({
        where: { patientId: id, type: 'TERMO_LGPD', signedAt: { not: null } },
        select: { id: true },
      }),
    ]);

    await this.audit(id, 'UPDATE', 'PROFILE', id, userId, patient.tenantId);
    return this.summarize(
      updated,
      lastAppt?.date ?? null,
      nextAppt?.date ?? null,
      !!lgpdDoc,
    );
  }

  // ------------------------------------------------------------ prontuário

  async getRecord(patientId: string, userId?: string) {
    const patient = await this.patientOrFail(patientId);

    const [notes, prescriptions, documents, media, appointments] =
      await Promise.all([
        this.prisma.clinicalNote.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } } },
        }),
        this.prisma.prescription.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } } },
        }),
        this.prisma.clinicalDocument.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } } },
        }),
        this.prisma.patientMedia.findMany({
          where: { patientId },
          orderBy: { takenAt: 'desc' },
          select: {
            id: true,
            category: true,
            region: true,
            description: true,
            takenAt: true,
            createdAt: true,
            appointmentId: true,
          },
        }),
        this.prisma.appointment.findMany({
          where: {
            patientId,
            type: 'APPOINTMENT',
            status: { notIn: CANCELLED_STATUSES },
          },
          orderBy: { date: 'desc' },
          take: 80,
          include: {
            items: true,
            procedure: true,
            professional: { select: { name: true } },
          },
        }),
      ]);

    await this.audit(
      patientId,
      'VIEW',
      'RECORD',
      patientId,
      userId,
      patient.tenantId,
    );

    return {
      notes: notes.map(({ user, ...n }) => ({
        ...n,
        authorName: user?.name ?? '',
      })),
      prescriptions: prescriptions.map(({ user, ...r }) => ({
        ...r,
        authorName: user?.name ?? '',
      })),
      documents: documents.map(({ user, ...d }) => ({
        ...d,
        authorName: user?.name ?? '',
      })),
      media,
      appointments: appointments.map((a) => ({
        id: a.id,
        date: a.date,
        endTime: a.endTime,
        status: a.status,
        type: a.type,
        procedure: a.items.length
          ? a.items.map((i) => i.name).join(' + ')
          : (a.procedure?.name ?? ''),
        professional: a.professional?.name ?? '',
      })),
    };
  }

  async listAudit(patientId: string) {
    await this.patientOrFail(patientId);
    const rows = await this.prisma.recordAudit.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
    const userIds = [
      ...new Set(rows.map((r) => r.userId).filter(Boolean)),
    ] as string[];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
    const names = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      createdAt: r.createdAt,
      userName: r.userId ? (names.get(r.userId) ?? '—') : 'Sistema',
    }));
  }

  // ------------------------------------------------------------ evoluções / anamnese

  private async sealNote(id: string) {
    const n = await this.prisma.clinicalNote.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Registro não encontrado.');
    const signedAt = new Date();
    const signatureHash = sha256({
      id: n.id,
      patientId: n.patientId,
      userId: n.userId,
      type: n.type,
      title: n.title,
      content: n.content,
      data: n.data,
      parentId: n.parentId,
      signedAt: signedAt.toISOString(),
    });
    return this.prisma.clinicalNote.update({
      where: { id },
      data: { signedAt, signatureHash },
      include: { user: { select: { name: true } } },
    });
  }

  private noteDto({ user, ...n }: any) {
    return { ...n, authorName: user?.name ?? '' };
  }

  async createNote(patientId: string, body: any) {
    const patient = await this.patientOrFail(patientId);
    const type = String(body.type || 'EVOLUCAO');
    if (!NOTE_TYPES.includes(type))
      throw new BadRequestException('Tipo de registro inválido.');
    const content = str(body.content, 20000);
    if (!content)
      throw new BadRequestException('O registro não pode estar vazio.');
    const author = await this.author(body.userId, patient.tenantId);

    const created = await this.prisma.clinicalNote.create({
      data: {
        patientId,
        tenantId: patient.tenantId,
        userId: author.id,
        type,
        title:
          str(body.title, 120) ||
          (type === 'ANAMNESE' ? 'Ficha de Anamnese' : 'Evolução'),
        content,
        data:
          body.data === null
            ? Prisma.JsonNull
            : (body.data ?? undefined),
        appointmentId: body.appointmentId || null,
      },
    });
    await this.audit(
      patientId,
      'CREATE',
      'NOTE',
      created.id,
      author.id,
      patient.tenantId,
    );
    if (body.sign) {
      const sealed = await this.sealNote(created.id);
      await this.audit(
        patientId,
        'SIGN',
        'NOTE',
        created.id,
        author.id,
        patient.tenantId,
      );
      return this.noteDto(sealed);
    }
    return this.noteDto({ ...created, user: { name: author.name } });
  }

  async updateNote(id: string, body: any) {
    const n = await this.prisma.clinicalNote.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Registro não encontrado.');
    if (n.signedAt) {
      throw new ConflictException(
        'Registro assinado não pode ser alterado. Use um adendo.',
      );
    }
    const data: Prisma.ClinicalNoteUncheckedUpdateInput = {};
    if (body.title !== undefined) data.title = str(body.title, 120) || n.title;
    if (body.content !== undefined) {
      data.content = str(body.content, 20000);
      if (!data.content)
        throw new BadRequestException('O registro não pode estar vazio.');
    }
    if (body.data !== undefined) {
      data.data = body.data === null ? Prisma.JsonNull : body.data;
    }
    if (body.appointmentId !== undefined)
      data.appointmentId = body.appointmentId || null;

    const updated = await this.prisma.clinicalNote.update({
      where: { id },
      data,
      include: { user: { select: { name: true } } },
    });
    await this.audit(n.patientId, 'UPDATE', 'NOTE', id, body.userId, n.tenantId);
    return this.noteDto(updated);
  }

  async signNote(id: string, userId?: string) {
    const n = await this.prisma.clinicalNote.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Registro não encontrado.');
    if (n.signedAt)
      throw new ConflictException('Este registro já foi assinado.');
    const sealed = await this.sealNote(id);
    await this.audit(n.patientId, 'SIGN', 'NOTE', id, userId, n.tenantId);
    return this.noteDto(sealed);
  }

  async addendum(id: string, body: any) {
    const parent = await this.prisma.clinicalNote.findUnique({ where: { id } });
    if (!parent) throw new NotFoundException('Registro não encontrado.');
    if (!parent.signedAt) {
      throw new BadRequestException(
        'Só é possível criar adendo em registros assinados. Edite o rascunho.',
      );
    }
    const content = str(body.content, 5000);
    if (!content)
      throw new BadRequestException('Escreva o conteúdo do adendo.');
    const author = await this.author(body.userId, parent.tenantId);
    const created = await this.prisma.clinicalNote.create({
      data: {
        patientId: parent.patientId,
        tenantId: parent.tenantId,
        userId: author.id,
        type: 'ADENDO',
        title: 'Adendo',
        content,
        parentId: parent.id,
      },
    });
    const sealed = await this.sealNote(created.id);
    await this.audit(
      parent.patientId,
      'CREATE',
      'NOTE',
      created.id,
      author.id,
      parent.tenantId,
    );
    return this.noteDto(sealed);
  }

  async deleteNote(id: string, userId?: string) {
    const n = await this.prisma.clinicalNote.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Registro não encontrado.');
    if (n.signedAt || n.type === 'ADENDO') {
      throw new ConflictException(
        'Registros assinados não podem ser excluídos (guarda mínima de 20 anos).',
      );
    }
    await this.prisma.clinicalNote.delete({ where: { id } });
    await this.audit(n.patientId, 'DELETE', 'NOTE', id, userId, n.tenantId);
    return { deleted: true };
  }

  // ------------------------------------------------------------ prescrições

  private rxDto({ user, ...r }: any) {
    return { ...r, authorName: user?.name ?? '' };
  }

  async createPrescription(patientId: string, body: any) {
    const patient = await this.patientOrFail(patientId);
    const items = Array.isArray(body.items)
      ? body.items
          .map((i: any) => ({
            name: str(i.name, 160),
            dosage: str(i.dosage, 200),
            instructions: str(i.instructions, 400),
          }))
          .filter((i: any) => i.name)
      : [];
    const content = str(body.content, 4000);
    if (!items.length && !content) {
      throw new BadRequestException(
        'Adicione ao menos um item ou orientação.',
      );
    }
    const author = await this.author(body.userId, patient.tenantId);
    const sign = !!body.sign;
    const createdAt = new Date();
    const signatureHash = sign
      ? sha256({
          patientId,
          userId: author.id,
          items,
          content,
          signedAt: createdAt.toISOString(),
        })
      : null;

    const created = await this.prisma.prescription.create({
      data: {
        tenantId: patient.tenantId,
        patientId,
        userId: author.id,
        title: str(body.title, 120) || 'Receituário',
        content: content || '',
        items: items as Prisma.InputJsonValue,
        signedAt: sign ? createdAt : null,
        signatureHash,
      },
      include: { user: { select: { name: true } } },
    });
    await this.audit(
      patientId,
      sign ? 'SIGN' : 'CREATE',
      'PRESCRIPTION',
      created.id,
      author.id,
      patient.tenantId,
    );
    return this.rxDto(created);
  }

  async signPrescription(id: string, userId?: string) {
    const r = await this.prisma.prescription.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Prescrição não encontrada.');
    if (r.signedAt)
      throw new ConflictException('Esta prescrição já foi assinada.');
    const signedAt = new Date();
    const signatureHash = sha256({
      patientId: r.patientId,
      userId: r.userId,
      items: r.items,
      content: r.content,
      signedAt: signedAt.toISOString(),
    });
    const updated = await this.prisma.prescription.update({
      where: { id },
      data: { signedAt, signatureHash },
      include: { user: { select: { name: true } } },
    });
    await this.audit(
      r.patientId,
      'SIGN',
      'PRESCRIPTION',
      id,
      userId,
      r.tenantId,
    );
    return this.rxDto(updated);
  }

  // ------------------------------------------------------------ documentos

  private docDto({ user, ...d }: any) {
    return { ...d, authorName: user?.name ?? '' };
  }

  private validSignature(sig: unknown) {
    if (!sig) return null;
    const s = String(sig);
    if (
      !s.startsWith('data:image/png;base64,') ||
      s.length > MAX_SIGNATURE_CHARS
    ) {
      throw new BadRequestException('Assinatura inválida.');
    }
    return s;
  }

  async createDocument(patientId: string, body: any) {
    const patient = await this.patientOrFail(patientId);
    const type = String(body.type || 'OUTRO');
    if (!DOC_TYPES.includes(type))
      throw new BadRequestException('Tipo de documento inválido.');
    const title = str(body.title, 160);
    const content = str(body.content, 20000);
    if (!title || !content)
      throw new BadRequestException(
        'Informe título e conteúdo do documento.',
      );
    const signatureData = this.validSignature(body.signatureData);
    const author = await this.author(body.userId, patient.tenantId);
    const signedAt = signatureData ? new Date() : null;
    const signerName = signatureData
      ? str(body.signerName, 120) || patient.name
      : null;
    const signatureHash = signatureData
      ? sha256({
          patientId,
          type,
          title,
          content,
          signerName,
          sig: sha256(signatureData),
          signedAt: signedAt!.toISOString(),
        })
      : null;

    const created = await this.prisma.clinicalDocument.create({
      data: {
        tenantId: patient.tenantId,
        patientId,
        userId: author.id,
        type,
        title,
        content,
        signerName,
        signatureData,
        signedAt,
        signatureHash,
      },
      include: { user: { select: { name: true } } },
    });
    await this.audit(
      patientId,
      signatureData ? 'SIGN' : 'CREATE',
      'DOCUMENT',
      created.id,
      author.id,
      patient.tenantId,
    );
    return this.docDto(created);
  }

  async signDocument(id: string, body: any) {
    const d = await this.prisma.clinicalDocument.findUnique({
      where: { id },
      include: { patient: true },
    });
    if (!d) throw new NotFoundException('Documento não encontrado.');
    if (d.signedAt)
      throw new ConflictException('Este documento já foi assinado.');
    const signatureData = this.validSignature(body.signatureData);
    if (!signatureData)
      throw new BadRequestException('A assinatura é obrigatória.');
    const signedAt = new Date();
    const signerName = str(body.signerName, 120) || d.patient.name;
    const signatureHash = sha256({
      patientId: d.patientId,
      type: d.type,
      title: d.title,
      content: d.content,
      signerName,
      sig: sha256(signatureData),
      signedAt: signedAt.toISOString(),
    });
    const updated = await this.prisma.clinicalDocument.update({
      where: { id },
      data: { signatureData, signerName, signedAt, signatureHash },
      include: { user: { select: { name: true } } },
    });
    await this.audit(
      d.patientId,
      'SIGN',
      'DOCUMENT',
      id,
      body.userId,
      d.tenantId,
    );
    return this.docDto(updated);
  }

  // ------------------------------------------------------------ fotos

  async createMedia(patientId: string, body: any) {
    const patient = await this.patientOrFail(patientId);
    const dataUrl = String(body.dataUrl ?? '');
    if (!IMAGE_RE.test(dataUrl))
      throw new BadRequestException('Envie uma imagem JPEG, PNG ou WebP.');
    if (dataUrl.length > MAX_IMAGE_CHARS)
      throw new BadRequestException('Imagem muito grande (máx. ~6 MB).');
    const category = MEDIA_CATEGORIES.includes(body.category)
      ? body.category
      : 'OUTRO';
    const takenAt = body.takenAt ? new Date(body.takenAt) : new Date();

    const created = await this.prisma.patientMedia.create({
      data: {
        patientId,
        url: dataUrl,
        type: 'IMAGE',
        category,
        region: str(body.region, 80) || null,
        description: str(body.description, 300) || null,
        takenAt: Number.isNaN(takenAt.getTime()) ? new Date() : takenAt,
        appointmentId: body.appointmentId || null,
      },
      select: {
        id: true,
        category: true,
        region: true,
        description: true,
        takenAt: true,
        createdAt: true,
        appointmentId: true,
      },
    });
    await this.audit(
      patientId,
      'CREATE',
      'MEDIA',
      created.id,
      body.userId,
      patient.tenantId,
    );
    return created;
  }

  async updateMedia(id: string, body: any) {
    const m = await this.prisma.patientMedia.findUnique({
      where: { id },
      select: { patientId: true },
    });
    if (!m) throw new NotFoundException('Foto não encontrada.');
    const data: Prisma.PatientMediaUpdateInput = {};
    if (body.description !== undefined)
      data.description = str(body.description, 300) || null;
    if (body.region !== undefined) data.region = str(body.region, 80) || null;
    if (
      body.category !== undefined &&
      MEDIA_CATEGORIES.includes(body.category)
    )
      data.category = body.category;

    const updated = await this.prisma.patientMedia.update({
      where: { id },
      data,
      select: {
        id: true,
        category: true,
        region: true,
        description: true,
        takenAt: true,
        createdAt: true,
        appointmentId: true,
      },
    });
    await this.audit(m.patientId, 'UPDATE', 'MEDIA', id, body.userId);
    return updated;
  }

  async deleteMedia(id: string, userId?: string) {
    const m = await this.prisma.patientMedia.findUnique({
      where: { id },
      select: { patientId: true, createdAt: true },
    });
    if (!m) throw new NotFoundException('Foto não encontrada.');
    if (Date.now() - m.createdAt.getTime() > MEDIA_DELETE_WINDOW_MS) {
      throw new ConflictException(
        'Fotos só podem ser excluídas até 24h após o envio. Edite a descrição se precisar corrigir.',
      );
    }
    await this.prisma.patientMedia.delete({ where: { id } });
    await this.audit(m.patientId, 'DELETE', 'MEDIA', id, userId);
    return { deleted: true };
  }

  async mediaFile(id: string) {
    const m = await this.prisma.patientMedia.findUnique({
      where: { id },
      select: { url: true },
    });
    if (!m) throw new NotFoundException('Foto não encontrada.');
    const match = IMAGE_RE.exec(m.url);
    if (!match) throw new NotFoundException('Arquivo indisponível.');
    return {
      mime: match[1],
      buffer: Buffer.from(m.url.slice(match[0].length), 'base64'),
    };
  }
}