
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TipoMov } from "@prisma/client";

const TZ = "America/Sao_Paulo";
const DIA_MS = 86_400_000;

@Injectable()
export class RecursosService {
  constructor(private readonly prisma: PrismaService) {}

  private hojeISO(): string {
    return new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
  }

  private diasAte(data: Date): number {
    return Math.ceil(
      (new Date(data).getTime() - Date.now()) / DIA_MS,
    );
  }

  private quando(data: Date): string {
    const dia = (d: Date) =>
      d.toLocaleDateString("sv-SE", { timeZone: TZ });

    const hora = data.toLocaleTimeString("pt-BR", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
    });

    if (dia(data) === this.hojeISO()) return `Hoje ${hora}`;

    if (
      dia(data) ===
      dia(new Date(Date.now() - DIA_MS))
    ) {
      return `Ontem ${hora}`;
    }

    return data.toLocaleDateString("pt-BR", {
      timeZone: TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  private validarData(valor: unknown, campo: string): Date {
    const texto = String(valor ?? "").trim();

    if (!texto) {
      throw new BadRequestException(`${campo} é obrigatório.`);
    }

    const data = new Date(`${texto.slice(0, 10)}T12:00:00.000Z`);

    if (Number.isNaN(data.getTime())) {
      throw new BadRequestException(`${campo} é inválido.`);
    }

    return data;
  }

  private async exigirInsumo(
    unidadeId: string,
    insumoId: string,
    tx: any = this.prisma,
  ) {
    const insumo = await tx.insumo.findFirst({
      where: { id: insumoId, unidadeId },
    });

    if (!insumo) {
      throw new NotFoundException("Insumo não encontrado nesta unidade.");
    }

    return insumo;
  }

  // =========================================================
  // DASHBOARD
  // =========================================================

  async carregarRecursos(unidadeId: string) {
    const hoje = this.hojeISO();

    const [
      insumos,
      aparelhos,
      docs,
      itens,
      ciclos,
      movs,
      pedidos,
      fornecedores,
      caixa,
    ] = await Promise.all([
      this.prisma.insumo.findMany({
        where: { unidadeId, ativo: true },
        orderBy: { nome: "asc" },
        include: {
          lotes: {
            where: { qtd: { gt: 0 } },
            orderBy: { validade: "asc" },
          },
        },
      }),
      this.prisma.aparelho.findMany({
        where: { unidadeId },
        orderBy: { nome: "asc" },
      }),
      this.prisma.documentoRegulatorio.findMany({
        where: { unidadeId },
        orderBy: { validade: "asc" },
      }),
      this.prisma.checklistItem.findMany({
        where: { unidadeId },
        orderBy: { ordem: "asc" },
        include: {
          registros: { where: { data: hoje } },
        },
      }),
      this.prisma.cicloEsterilizacao.findMany({
        where: { unidadeId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      this.prisma.movimentacao.findMany({
        where: { unidadeId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          insumo: { select: { nome: true, unidade: true } },
        },
      }),
      this.prisma.pedidoCompra.findMany({
        where: { unidadeId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          itens: {
            include: {
              insumo: { select: { nome: true, unidade: true } },
            },
          },
          fornecedor: { select: { nome: true } },
        },
      }),
      this.prisma.fornecedor.findMany({
        where: { unidadeId },
        orderBy: { nome: "asc" },
      }),
      this.prisma.caixaPerfurocortante.findUnique({
        where: { unidadeId },
      }),
    ]);

    return {
      insumos: insumos.map((i) => ({
        id: i.id,
        nome: i.nome,
        cat: i.categoria,
        fab: i.fabricante ?? "—",
        anvisa: i.registroAnvisa ?? "—",
        un: i.unidade,
        min: i.estoqueMin,
        max: i.estoqueMax,
        custo: Number(i.custoUnit),
        consumoSem: i.consumoSemanal,
        forn: i.fornecedorId ?? "",
        estoqueAtual: i.lotes.reduce((s, l) => s + l.qtd, 0),
        lotes: i.lotes.map((l) => ({
          id: l.id,
          lote: l.codigo,
          dias: this.diasAte(l.validade),
          validade: l.validade,
          qtd: l.qtd,
        })),
      })),

      aparelhos: aparelhos.map((a) => ({
        id: a.id,
        nome: a.nome,
        marca: a.marca ?? "—",
        serie: a.serie ?? "—",
        anvisa: a.registroAnvisa ?? "—",
        status:
          a.status === "OPERACIONAL"
            ? "ok"
            : a.status === "MANUTENCAO"
              ? "manutencao"
              : "inativo",
        uso: a.usoAtual,
        vida: a.vidaUtil,
        unidade: a.unidadeUso,
        porSessao: a.usoPorSessao,
        calDias: a.proximaCalibracao
          ? this.diasAte(a.proximaCalibracao)
          : 999,
        garantiaDias: a.garantiaAte
          ? this.diasAte(a.garantiaAte)
          : -1,
      })),

      docs: docs.map((d) => ({
        id: d.id,
        nome: d.nome,
        orgao: d.orgao,
        dias: this.diasAte(d.validade),
        validade: d.validade,
      })),

      fornecedores: fornecedores.map((f) => ({
        id: f.id,
        nome: f.nome,
        contato: f.contato ?? "—",
        prazo: f.prazoEntrega ?? "—",
        fone: (f.telefone ?? "").replace(/\D/g, ""),
      })),

      check: itens.map((c) => ({
        id: c.id,
        t: c.texto,
        ok: c.registros.length > 0,
      })),

      ciclos: ciclos.map((c) => ({
        id: c.id,
        data: this.quando(c.createdAt),
        ciclo: c.ciclo,
        ib: c.indicador,
        res: c.resultado,
      })),

      movs: movs.map((m) => ({
        id: m.id,
        insumoId: m.insumoId,
        nome: m.insumo.nome,
        tipo: m.tipo.toLowerCase(),
        qtd: m.qtd,
        quantidade: m.qtd,
        un: m.insumo.unidade,
        motivo: m.motivo ?? "—",
        quando: this.quando(m.createdAt),
        createdAt: m.createdAt,
      })),

      pedidos: pedidos.map((p) => ({
        id: p.id,
        numero: p.numero,
        fornecedorId: p.fornecedorId,
        fornecedor: p.fornecedor?.nome ?? "",
        forn: p.fornecedor?.nome ?? "",
        total: Number(p.total),
        status: p.status.toLowerCase(),
        dataPedido: p.createdAt,
        itens: p.itens.map((i) => ({
          id: i.insumoId,
          insumoId: i.insumoId,
          nome: i.insumo.nome,
          qtd: i.qtd,
          quantidade: i.qtd,
          custoUnitario: Number(i.custoUnit),
          un: i.insumo.unidade,
        })),
      })),

      descarte: caixa?.nivel ?? 0,
      coletaDias: caixa?.proximaColeta
        ? Math.max(0, this.diasAte(caixa.proximaColeta))
        : 14,
    };
  }

  // =========================================================
  // INSUMOS
  // =========================================================

  async listarInsumos(unidadeId: string) {
    const dados = await this.carregarRecursos(unidadeId);
    return dados.insumos;
  }

  async criarInsumo(unidadeId: string, dto: any) {
    const nome = String(dto.nome ?? "").trim();
    const categoria = String(dto.categoria ?? dto.cat ?? "").trim();
    const unidade = String(dto.unidade ?? dto.un ?? "un").trim();
    const fabricante = String(dto.fabricante ?? dto.fab ?? "").trim();
    const custoUnit = Number(
      dto.custoUnitario ?? dto.custoUnit ?? dto.custo ?? 0,
    );
    const estoqueInicial = Number(
      dto.estoqueAtual ?? dto.estoqueInicial ?? dto.estoque ?? 0,
    );
    const estoqueMin = Number(
      dto.estoqueMinimo ?? dto.estoqueMin ?? dto.min ?? 0,
    );
    const estoqueMax = Number(
      dto.estoqueMaximo ?? dto.estoqueMax ?? dto.max ?? estoqueInicial,
    );
    const loteCodigo = String(dto.lote ?? "").trim();

    if (!nome || !categoria || !unidade) {
      throw new BadRequestException(
        "Nome, categoria e unidade são obrigatórios.",
      );
    }

    if (
      !Number.isFinite(custoUnit) ||
      custoUnit < 0 ||
      !Number.isInteger(estoqueInicial) ||
      !Number.isInteger(estoqueMin) ||
      !Number.isInteger(estoqueMax) ||
      estoqueInicial < 0 ||
      estoqueMin < 0 ||
      estoqueMax < 0
    ) {
      throw new BadRequestException("Confira o custo e as quantidades.");
    }

    let validade: Date | undefined;

    if (dto.validade) {
      validade = this.validarData(dto.validade, "Validade");
    }

    if (estoqueInicial > 0 && (!loteCodigo || !validade)) {
      throw new BadRequestException(
        "Informe lote e validade para o estoque inicial.",
      );
    }

    if (dto.fornecedorId || dto.forn) {
      const fornecedor = await this.prisma.fornecedor.findFirst({
        where: {
          id: String(dto.fornecedorId ?? dto.forn),
          unidadeId,
        },
      });

      if (!fornecedor) {
        throw new BadRequestException(
          "Fornecedor não encontrado nesta unidade.",
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const insumo = await tx.insumo.create({
        data: {
          unidadeId,
          nome,
          categoria,
          unidade,
          fabricante: fabricante || null,
          registroAnvisa: dto.anvisa ?? dto.registroAnvisa ?? null,
          estoqueMin,
          estoqueMax,
          custoUnit,
          consumoSemanal: Number(dto.consumoSemanal ?? dto.consumo ?? 0),
          fornecedorId: dto.fornecedorId || dto.forn || null,
          ativo: true,
        },
      });

      if (estoqueInicial > 0 && validade) {
        await tx.lote.create({
          data: {
            insumoId: insumo.id,
            codigo: loteCodigo,
            validade,
            qtd: estoqueInicial,
          },
        });

        await tx.movimentacao.create({
          data: {
            unidadeId,
            insumoId: insumo.id,
            tipo: "ENTRADA",
            qtd: estoqueInicial,
            loteCodigo,
            motivo: "Estoque inicial do cadastro",
          },
        });
      }

      return insumo;
    });
  }

  async atualizarInsumo(unidadeId: string, id: string, dto: any) {
    const atual = await this.prisma.insumo.findFirst({
      where: { id, unidadeId },
    });

    if (!atual) throw new NotFoundException("Insumo não encontrado.");

    const data: any = {};

    if (dto.nome !== undefined) data.nome = String(dto.nome).trim();
    if (dto.categoria !== undefined || dto.cat !== undefined) {
      data.categoria = String(dto.categoria ?? dto.cat).trim();
    }
    if (dto.unidade !== undefined || dto.un !== undefined) {
      data.unidade = String(dto.unidade ?? dto.un).trim();
    }
    if (dto.fabricante !== undefined || dto.fab !== undefined) {
      data.fabricante = dto.fabricante ?? dto.fab ?? null;
    }
    if (dto.anvisa !== undefined || dto.registroAnvisa !== undefined) {
      data.registroAnvisa = dto.anvisa ?? dto.registroAnvisa ?? null;
    }
    if (dto.estoqueMinimo !== undefined || dto.estoqueMin !== undefined || dto.min !== undefined) {
      data.estoqueMin = Number(dto.estoqueMinimo ?? dto.estoqueMin ?? dto.min);
    }
    if (dto.estoqueMaximo !== undefined || dto.estoqueMax !== undefined || dto.max !== undefined) {
      data.estoqueMax = Number(dto.estoqueMaximo ?? dto.estoqueMax ?? dto.max);
    }
    if (dto.custoUnitario !== undefined || dto.custoUnit !== undefined || dto.custo !== undefined) {
      data.custoUnit = Number(dto.custoUnitario ?? dto.custoUnit ?? dto.custo);
    }
    if (dto.consumoSemanal !== undefined || dto.consumo !== undefined) {
      data.consumoSemanal = Number(dto.consumoSemanal ?? dto.consumo);
    }
    if (dto.fornecedorId !== undefined || dto.forn !== undefined) {
      const fornecedorId = dto.fornecedorId ?? dto.forn ?? null;

      if (fornecedorId) {
        const fornecedor = await this.prisma.fornecedor.findFirst({
          where: { id: String(fornecedorId), unidadeId },
        });
        if (!fornecedor) {
          throw new BadRequestException("Fornecedor não encontrado.");
        }
      }

      data.fornecedorId = fornecedorId;
    }

    if (
      (data.estoqueMin !== undefined &&
        (!Number.isInteger(data.estoqueMin) || data.estoqueMin < 0)) ||
      (data.estoqueMax !== undefined &&
        (!Number.isInteger(data.estoqueMax) || data.estoqueMax < 0)) ||
      (data.custoUnit !== undefined &&
        (!Number.isFinite(data.custoUnit) || data.custoUnit < 0))
    ) {
      throw new BadRequestException("Valores numéricos inválidos.");
    }

    return this.prisma.insumo.update({
      where: { id: atual.id },
      data,
    });
  }

  async excluirInsumo(unidadeId: string, id: string) {
    const insumo = await this.prisma.insumo.findFirst({
      where: { id, unidadeId },
    });

    if (!insumo) throw new NotFoundException("Insumo não encontrado.");

    // Preserva o histórico de movimentações e lotes.
    return this.prisma.insumo.update({
      where: { id },
      data: { ativo: false },
    });
  }

  // =========================================================
  // MOVIMENTAÇÕES DE ESTOQUE
  // =========================================================

  async listarMovimentacoes(unidadeId: string) {
    const movs = await this.prisma.movimentacao.findMany({
      where: { unidadeId },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        insumo: { select: { nome: true, unidade: true } },
      },
    });

    return movs.map((m) => ({
      id: m.id,
      insumoId: m.insumoId,
      nome: m.insumo.nome,
      tipo: m.tipo.toLowerCase(),
      qtd: m.qtd,
      quantidade: m.qtd,
      un: m.insumo.unidade,
      lote: m.loteCodigo ?? "",
      motivo: m.motivo ?? "",
      quando: this.quando(m.createdAt),
      createdAt: m.createdAt,
    }));
  }

  async movimentar(unidadeId: string, dto: any) {
    const insumoId = String(dto.insumoId ?? "").trim();
    const tipo = String(dto.tipo ?? "").trim().toUpperCase();
    const quantidade = Number(dto.qtd ?? dto.quantidade);

    if (!insumoId) throw new BadRequestException("Selecione um insumo.");

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new BadRequestException(
        "A quantidade deve ser um número inteiro maior que zero.",
      );
    }

    if (!["ENTRADA", "SAIDA", "DESCARTE"].includes(tipo)) {
      throw new BadRequestException("Tipo de movimentação inválido.");
    }

    return this.prisma.$transaction(async (tx) => {
      await this.exigirInsumo(unidadeId, insumoId, tx);

      const codigoLote = String(dto.lote ?? "").trim();
      let loteCodigo: string | null = codigoLote || null;

      if (tipo === "ENTRADA") {
        const validadeTexto = String(dto.validade ?? "").trim();

        if (!codigoLote || !validadeTexto) {
          throw new BadRequestException(
            "Lote e validade são obrigatórios para entrada.",
          );
        }

        const validade = this.validarData(validadeTexto, "Validade");
        const existente = await tx.lote.findFirst({
          where: { insumoId, codigo: codigoLote },
        });

        if (existente) {
          if (
            existente.validade.toISOString().slice(0, 10) !==
            validade.toISOString().slice(0, 10)
          ) {
            throw new BadRequestException(
              "O lote já existe com uma validade diferente.",
            );
          }

          await tx.lote.update({
            where: { id: existente.id },
            data: { qtd: { increment: quantidade } },
          });
        } else {
          await tx.lote.create({
            data: {
              insumoId,
              codigo: codigoLote,
              validade,
              qtd: quantidade,
            },
          });
        }
      } else {
        const lotes = await tx.lote.findMany({
          where: {
            insumoId,
            qtd: { gt: 0 },
            ...(codigoLote && codigoLote !== "auto"
              ? { codigo: codigoLote }
              : {}),
          },
          orderBy: { validade: "asc" },
        });

        const saldo = lotes.reduce((s, lote) => s + lote.qtd, 0);

        if (saldo < quantidade) {
          throw new BadRequestException(
            "Saldo insuficiente nos lotes para esta baixa.",
          );
        }

        let restante = quantidade;

        for (const lote of lotes) {
          if (restante <= 0) break;

          const baixar = Math.min(lote.qtd, restante);

          await tx.lote.update({
            where: { id: lote.id },
            data: { qtd: { decrement: baixar } },
          });

          restante -= baixar;
        }
      }

      return tx.movimentacao.create({
        data: {
          unidadeId,
          insumoId,
          tipo: tipo as TipoMov,
          qtd: quantidade,
          loteCodigo,
          motivo: dto.motivo ? String(dto.motivo) : null,
        },
      });
    });
  }

  // =========================================================
  // APARELHOS
  // =========================================================

  async listarAparelhos(unidadeId: string) {
    const dados = await this.carregarRecursos(unidadeId);
    return dados.aparelhos;
  }

  async criarAparelho(unidadeId: string, dto: any) {
    const nome = String(dto.nome ?? "").trim();

    if (!nome) throw new BadRequestException("Nome do aparelho é obrigatório.");

    const statusInformado = String(dto.status ?? "OPERACIONAL").toUpperCase();
    const status =
      statusInformado === "MANUTENCAO" ||
      statusInformado === "MANUTENÇÃO"
        ? "MANUTENCAO"
        : statusInformado === "INATIVO"
          ? "INATIVO"
          : "OPERACIONAL";

    const data: any = {
      unidadeId,
      nome,
      marca: dto.marca ? String(dto.marca) : null,
      serie: dto.serie ? String(dto.serie) : null,
      registroAnvisa: dto.anvisa ?? dto.registroAnvisa ?? null,
      status,
      usoAtual: Number(dto.uso ?? dto.usoAtual ?? 0),
      vidaUtil: Number(dto.vida ?? dto.vidaUtil ?? 1),
      unidadeUso: String(dto.unidadeUso ?? dto.unidade ?? "disparos"),
      usoPorSessao: Number(dto.porSessao ?? dto.usoPorSessao ?? 1),
      proximaCalibracao: dto.proximaCalibracao
        ? this.validarData(dto.proximaCalibracao, "Próxima calibração")
        : null,
      garantiaAte: dto.garantiaAte
        ? this.validarData(dto.garantiaAte, "Garantia")
        : null,
    };

    if (
      !Number.isInteger(data.usoAtual) ||
      data.usoAtual < 0 ||
      !Number.isInteger(data.vidaUtil) ||
      data.vidaUtil < 1 ||
      !Number.isInteger(data.usoPorSessao) ||
      data.usoPorSessao < 1
    ) {
      throw new BadRequestException("Valores de uso do aparelho inválidos.");
    }

    return this.prisma.aparelho.create({ data });
  }

  async atualizarAparelho(unidadeId: string, id: string, dto: any) {
    const atual = await this.prisma.aparelho.findFirst({
      where: { id, unidadeId },
    });

    if (!atual) throw new NotFoundException("Aparelho não encontrado.");

    const data: any = {};

    if (dto.nome !== undefined) data.nome = String(dto.nome).trim();
    if (dto.marca !== undefined) data.marca = dto.marca || null;
    if (dto.serie !== undefined) data.serie = dto.serie || null;
    if (dto.anvisa !== undefined || dto.registroAnvisa !== undefined) {
      data.registroAnvisa = dto.anvisa ?? dto.registroAnvisa ?? null;
    }
    if (dto.uso !== undefined || dto.usoAtual !== undefined) {
      data.usoAtual = Number(dto.uso ?? dto.usoAtual);
    }
    if (dto.vida !== undefined || dto.vidaUtil !== undefined) {
      data.vidaUtil = Number(dto.vida ?? dto.vidaUtil);
    }
    if (dto.unidadeUso !== undefined || dto.unidade !== undefined) {
      data.unidadeUso = String(dto.unidadeUso ?? dto.unidade);
    }
    if (dto.porSessao !== undefined || dto.usoPorSessao !== undefined) {
      data.usoPorSessao = Number(dto.porSessao ?? dto.usoPorSessao);
    }
    if (dto.proximaCalibracao !== undefined) {
      data.proximaCalibracao = dto.proximaCalibracao
        ? this.validarData(dto.proximaCalibracao, "Próxima calibração")
        : null;
    }
    if (dto.garantiaAte !== undefined) {
      data.garantiaAte = dto.garantiaAte
        ? this.validarData(dto.garantiaAte, "Garantia")
        : null;
    }
    if (dto.status !== undefined) {
      const status = String(dto.status).toUpperCase();
      data.status =
        status === "OK" || status === "OPERACIONAL"
          ? "OPERACIONAL"
          : status === "MANUTENCAO" || status === "MANUTENÇÃO"
            ? "MANUTENCAO"
            : "INATIVO";
    }

    return this.prisma.aparelho.update({
      where: { id: atual.id },
      data,
    });
  }

  async excluirAparelho(unidadeId: string, id: string) {
    const aparelho = await this.prisma.aparelho.findFirst({
      where: { id, unidadeId },
    });

    if (!aparelho) throw new NotFoundException("Aparelho não encontrado.");

    return this.prisma.aparelho.delete({
      where: { id: aparelho.id },
    });
  }

  async registrarUso(unidadeId: string, id: string) {
    const aparelho = await this.prisma.aparelho.findFirst({
      where: { id, unidadeId },
    });

    if (!aparelho) throw new NotFoundException("Aparelho não encontrado.");

    return this.prisma.aparelho.update({
      where: { id: aparelho.id },
      data: { usoAtual: { increment: aparelho.usoPorSessao } },
    });
  }

  async alternarManutencao(unidadeId: string, id: string) {
    const aparelho = await this.prisma.aparelho.findFirst({
      where: { id, unidadeId },
    });

    if (!aparelho) throw new NotFoundException("Aparelho não encontrado.");

    return this.prisma.aparelho.update({
      where: { id: aparelho.id },
      data: {
        status:
          aparelho.status === "MANUTENCAO"
            ? "OPERACIONAL"
            : "MANUTENCAO",
      },
    });
  }

  // =========================================================
  // BIOSSEGURANÇA / CHECKLIST / ESTERILIZAÇÃO
  // =========================================================

  async listarBiosseguranca(unidadeId: string) {
    const hoje = this.hojeISO();

    const [itens, ciclos] = await Promise.all([
      this.prisma.checklistItem.findMany({
        where: { unidadeId },
        orderBy: { ordem: "asc" },
        include: { registros: { where: { data: hoje } } },
      }),
      this.prisma.cicloEsterilizacao.findMany({
        where: { unidadeId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    return {
      checklist: itens.map((i) => ({
        id: i.id,
        texto: i.texto,
        t: i.texto,
        ordem: i.ordem,
        ok: i.registros.length > 0,
      })),
      ciclos: ciclos.map((c) => ({
        id: c.id,
        ciclo: c.ciclo,
        indicador: c.indicador,
        resultado: c.resultado,
        data: this.quando(c.createdAt),
        createdAt: c.createdAt,
      })),
    };
  }

  async registrarCiclo(unidadeId: string, dto: any = {}) {
    return this.prisma.cicloEsterilizacao.create({
      data: {
        unidadeId,
        ciclo: String(
          dto.ciclo ?? `C-${Date.now().toString().slice(-8)}`,
        ),
        indicador: String(dto.indicador ?? "Biológico Classe 5"),
        resultado: String(dto.resultado ?? "Aprovado"),
      },
    });
  }

  async alternarChecklist(
    unidadeId: string,
    itemId: string,
    ok: boolean,
  ) {
    const item = await this.prisma.checklistItem.findFirst({
      where: { id: itemId, unidadeId },
    });

    if (!item) throw new NotFoundException("Item do checklist não encontrado.");

    const data = this.hojeISO();

    if (ok) {
      return this.prisma.checklistRegistro.upsert({
        where: { itemId_data: { itemId, data } },
        create: { itemId, data },
        update: {},
      });
    }

    return this.prisma.checklistRegistro.deleteMany({
      where: { itemId, data },
    });
  }

  async reiniciarChecklist(unidadeId: string) {
    return this.prisma.checklistRegistro.deleteMany({
      where: {
        data: this.hojeISO(),
        item: { unidadeId },
      },
    });
  }

  // =========================================================
  // DOCUMENTOS REGULATÓRIOS
  // =========================================================

  async listarDocumentos(unidadeId: string) {
    const documentos = await this.prisma.documentoRegulatorio.findMany({
      where: { unidadeId },
      orderBy: { validade: "asc" },
    });

    return documentos.map((d) => ({
      id: d.id,
      nome: d.nome,
      orgao: d.orgao,
      validade: d.validade,
      dias: this.diasAte(d.validade),
    }));
  }

  async criarDocumento(unidadeId: string, dto: any) {
    const nome = String(dto.nome ?? "").trim();
    const orgao = String(dto.orgao ?? "").trim();

    if (!nome || !orgao) {
      throw new BadRequestException("Nome e órgão são obrigatórios.");
    }

    return this.prisma.documentoRegulatorio.create({
      data: {
        unidadeId,
        nome,
        orgao,
        validade: this.validarData(dto.validade, "Validade"),
      },
    });
  }

  async atualizarDocumento(unidadeId: string, id: string, dto: any) {
    const doc = await this.prisma.documentoRegulatorio.findFirst({
      where: { id, unidadeId },
    });

    if (!doc) throw new NotFoundException("Documento não encontrado.");

    const data: any = {};

    if (dto.nome !== undefined) data.nome = String(dto.nome).trim();
    if (dto.orgao !== undefined) data.orgao = String(dto.orgao).trim();
    if (dto.validade !== undefined) {
      data.validade = this.validarData(dto.validade, "Validade");
    }

    return this.prisma.documentoRegulatorio.update({
      where: { id: doc.id },
      data,
    });
  }

  async excluirDocumento(unidadeId: string, id: string) {
    const doc = await this.prisma.documentoRegulatorio.findFirst({
      where: { id, unidadeId },
    });

    if (!doc) throw new NotFoundException("Documento não encontrado.");

    return this.prisma.documentoRegulatorio.delete({
      where: { id: doc.id },
    });
  }

  async renovarDocumento(unidadeId: string, id: string) {
    const doc = await this.prisma.documentoRegulatorio.findFirst({
      where: { id, unidadeId },
    });

    if (!doc) throw new NotFoundException("Documento não encontrado.");

    const novaValidade = new Date(doc.validade);
    novaValidade.setFullYear(novaValidade.getFullYear() + 1);

    return this.prisma.documentoRegulatorio.update({
      where: { id: doc.id },
      data: { validade: novaValidade },
    });
  }

  // =========================================================
  // COMPRAS
  // =========================================================

  async listarCompras(unidadeId: string) {
    const pedidos = await this.prisma.pedidoCompra.findMany({
      where: { unidadeId },
      orderBy: { createdAt: "desc" },
      include: {
        fornecedor: { select: { nome: true } },
        itens: {
          include: {
            insumo: { select: { nome: true, unidade: true } },
          },
        },
      },
    });

    return pedidos.map((p) => ({
      id: p.id,
      numero: p.numero,
      fornecedorId: p.fornecedorId,
      fornecedor: p.fornecedor?.nome ?? "",
      forn: p.fornecedor?.nome ?? "",
      total: Number(p.total),
      status: p.status,
      dataPedido: p.createdAt,
      itens: p.itens.map((i) => ({
        id: i.insumoId,
        insumoId: i.insumoId,
        nome: i.insumo.nome,
        quantidade: i.qtd,
        qtd: i.qtd,
        custoUnitario: Number(i.custoUnit),
        un: i.insumo.unidade,
      })),
    }));
  }

  async criarCompra(unidadeId: string, dto: any) {
    const fornecedorId = String(
      dto.fornecedorId ?? dto.forn ?? "",
    ).trim();

    if (!fornecedorId) {
      throw new BadRequestException(
        "Selecione um fornecedor cadastrado para criar a compra.",
      );
    }

    const fornecedor = await this.prisma.fornecedor.findFirst({
      where: { id: fornecedorId, unidadeId },
    });

    if (!fornecedor) {
      throw new BadRequestException(
        "Fornecedor não encontrado nesta unidade.",
      );
    }

    const insumoId = String(dto.insumoId ?? "").trim();
    const quantidade = Number(dto.quantidade ?? dto.qtd);
    const custoUnitario = Number(dto.custoUnitario ?? dto.custoUnit ?? 0);

    if (!insumoId) throw new BadRequestException("Selecione um insumo.");

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new BadRequestException("Quantidade deve ser um inteiro positivo.");
    }

    if (!Number.isFinite(custoUnitario) || custoUnitario < 0) {
      throw new BadRequestException("Custo unitário inválido.");
    }

    await this.exigirInsumo(unidadeId, insumoId);

    const numero = `PC-${Date.now().toString().slice(-10)}`;

    return this.prisma.pedidoCompra.create({
      data: {
        unidadeId,
        numero,
        fornecedorId,
        status: "RASCUNHO",
        total: quantidade * custoUnitario,
        itens: {
          create: {
            insumoId,
            qtd: quantidade,
            custoUnit: custoUnitario,
          },
        },
      },
      include: {
        fornecedor: { select: { nome: true } },
        itens: true,
      },
    });
  }

  async atualizarCompra(unidadeId: string, id: string, dto: any) {
    const pedido = await this.prisma.pedidoCompra.findFirst({
      where: { id, unidadeId },
      include: { itens: true },
    });

    if (!pedido) throw new NotFoundException("Compra não encontrada.");

    if (pedido.status === "RECEBIDO") {
      throw new BadRequestException(
        "Não é possível editar uma compra já recebida.",
      );
    }

    const data: any = {};

    if (dto.status !== undefined) {
      const status = String(dto.status).toUpperCase();

      if (!["RASCUNHO", "ENVIADO"].includes(status)) {
        throw new BadRequestException("Status de compra inválido.");
      }

      data.status = status;
    }

    if (dto.fornecedorId !== undefined || dto.forn !== undefined) {
      const fornecedorId = String(dto.fornecedorId ?? dto.forn);

      const fornecedor = await this.prisma.fornecedor.findFirst({
        where: { id: fornecedorId, unidadeId },
      });

      if (!fornecedor) {
        throw new BadRequestException("Fornecedor não encontrado.");
      }

      data.fornecedorId = fornecedor.id;
    }

    // Alterar itens de um pedido existente requer atualizar PedidoItem
    // e recalcular o total numa transação; não substituímos os itens
    // silenciosamente neste endpoint.
    return this.prisma.pedidoCompra.update({
      where: { id: pedido.id },
      data,
      include: {
        fornecedor: { select: { nome: true } },
        itens: true,
      },
    });
  }

  async excluirCompra(unidadeId: string, id: string) {
    const pedido = await this.prisma.pedidoCompra.findFirst({
      where: { id, unidadeId },
    });

    if (!pedido) throw new NotFoundException("Compra não encontrada.");

    if (pedido.status === "RECEBIDO") {
      throw new BadRequestException(
        "Não é possível excluir uma compra recebida.",
      );
    }

    return this.prisma.pedidoCompra.delete({
      where: { id: pedido.id },
    });
  }

  async gerarPedidos(unidadeId: string) {
    const insumos = await this.prisma.insumo.findMany({
      where: { unidadeId, ativo: true },
      include: { lotes: true },
    });

    const reposicao = insumos.filter((i) => {
      const saldo = i.lotes.reduce((s, l) => s + l.qtd, 0);
      return saldo < i.estoqueMin && Boolean(i.fornecedorId);
    });

    if (!reposicao.length) return { criados: 0 };

    const porFornecedor = new Map<string, typeof reposicao>();

    for (const insumo of reposicao) {
      const fornecedorId = insumo.fornecedorId!;

      if (!porFornecedor.has(fornecedorId)) {
        porFornecedor.set(fornecedorId, []);
      }

      porFornecedor.get(fornecedorId)!.push(insumo);
    }

    let criados = 0;

    for (const [fornecedorId, itens] of porFornecedor) {
      const numero = `PC-${Date.now()}-${criados}`;

      const pedidoItens = itens.map((i) => {
        const saldo = i.lotes.reduce((s, l) => s + l.qtd, 0);
        return {
          insumoId: i.id,
          qtd: Math.max(0, i.estoqueMax - saldo),
          custoUnit: i.custoUnit,
        };
      }).filter((i) => i.qtd > 0);

      if (!pedidoItens.length) continue;

      const total = pedidoItens.reduce(
        (s, i) => s + i.qtd * Number(i.custoUnit),
        0,
      );

      await this.prisma.pedidoCompra.create({
        data: {
          unidadeId,
          numero,
          fornecedorId,
          status: "RASCUNHO",
          total,
          itens: { create: pedidoItens },
        },
      });

      criados++;
    }

    return { criados };
  }

  async marcarEnviado(unidadeId: string, id: string) {
    const pedido = await this.prisma.pedidoCompra.findFirst({
      where: { id, unidadeId },
    });

    if (!pedido) throw new NotFoundException("Pedido não encontrado.");

    if (pedido.status === "RECEBIDO") {
      throw new BadRequestException("O pedido já foi recebido.");
    }

    return this.prisma.pedidoCompra.update({
      where: { id: pedido.id },
      data: { status: "ENVIADO" },
    });
  }

  async receberPedido(unidadeId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const pedido = await tx.pedidoCompra.findFirst({
        where: { id, unidadeId },
        include: { itens: true },
      });

      if (!pedido) throw new NotFoundException("Pedido não encontrado.");

      if (pedido.status === "RECEBIDO") {
        throw new BadRequestException("Este pedido já foi recebido.");
      }

      const validadePadrao = new Date();
      validadePadrao.setFullYear(validadePadrao.getFullYear() + 1);

      for (const item of pedido.itens) {
        const loteCodigo = `AUTO-${pedido.numero}-${item.insumoId}`;

        const loteExistente = await tx.lote.findFirst({
          where: { insumoId: item.insumoId, codigo: loteCodigo },
        });

        if (loteExistente) {
          await tx.lote.update({
            where: { id: loteExistente.id },
            data: { qtd: { increment: item.qtd } },
          });
        } else {
          await tx.lote.create({
            data: {
              insumoId: item.insumoId,
              codigo: loteCodigo,
              validade: validadePadrao,
              qtd: item.qtd,
            },
          });
        }

        await tx.movimentacao.create({
          data: {
            unidadeId,
            insumoId: item.insumoId,
            tipo: "ENTRADA",
            qtd: item.qtd,
            loteCodigo,
            motivo: `Recebimento ${pedido.numero}`,
          },
        });
      }

      return tx.pedidoCompra.update({
        where: { id: pedido.id },
        data: { status: "RECEBIDO" },
      });
    });
  }

  // =========================================================
  // CAIXA DE PERFUROCORTANTES
  // =========================================================

  async ajustarCaixa(unidadeId: string, delta: number) {
    if (!Number.isInteger(delta)) {
      throw new BadRequestException("O ajuste deve ser um número inteiro.");
    }

    const caixa = await this.prisma.caixaPerfurocortante.findUnique({
      where: { unidadeId },
    });

    if (!caixa) {
      throw new NotFoundException(
        "Caixa de perfurocortantes não cadastrada para esta unidade.",
      );
    }

    if (caixa.nivel + delta < 0) {
      throw new BadRequestException("O nível da caixa não pode ficar negativo.");
    }

    return this.prisma.caixaPerfurocortante.update({
      where: { unidadeId },
      data: { nivel: { increment: delta } },
    });
  }

  async solicitarColeta(unidadeId: string) {
    const caixa = await this.prisma.caixaPerfurocortante.findUnique({
      where: { unidadeId },
    });

    if (!caixa) {
      throw new NotFoundException(
        "Caixa de perfurocortantes não cadastrada para esta unidade.",
      );
    }

    const proximaColeta = new Date();
    proximaColeta.setDate(proximaColeta.getDate() + 15);

    return this.prisma.caixaPerfurocortante.update({
      where: { unidadeId },
      data: { nivel: 0, proximaColeta },
    });
  }
}
