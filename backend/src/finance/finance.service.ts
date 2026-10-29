import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Brasil (UTC-3, sem horário de verão). Ajuste se a clínica ficar em outro fuso.
const TZ = '-03:00';
const OFFSET_MIN = -180;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;

const METHODS = ['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'BOLETO', 'TRANSFERENCIA', 'OUTRO'];
const SINGLE_PAYMENT = ['PIX', 'CARTAO_DEBITO', 'DINHEIRO'];
const DONE = ['Concluído', 'CONCLUIDO', 'CONCLUÍDO'];

const num = (v: any) => Number(v ?? 0);
const r2 = (n: number) => Math.round(n * 100) / 100;
const dayStart = (d: string) => new Date(`${d}T00:00:00${TZ}`);
const dayEnd = (d: string) => new Date(`${d}T23:59:59.999${TZ}`);
const localDay = (d: Date) => new Date(d.getTime() + OFFSET_MIN * 60000).toISOString().slice(0, 10);
const addDaysStr = (d: string, n: number) => localDay(new Date(dayStart(d).getTime() + n * DAY_MS + 3600000));
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

function addMonths(day: string, n: number) {
  const [y, m, d] = day.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/** Divide um valor em parcelas em centavos; o resto vai para a primeira. */
function split(total: number, n: number) {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  return Array.from({ length: n }, (_, i) => (base + (i === 0 ? cents - base * n : 0)) / 100);
}

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ------------------------------------------------------------ helpers

  private async tenantId() {
    let t = await this.prisma.tenant.findFirst();
    if (!t) t = await this.prisma.tenant.create({ data: { name: 'Clínica Principal' } });
    return t.id;
  }

  private async author(userId?: string) {
    if (userId) {
      const u = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!u) throw new NotFoundException('Profissional não encontrado.');
      return u;
    }
    const u = await this.prisma.user.findFirst({ where: { tenantId: await this.tenantId() } });
    if (!u) throw new NotFoundException('Nenhum usuário cadastrado.');
    return u;
  }

  private period(from?: string, to?: string) {
    const today = localDay(new Date());
    const [y, m] = today.split('-').map(Number);
    const f = from && DAY_RE.test(from) ? from : `${y}-${String(m).padStart(2, '0')}-01`;
    const t = to && DAY_RE.test(to) ? to : today;
    if (f > t) throw new BadRequestException('A data inicial deve ser anterior à final.');
    const days = Math.round((dayStart(t).getTime() - dayStart(f).getTime()) / DAY_MS) + 1;
    if (days > 400) throw new BadRequestException('O período máximo é de 400 dias.');
    const prevTo = addDaysStr(f, -1);
    const prevFrom = addDaysStr(prevTo, -(days - 1));
    return { from: f, to: t, prevFrom, prevTo, days };
  }

  // ------------------------------------------------------------ resumo

  private kpis(sales: any[], paid: any[], pending: any[]) {
    const revenue = sales.reduce((s, x) => s + num(x.totalAmount), 0);
    const received = paid.filter((t) => t.type === 'RECEITA').reduce((s, t) => s + num(t.amount), 0);
    const expenses = paid.filter((t) => t.type === 'DESPESA').reduce((s, t) => s + num(t.amount), 0);
    const itemsMargin = sales.reduce(
      (s, x) => s + x.items.reduce((a: number, i: any) => a + (num(i.price) - num(i.cost)) * i.quantity, 0) - num(x.discount),
      0,
    );
    return {
      revenue: r2(revenue),
      salesCount: sales.length,
      ticket: sales.length ? r2(revenue / sales.length) : 0,
      received: r2(received),
      expenses: r2(expenses),
      result: r2(received - expenses),
      receivable: r2(pending.filter((t) => t.type === 'RECEITA').reduce((s, t) => s + num(t.amount), 0)),
      payable: r2(pending.filter((t) => t.type === 'DESPESA').reduce((s, t) => s + num(t.amount), 0)),
      procedureMargin: r2(itemsMargin),
    };
  }

  private async bundle(tenantId: string, from: string, to: string) {
    const range = { gte: dayStart(from), lte: dayEnd(to) };
    const [sales, paid, pending, done] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, status: { not: 'CANCELADO' }, createdAt: range },
        include: { items: true, user: { select: { name: true } } },
      }),
      this.prisma.financialTransaction.findMany({ where: { tenantId, status: 'PAGO', paymentDate: range } }),
      this.prisma.financialTransaction.findMany({ where: { tenantId, status: 'PENDENTE', dueDate: range } }),
      this.prisma.appointment.count({
        where: { tenantId, type: 'APPOINTMENT', status: { in: DONE }, date: range },
      }),
    ]);
    return { sales, paid, pending, done };
  }

  async summary(from?: string, to?: string) {
    const p = this.period(from, to);
    const tenantId = await this.tenantId();
    const [cur, prev] = await Promise.all([
      this.bundle(tenantId, p.from, p.to),
      this.bundle(tenantId, p.prevFrom, p.prevTo),
    ]);

    // saldo anterior ao período (caixa acumulado)
    const before = await this.prisma.financialTransaction.groupBy({
      by: ['type'],
      where: { tenantId, status: 'PAGO', paymentDate: { lt: dayStart(p.from) } },
      _sum: { amount: true },
    });
    const openingBalance = r2(
      num(before.find((b) => b.type === 'RECEITA')?._sum.amount) - num(before.find((b) => b.type === 'DESPESA')?._sum.amount),
    );

    // série diária
    const series: any[] = Array.from({ length: p.days }, (_, i) => ({
      date: addDaysStr(p.from, i), in: 0, out: 0, inPending: 0, outPending: 0,
    }));
    const idx = new Map(series.map((s, i) => [s.date, i]));
    cur.paid.forEach((t) => {
      const i = idx.get(localDay(t.paymentDate!));
      if (i !== undefined) series[i][t.type === 'RECEITA' ? 'in' : 'out'] += num(t.amount);
    });
    cur.pending.forEach((t) => {
      const i = idx.get(localDay(t.dueDate));
      if (i !== undefined) series[i][t.type === 'RECEITA' ? 'inPending' : 'outPending'] += num(t.amount);
    });
    series.forEach((s) => (['in', 'out', 'inPending', 'outPending'] as const).forEach((k) => (s[k] = r2(s[k]))));

    // procedimentos fechados (desconto da venda rateado entre os itens)
    const procMap = new Map<string, any>();
    cur.sales.forEach((sale) => {
      const gross = sale.items.reduce((s, i) => s + num(i.price) * i.quantity, 0) || 1;
      const factor = num(sale.totalAmount) / gross;
      sale.items.forEach((i) => {
        const item = i as any;
        const key = item.procedureId ?? item.procedure?.id ?? `name:${item.name}`;
        const row = procMap.get(key) ?? { key, name: item.name, qty: 0, revenue: 0, cost: 0 };
        row.qty += item.quantity;
        row.revenue += num(item.price) * item.quantity * factor;
        row.cost += num(item.cost) * item.quantity;
        procMap.set(key, row);
      });
    });
    const byProcedure = [...procMap.values()]
      .map((r) => ({ ...r, revenue: r2(r.revenue), cost: r2(r.cost), profit: r2(r.revenue - r.cost) }))
      .sort((a, b) => b.revenue - a.revenue);

    const payMap = new Map<string, number>();
    cur.paid.filter((t) => t.type === 'RECEITA').forEach((t) => {
      const k = t.paymentMethod || 'OUTRO';
      payMap.set(k, (payMap.get(k) ?? 0) + num(t.amount));
    });
    const byPayment = [...payMap.entries()].map(([method, total]) => ({ method, total: r2(total) })).sort((a, b) => b.total - a.total);

    const proMap = new Map<string, { name: string; revenue: number; count: number }>();
    cur.sales.forEach((s) => {
      const n = s.user?.name ?? '—';
      const row = proMap.get(n) ?? { name: n, revenue: 0, count: 0 };
      row.revenue += num(s.totalAmount);
      row.count++;
      proMap.set(n, row);
    });
    const byProfessional = [...proMap.values()].map((r) => ({ ...r, revenue: r2(r.revenue) })).sort((a, b) => b.revenue - a.revenue);

    // atrasados (qualquer data) e próximos vencimentos
    const today = dayStart(localDay(new Date()));
    const [overdue, upcoming, billable] = await Promise.all([
      this.prisma.financialTransaction.groupBy({
        by: ['type'],
        where: { tenantId, status: 'PENDENTE', dueDate: { lt: today } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.financialTransaction.findMany({
        where: { tenantId, status: 'PENDENTE' },
        orderBy: { dueDate: 'asc' },
        take: 8,
        include: { sale: { select: { patient: { select: { name: true } } } } },
      }),
      this.billable(),
    ]);
    const od = (t: string) => {
      const r = overdue.find((o) => o.type === t);
      return { total: r2(num(r?._sum.amount)), count: r?._count ?? 0 };
    };

    return {
      period: { from: p.from, to: p.to },
      previous: { from: p.prevFrom, to: p.prevTo },
      current: this.kpis(cur.sales, cur.paid, cur.pending),
      prev: this.kpis(prev.sales, prev.paid, prev.pending),
      appointmentsDone: cur.done,
      appointmentsDonePrev: prev.done,
      openingBalance,
      overdue: { receivable: od('RECEITA'), payable: od('DESPESA') },
      series,
      byProcedure,
      byPayment,
      byProfessional,
      upcoming: upcoming.map((t) => this.txDto(t)),
      billable: { count: billable.length, total: r2(billable.reduce((s, b) => s + b.total, 0)) },
    };
  }

  // ------------------------------------------------------------ vendas

  private saleDto(s: any) {
    const txs = [...(s.financialTransactions ?? [])].sort((a: any, b: any) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0));
    const live = txs.filter((t: any) => t.status !== 'CANCELADO');
    return {
      id: s.id,
      date: s.createdAt,
      status: s.status,
      method: s.paymentType,
      total: num(s.totalAmount),
      discount: num(s.discount),
      notes: s.notes,
      appointmentId: s.appointmentId,
      patient: { id: s.patientId, name: s.patient?.name ?? '—' },
      professional: s.user?.name ?? '',
      items: s.items.map((i: any) => ({ id: i.id, name: i.name, quantity: i.quantity, price: num(i.price), cost: num(i.cost) })),
      installments: live.length,
      paidAmount: r2(live.filter((t: any) => t.status === 'PAGO').reduce((a: number, t: any) => a + num(t.amount), 0)),
      pendingAmount: r2(live.filter((t: any) => t.status === 'PENDENTE').reduce((a: number, t: any) => a + num(t.amount), 0)),
      transactions: txs.map((t: any) => this.txDto(t)),
    };
  }

  async listSales(from?: string, to?: string, q?: string, status?: string) {
    const p = this.period(from, to);
    const tenantId = await this.tenantId();
    const where: any = { tenantId, createdAt: { gte: dayStart(p.from), lte: dayEnd(p.to) } };
    if (status && ['PAGO', 'PENDENTE', 'CANCELADO'].includes(status)) where.status = status;
    if (q?.trim()) where.patient = { name: { contains: q.trim(), mode: 'insensitive' } };
    const rows = await this.prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { patient: { select: { name: true } }, items: true, user: { select: { name: true } }, financialTransactions: true },
    });
    return rows.map((s) => this.saleDto(s));
  }

  async createSale(body: any) {
    const tenantId = await this.tenantId();
    const patient = body.patientId ? await this.prisma.patient.findUnique({ where: { id: body.patientId } }) : null;
    if (!patient) throw new NotFoundException('Selecione um cliente cadastrado.');
    if (!patient.active) throw new BadRequestException('O cadastro deste cliente está inativo.');

    const raw = Array.isArray(body.items) ? body.items : [];
    if (!raw.length) throw new BadRequestException('Adicione ao menos um item à venda.');
    const procIds = raw.map((i: any) => i.procedureId).filter(Boolean);
    const procs = procIds.length ? await this.prisma.procedure.findMany({ where: { id: { in: procIds } } }) : [];

    const items = raw.map((i: any) => {
      const proc = i.procedureId ? procs.find((p) => p.id === i.procedureId) : null;
      if (i.procedureId && !proc) throw new NotFoundException('Procedimento não encontrado.');
      const name = proc?.name ?? str(i.name, 160);
      const quantity = Math.round(Number(i.quantity) || 1);
      const price = i.price !== undefined && i.price !== '' ? Number(i.price) : proc?.price ?? NaN;
      if (!name) throw new BadRequestException('Todos os itens precisam de um nome.');
      if (quantity < 1 || quantity > 99) throw new BadRequestException('Quantidade inválida.');
      if (!Number.isFinite(price) || price < 0) throw new BadRequestException(`Preço inválido em "${name}".`);
      return { name, quantity, price: r2(price), cost: r2(num((proc as any)?.cost)), procedureId: proc?.id ?? null };
    });

    const subtotal = r2(items.reduce((s: number, i: any) => s + i.price * i.quantity, 0));
    const discount = r2(Math.min(Math.max(Number(body.discount) || 0, 0), subtotal));
    const total = r2(subtotal - discount);
    if (total <= 0) throw new BadRequestException('O total da venda deve ser maior que zero.');

    const method = METHODS.includes(body.method) ? body.method : 'PIX';
    let installments = Math.round(Number(body.installments) || 1);
    if (SINGLE_PAYMENT.includes(method)) installments = 1;
    if (installments < 1 || installments > 12) throw new BadRequestException('Parcelas devem ficar entre 1 e 12.');
    const paidNow = !!body.paid;
    const today = localDay(new Date());
    const firstDue = body.firstDueDate && DAY_RE.test(body.firstDueDate) ? body.firstDueDate : today;

    if (body.appointmentId) {
      const exists = await this.prisma.sale.findFirst({
        where: { appointmentId: body.appointmentId } as any,
        select: { id: true },
      });
      if (exists) throw new ConflictException('Este atendimento já foi faturado.');
    }
    const user = await this.author(body.userId);
    const parts = split(total, installments);

    const created = await this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          tenantId,
          patientId: patient.id,
          userId: user.id,
          totalAmount: total,
          discount,
          status: paidNow && installments === 1 ? 'PAGO' : 'PENDENTE',
          paymentType: method,
          notes: str(body.notes, 500) || null,
          ...(body.appointmentId ? ({ appointmentId: body.appointmentId } as any) : {}),
          items: { create: items },
        } as any,
      });
      await tx.financialTransaction.createMany({
        data: parts.map((amount, i) => ({
          tenantId,
          saleId: sale.id,
          description: `Venda — ${patient.name}${installments > 1 ? ` (${i + 1}/${installments})` : ''}`,
          amount,
          type: 'RECEITA',
          category: 'Procedimentos',
          paymentMethod: method,
          dueDate: dayStart(addMonths(paidNow && i === 0 ? today : firstDue, paidNow && i === 0 ? 0 : i)),
          status: paidNow && i === 0 ? 'PAGO' : 'PENDENTE',
          paymentDate: paidNow && i === 0 ? new Date() : null,
          installmentNumber: i + 1,
          installmentTotal: installments,
        })),
      });
      return tx.sale.findUnique({
        where: { id: sale.id },
        include: { patient: { select: { name: true } }, items: true, user: { select: { name: true } }, financialTransactions: true },
      });
    });
    return this.saleDto(created);
  }

  async cancelSale(id: string) {
    const sale = await this.prisma.sale.findUnique({ where: { id }, include: { financialTransactions: true, patient: { select: { name: true } } } });
    if (!sale) throw new NotFoundException('Venda não encontrada.');
    if (sale.status === 'CANCELADO') throw new ConflictException('Esta venda já está cancelada.');
    const paid = sale.financialTransactions.filter((t) => t.status === 'PAGO').reduce((s, t) => s + num(t.amount), 0);
    await this.prisma.$transaction(async (tx) => {
      await tx.sale.update({ where: { id }, data: { status: 'CANCELADO' } });
      await tx.financialTransaction.updateMany({ where: { saleId: id, status: 'PENDENTE' }, data: { status: 'CANCELADO' } });
      if (paid > 0) {
        await tx.financialTransaction.create({
          data: {
            tenantId: sale.tenantId,
            description: `Estorno — venda de ${sale.patient.name}`,
            amount: r2(paid),
            type: 'DESPESA',
            category: 'Estornos',
            status: 'PAGO',
            dueDate: new Date(),
            paymentDate: new Date(),
            paymentMethod: sale.paymentType,
          },
        });
      }
    });
    return { cancelled: true, refunded: r2(paid) };
  }

  /** Atendimentos concluídos (últimos 120 dias) que ainda não viraram venda. */
  async billable() {
    const tenantId = await this.tenantId();
    const since = new Date(Date.now() - 120 * DAY_MS);
    const appts = await this.prisma.appointment.findMany({
      where: { tenantId, type: 'APPOINTMENT', status: { in: DONE }, patientId: { not: null }, date: { gte: since } },
      orderBy: { date: 'desc' },
      take: 100,
      include: { patient: { select: { id: true, name: true } }, items: true, procedure: true },
    });
    if (!appts.length) return [];
    const billed = await this.prisma.$queryRaw<Array<{ appointmentId: string }>>`
      SELECT DISTINCT "appointmentId"
      FROM "Sale"
      WHERE "tenantId" = ${tenantId}
        AND "appointmentId" IS NOT NULL
    `;
    const set = new Set(billed.map((b) => b.appointmentId));
    return appts
      .filter((a) => !set.has(a.id))
      .map((a) => {
        const items = a.items.length
          ? a.items.map((i) => ({ procedureId: i.procedureId, name: i.name, quantity: 1, price: num(i.price) }))
          : a.procedure
            ? [{ procedureId: a.procedure.id, name: a.procedure.name, quantity: 1, price: num(a.procedure.price) }]
            : [];
        const subtotal = r2(items.reduce((s, i) => s + i.price, 0));
        const discount = Math.min(num(a.discount), subtotal);
        return {
          id: a.id,
          date: a.date,
          patient: a.patient,
          procedure: items.map((i) => i.name).join(' + '),
          items,
          discount,
          deposit: num(a.deposit),
          total: r2(subtotal - discount),
        };
      });
  }

  // ------------------------------------------------------------ lançamentos

  private txDto(t: any) {
    const overdue = t.status === 'PENDENTE' && t.dueDate < dayStart(localDay(new Date()));
    return {
      id: t.id,
      type: t.type,
      description: t.description,
      category: t.category,
      counterparty: t.counterparty ?? null,
      amount: num(t.amount),
      dueDate: t.dueDate,
      paymentDate: t.paymentDate,
      status: t.status,
      overdue,
      paymentMethod: t.paymentMethod,
      installmentNumber: t.installmentNumber,
      installmentTotal: t.installmentTotal,
      origin: t.saleId ? 'VENDA' : 'MANUAL',
      saleId: t.saleId,
      patientName: t.sale?.patient?.name ?? null,
    };
  }

  async listTransactions(from?: string, to?: string, type?: string, status?: string, q?: string) {
    const p = this.period(from, to);
    const tenantId = await this.tenantId();
    const today = dayStart(localDay(new Date()));
    const where: any = { tenantId, dueDate: { gte: dayStart(p.from), lte: dayEnd(p.to) }, status: { not: 'CANCELADO' } };
    if (type === 'RECEITA' || type === 'DESPESA') where.type = type;
    if (status === 'PAGO') where.status = 'PAGO';
    if (status === 'PENDENTE') where.status = 'PENDENTE';
    if (status === 'ATRASADO') {
      where.status = 'PENDENTE';
      where.dueDate = { gte: dayStart(p.from), lt: today < dayEnd(p.to) ? today : dayEnd(p.to) };
    }
    if (q?.trim()) where.OR = [
      { description: { contains: q.trim(), mode: 'insensitive' } },
      { category: { contains: q.trim(), mode: 'insensitive' } },
      { counterparty: { contains: q.trim(), mode: 'insensitive' } },
    ];
    const rows = await this.prisma.financialTransaction.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      take: 800,
      include: { sale: { select: { patient: { select: { name: true } } } } },
    });
    return rows.map((t) => this.txDto(t));
  }

  async createTransaction(body: any) {
    const tenantId = await this.tenantId();
    const type = body.type === 'DESPESA' ? 'DESPESA' : body.type === 'RECEITA' ? 'RECEITA' : null;
    if (!type) throw new BadRequestException('Informe se é receita ou despesa.');
    const description = str(body.description, 160);
    if (!description) throw new BadRequestException('Informe a descrição.');
    const amount = r2(Number(body.amount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) throw new BadRequestException('Valor inválido.');
    if (!DAY_RE.test(String(body.dueDate))) throw new BadRequestException('Informe a data de vencimento.');
    const repeat = Math.min(Math.max(Math.round(Number(body.repeat) || 0), 0), 23);
    const total = repeat + 1;
    const paidNow = !!body.paid;
    const method = METHODS.includes(body.paymentMethod) ? body.paymentMethod : null;
    const paymentDate = paidNow ? (DAY_RE.test(String(body.paymentDate)) ? dayStart(body.paymentDate) : new Date()) : null;

    await this.prisma.financialTransaction.createMany({
      data: Array.from({ length: total }, (_, i) => ({
        tenantId,
        description: total > 1 ? `${description} (${i + 1}/${total})` : description,
        amount,
        type,
        category: str(body.category, 60) || (type === 'DESPESA' ? 'Outros' : 'Outras receitas'),
        counterparty: str(body.counterparty, 120) || null,
        paymentMethod: method,
        dueDate: dayStart(addMonths(body.dueDate, i)),
        status: paidNow && i === 0 ? 'PAGO' : 'PENDENTE',
        paymentDate: paidNow && i === 0 ? paymentDate : null,
        installmentNumber: total > 1 ? i + 1 : null,
        installmentTotal: total > 1 ? total : null,
      })),
    });
    return { created: total };
  }

  async updateTransaction(id: string, body: any) {
    const t = await this.prisma.financialTransaction.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Lançamento não encontrado.');
    if (t.status === 'CANCELADO') throw new ConflictException('Lançamento cancelado não pode ser alterado.');
    const data: any = {};
    if (body.description !== undefined) {
      data.description = str(body.description, 160);
      if (!data.description) throw new BadRequestException('Informe a descrição.');
    }
    if (body.category !== undefined) data.category = str(body.category, 60) || t.category;
    if (body.counterparty !== undefined) data.counterparty = str(body.counterparty, 120) || null;
    if (body.amount !== undefined || body.dueDate !== undefined) {
      if (t.status !== 'PENDENTE') throw new ConflictException('Valor e vencimento só mudam em lançamentos pendentes. Reabra a baixa primeiro.');
      if (t.saleId && body.amount !== undefined) throw new ConflictException('O valor de parcelas de venda não pode ser alterado.');
      if (body.amount !== undefined) {
        const a = r2(Number(body.amount));
        if (!Number.isFinite(a) || a <= 0) throw new BadRequestException('Valor inválido.');
        data.amount = a;
      }
      if (body.dueDate !== undefined) {
        if (!DAY_RE.test(String(body.dueDate))) throw new BadRequestException('Vencimento inválido.');
        data.dueDate = dayStart(body.dueDate);
      }
    }
    const updated = await this.prisma.financialTransaction.update({ where: { id }, data, include: { sale: { select: { patient: { select: { name: true } } } } } });
    return this.txDto(updated);
  }

  private async syncSale(saleId: string | null) {
    if (!saleId) return;
    const txs = await this.prisma.financialTransaction.findMany({ where: { saleId, status: { not: 'CANCELADO' } } });
    const allPaid = txs.length > 0 && txs.every((t) => t.status === 'PAGO');
    await this.prisma.sale.updateMany({ where: { id: saleId, status: { not: 'CANCELADO' } }, data: { status: allPaid ? 'PAGO' : 'PENDENTE' } });
  }

  async pay(id: string, body: any) {
    const t = await this.prisma.financialTransaction.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Lançamento não encontrado.');
    if (t.status !== 'PENDENTE') throw new ConflictException('Este lançamento não está pendente.');
    const paymentDate = DAY_RE.test(String(body?.paymentDate)) ? dayStart(body.paymentDate) : new Date();
    if (paymentDate.getTime() > Date.now() + DAY_MS) throw new BadRequestException('A data da baixa não pode ser futura.');
    const updated = await this.prisma.financialTransaction.update({
      where: { id },
      data: { status: 'PAGO', paymentDate, paymentMethod: METHODS.includes(body?.paymentMethod) ? body.paymentMethod : t.paymentMethod },
      include: { sale: { select: { patient: { select: { name: true } } } } },
    });
    await this.syncSale(t.saleId);
    return this.txDto(updated);
  }

  async reopen(id: string) {
    const t = await this.prisma.financialTransaction.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Lançamento não encontrado.');
    if (t.status !== 'PAGO') throw new ConflictException('Só é possível reabrir lançamentos pagos.');
    const updated = await this.prisma.financialTransaction.update({
      where: { id },
      data: { status: 'PENDENTE', paymentDate: null },
      include: { sale: { select: { patient: { select: { name: true } } } } },
    });
    await this.syncSale(t.saleId);
    return this.txDto(updated);
  }

  async removeTransaction(id: string) {
    const t = await this.prisma.financialTransaction.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Lançamento não encontrado.');
    if (t.saleId) throw new ConflictException('Parcelas de venda são removidas cancelando a venda.');
    if (t.status === 'PAGO') throw new ConflictException('Reabra a baixa antes de excluir um lançamento pago.');
    await this.prisma.financialTransaction.delete({ where: { id } });
    return { deleted: true };
  }
}