import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const COUNT = { select: { appointments: true, items: true } } as const;

@Injectable()
export class ProceduresService {
  constructor(private prisma: PrismaService) {}

  private async tenantId() {
    let tenant = await this.prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: { name: 'Clínica Principal' },
      });
    }
    return tenant.id;
  }

  /** Quantos agendamentos usam o procedimento (somado de forma segura para não contar em dobro). */
  private toDto(p: any) {
    const { _count, ...rest } = p;
    return {
      ...rest,
      usage: Math.max(_count?.appointments ?? 0, _count?.items ?? 0),
    };
  }

  private parse(data: any, partial: boolean) {
    const out: any = {};
    const has = (k: string) => data[k] !== undefined;

    if (!partial || has('name')) {
      const name = String(data.name ?? '').trim();
      if (name.length < 2 || name.length > 120) {
        throw new BadRequestException('Informe um nome com 2 a 120 caracteres.');
      }
      out.name = name;
    }
    if (!partial || has('category')) {
      out.category = String(data.category ?? '').trim().slice(0, 60) || 'Geral';
    }
    if (has('description')) {
      out.description = data.description
        ? String(data.description).trim().slice(0, 500)
        : null;
    }
    if (!partial || has('duration')) {
      const d = Math.round(Number(data.duration));
      if (!Number.isFinite(d) || d < 5 || d > 480) {
        throw new BadRequestException(
          'A duração deve ficar entre 5 e 480 minutos.',
        );
      }
      out.duration = d;
    }
    if (!partial || has('price')) {
      const v = Number(data.price);
      if (!Number.isFinite(v) || v < 0 || v > 1_000_000) {
        throw new BadRequestException('Preço inválido.');
      }
      out.price = Math.round(v * 100) / 100;
    }
    if (has('cost')) {
      const v = Number(data.cost);
      if (!Number.isFinite(v) || v < 0 || v > 1_000_000) {
        throw new BadRequestException('Custo inválido.');
      }
      out.cost = Math.round(v * 100) / 100;
    }
    if (has('returnDays')) {
      if (data.returnDays === null || data.returnDays === '') {
        out.returnDays = null;
      } else {
        const r = Math.round(Number(data.returnDays));
        if (!Number.isFinite(r) || r < 1 || r > 730) {
          throw new BadRequestException(
            'O retorno deve ficar entre 1 e 730 dias.',
          );
        }
        out.returnDays = r;
      }
    }
    if (has('active')) out.active = !!data.active;
    return out;
  }

  private async assertUniqueName(tenantId: string, name: string, ignoreId?: string) {
    const clash = await this.prisma.procedure.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: 'insensitive' },
        id: ignoreId ? { not: ignoreId } : undefined,
      },
    });
    if (clash) {
      throw new ConflictException('Já existe um procedimento com este nome.');
    }
  }

  async findAll() {
    const tenant = await this.prisma.tenant.findFirst();
    if (!tenant) return [];
    const rows = await this.prisma.procedure.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: 'asc' },
      include: { _count: COUNT },
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(data: any) {
    const tenantId = await this.tenantId();
    const parsed = this.parse(data, false);
    await this.assertUniqueName(tenantId, parsed.name);
    const created = await this.prisma.procedure.create({
      data: { ...parsed, tenantId },
      include: { _count: COUNT },
    });
    return this.toDto(created);
  }

  async update(id: string, data: any) {
    const current = await this.prisma.procedure.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Procedimento não encontrado.');
    const parsed = this.parse(data, true);
    if (parsed.name) {
      await this.assertUniqueName(current.tenantId, parsed.name, id);
    }
    const updated = await this.prisma.procedure.update({
      where: { id },
      data: parsed,
      include: { _count: COUNT },
    });
    return this.toDto(updated);
  }

  async remove(id: string) {
    const current = await this.prisma.procedure.findUnique({
      where: { id },
      include: { _count: COUNT },
    });
    if (!current) throw new NotFoundException('Procedimento não encontrado.');
    const usage = Math.max(
      current._count.appointments,
      current._count.items,
    );
    if (usage > 0) {
      throw new ConflictException(
        `Este procedimento está em ${usage} agendamento(s). Desative-o em vez de excluir para manter o histórico.`,
      );
    }
    await this.prisma.procedure.delete({ where: { id } });
    return { deleted: true };
  }
}