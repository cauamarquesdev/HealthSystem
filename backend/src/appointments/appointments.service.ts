import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Brasil (sem horário de verão desde 2019): UTC-3.
// Se a clínica ficar em outro fuso, ajuste as duas constantes.
const TZ_OFFSET_MIN = -180;
const TZ_OFFSET = '-03:00';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-08" + "14:30" (hora local da clínica) -> Date (UTC) */
const toDateTime = (day: string, time: string) =>
  new Date(`${day}T${time}:00${TZ_OFFSET}`);

/** Date (UTC) -> { day: "YYYY-MM-DD", time: "HH:mm" } na hora local da clínica */
const toLocalParts = (d: Date) => {
  const l = new Date(d.getTime() + TZ_OFFSET_MIN * 60000);
  return {
    day: `${l.getUTCFullYear()}-${pad(l.getUTCMonth() + 1)}-${pad(l.getUTCDate())}`,
    time: `${pad(l.getUTCHours())}:${pad(l.getUTCMinutes())}`,
  };
};

const brl = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(n)
    .replace(/\u00a0/g, ' ');

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

// O frontend trabalha com estes rótulos; registros antigos ("AGENDADO") são convertidos.
const STATUS_MAP: Record<string, string> = {
  AGENDADO: 'Confirmado',
  CONFIRMADO: 'Confirmado',
  AGUARDANDO: 'Aguardando',
  EM_ATENDIMENTO: 'Em Atendimento',
  'EM ATENDIMENTO': 'Em Atendimento',
  CONCLUIDO: 'Concluído',
  CONCLUÍDO: 'Concluído',
  CANCELADO: 'Cancelado',
  BLOQUEADO: 'Bloqueado',
};
const normalizeStatus = (s?: string) =>
  STATUS_MAP[String(s ?? '').trim().toUpperCase()] ?? 'Confirmado';

const INCLUDE = {
  patient: true,
  procedure: true,
  professional: { select: { id: true, name: true } },
  items: true,
} as const;

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------- helpers

  private async getTenant() {
    let tenant = await this.prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: { name: 'Clínica Principal' },
      });
    }
    return tenant;
  }

  private async resolveProfessional(tenantId: string, id?: string) {
    if (id) {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('Profissional não encontrado.');
      return user.id;
    }
    const fallback = await this.prisma.user.findFirst({ where: { tenantId } });
    if (!fallback) {
      throw new NotFoundException(
        'Nenhum profissional/usuário cadastrado no sistema.',
      );
    }
    return fallback.id;
  }

  private resolveWindow(data: any, fallbackMinutes: number) {
    let start: Date;
    let end: Date;

    if (data.timeStart && DATE_RE.test(String(data.date))) {
      if (!TIME_RE.test(data.timeStart) || (data.timeEnd && !TIME_RE.test(data.timeEnd))) {
        throw new BadRequestException('Horário inválido. Use o formato HH:mm.');
      }
      start = toDateTime(data.date, data.timeStart);
      end = data.timeEnd
        ? toDateTime(data.date, data.timeEnd)
        : new Date(start.getTime() + fallbackMinutes * 60000);
    } else {
      // formato legado: date/start como data-hora completa
      start = new Date(data.date || data.start);
      const rawEnd = data.endTime || data.end;
      end = rawEnd
        ? new Date(rawEnd)
        : new Date(start.getTime() + fallbackMinutes * 60000);
    }

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Data ou horário inválidos.');
    }
    if (end <= start) {
      throw new BadRequestException(
        'O horário de término deve ser posterior ao início.',
      );
    }
    return { start, end };
  }

  /** Impede dois compromissos sobrepostos para o mesmo profissional. */
  private async assertFree(
    tenantId: string,
    professionalId: string,
    start: Date,
    end: Date,
    ignoreId?: string,
  ) {
    const clash = (await this.prisma.appointment.findFirst({
      where: {
        tenantId,
        professionalId,
        id: ignoreId ? { not: ignoreId } : undefined,
        status: { not: 'Cancelado' },
        date: { lt: end },
        endTime: { gt: start },
      },
      select: {
        id: true,
        status: true,
        blockReason: true,
        date: true,
        endTime: true,
        patient: true,
      },
    })) as any;
    if (clash) {
      const s = toLocalParts(clash.date).time;
      const e = clash.endTime ? toLocalParts(clash.endTime).time : '';
      const what =
        clash.status === 'Bloqueado' || clash.blockReason
          ? 'um bloqueio'
          : `um atendimento${clash.patient ? ` (${clash.patient.name})` : ''}`;
      throw new ConflictException(
        `Horário indisponível: já existe ${what} das ${s}${e ? ` às ${e}` : ''}.`,
      );
    }
  }

  /** Converte o registro do Prisma no formato que a agenda do frontend usa. */
  private toDto(a: any) {
    const block = a.status === 'Bloqueado' || Boolean(a.blockReason);
    const s = toLocalParts(a.date);
    const endDate: Date =
      a.endTime ?? new Date(a.date.getTime() + (a.procedure?.duration ?? 30) * 60000);
    const e = toLocalParts(endDate);
    const names = a.items?.length
      ? a.items.map((i: any) => i.name).join(' + ')
      : a.procedure?.name ?? '';
    const total = a.totalValue || a.procedure?.price || 0;

    return {
      id: a.id,
      type: a.type,
      patientId: a.patientId,
      patientName: block ? 'Bloqueado' : a.patient?.name ?? 'Cliente removido',
      procedure: block ? a.blockReason ?? '' : names,
      procedureIds: a.items?.length
        ? a.items.map((i: any) => i.procedureId)
        : a.procedureId
          ? [a.procedureId]
          : [],
      date: s.day,
      timeStart: s.time,
      timeEnd: e.time,
      value: !block && total > 0 ? brl(total) : '',
      valueNumber: total,
      discount: a.discount,
      deposit: a.deposit,
      doc: a.professional?.name ?? '',
      professionalId: a.professionalId,
      room: a.room ?? 'Sala 01 VIP',
      status: block ? 'Bloqueado' : normalizeStatus(a.status),
      notes: a.notes ?? '',
      reminder: a.reminder,
      col: 0,
    };
  }

  // ------------------------------------------------------------------ API

  async listProfessionals() {
    const tenant = await this.getTenant();
    return this.prisma.user.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAll(start?: string, end?: string) {
    const tenant = await this.prisma.tenant.findFirst();
    if (!tenant) return [];

    const from = start ? new Date(start) : null;
    const to = end ? new Date(end) : null;
    const range =
      from && to && !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())
        ? { date: { gte: from, lte: to } }
        : {};

    const rows = await this.prisma.appointment.findMany({
      where: { tenantId: tenant.id, ...range },
      include: INCLUDE,
      orderBy: { date: 'asc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(data: any) {
    const tenant = await this.getTenant();
    const professionalId = await this.resolveProfessional(
      tenant.id,
      data.professionalId,
    );

    // ---------- Bloqueio de agenda (não precisa de paciente nem procedimento)
    if (data.type === 'BLOCK' || data.status === 'Bloqueado') {
      const { start, end } = this.resolveWindow(data, 60);
      const reason = String(data.blockReason || data.procedure || '').trim();
      if (!reason) throw new BadRequestException('Informe o motivo do bloqueio.');

      const block = await this.prisma.appointment.create({
        data: {
          date: start,
          endTime: end,
          status: 'Bloqueado',
          blockReason: reason,
          tenantId: tenant.id,
          professionalId,
        },
        include: INCLUDE,
      });
      return this.toDto(block);
    }

    // ---------- Agendamento de cliente cadastrado
    if (!data.patientId) {
      throw new BadRequestException(
        'patientId é obrigatório: selecione um cliente cadastrado.',
      );
    }
    const patient = await this.prisma.patient.findUnique({
      where: { id: data.patientId },
    });
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado no banco de dados.');
    }
    if (!patient.active) {
      throw new BadRequestException('O cadastro deste cliente está inativo.');
    }

    // Procedimentos (aceita lista nova ou o procedureId antigo)
    const ids: string[] =
      Array.isArray(data.procedureIds) && data.procedureIds.length
        ? [...new Set<string>(data.procedureIds)]
        : data.procedureId
          ? [data.procedureId]
          : [];

    let procedures: { id: string; name: string; duration: number; price: number }[] = [];
    if (ids.length) {
      const found = await this.prisma.procedure.findMany({
        where: { id: { in: ids } },
      });
      if (found.length !== ids.length) {
        throw new NotFoundException(
          'Um ou mais procedimentos não foram encontrados.',
        );
      }
      procedures = ids.map((id) => found.find((p) => p.id === id)!);
    } else {
      // comportamento anterior: procedimento padrão
      let def = await this.prisma.procedure.findFirst({
        where: { tenantId: tenant.id },
      });
      if (!def) {
        def = await this.prisma.procedure.create({
          data: {
            name: data.procedureName || 'Consulta / Avaliação',
            duration: 30,
            price: 150.0,
            tenantId: tenant.id,
          },
        });
      }
      procedures = [def];
    }

    const totalDuration = procedures.reduce((s, p) => s + p.duration, 0);
    const { start, end } = this.resolveWindow(data, totalDuration);
    await this.assertFree(tenant.id, professionalId, start, end);

    // Valores calculados no servidor (não confia no total enviado pelo navegador)
    const subtotal = procedures.reduce((s, p) => s + p.price, 0);
    const discount = clamp(Number(data.discount) || 0, 0, subtotal);
    const totalValue = subtotal - discount;
    const deposit = clamp(Number(data.deposit) || 0, 0, totalValue);

    const created = await this.prisma.appointment.create({
      data: {
        date: start,
        endTime: end,
        status: normalizeStatus(data.status),
        room: data.room || null,
        notes: data.notes ? String(data.notes).slice(0, 500) : null,
        totalValue,
        discount,
        deposit,
        reminder: !!data.reminder,
        tenantId: tenant.id,
        patientId: patient.id,
        professionalId,
        procedureId: procedures[0].id,
        items: {
          create: procedures.map((p) => ({
            procedureId: p.id,
            name: p.name,
            duration: p.duration,
            price: p.price,
          })),
        },
      },
      include: INCLUDE,
    });
    return this.toDto(created);
  }

  /** Usado pelo arrastar-e-soltar da agenda e por mudanças de status/observações. */
  async update(id: string, data: any) {
    const current = await this.prisma.appointment.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!current) throw new NotFoundException('Agendamento não encontrado.');

    const patch: any = {};

    if (data.timeStart || data.timeEnd || data.date) {
      const cur = this.toDto(current);
      const day = data.date && DATE_RE.test(data.date) ? data.date : cur.date;
      const ts = data.timeStart ?? cur.timeStart;
      const te = data.timeEnd ?? cur.timeEnd;
      if (!TIME_RE.test(ts) || !TIME_RE.test(te)) {
        throw new BadRequestException('Horário inválido. Use o formato HH:mm.');
      }
      const { start, end } = this.resolveWindow(
        { date: day, timeStart: ts, timeEnd: te },
        30,
      );
      if (this.toDto(current).type !== 'BLOCK') {
        await this.assertFree(
          current.tenantId,
          current.professionalId,
          start,
          end,
          current.id,
        );
      }
      patch.date = start;
      patch.endTime = end;
    }

    if (data.status) patch.status = normalizeStatus(data.status);
    if (data.notes !== undefined) patch.notes = String(data.notes).slice(0, 500);
    if (data.room) patch.room = data.room;

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: patch,
      include: INCLUDE,
    });
    return this.toDto(updated);
  }

  async remove(id: string) {
    const exists = await this.prisma.appointment.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Agendamento não encontrado.');
    await this.prisma.appointment.delete({ where: { id } });
    return { deleted: true };
  }
}