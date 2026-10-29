
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { RecursosService } from "../recurses/recursos.service";

@Controller("recursos")
export class RecursosController {
  constructor(private readonly recursosService: RecursosService) {}

  private getUnidadeId(req: any): string {
    return req.user?.unidadeId || "matriz";
  }

  @Get()
  getDashboard(@Req() req: any) {
    return this.recursosService.carregarRecursos(this.getUnidadeId(req));
  }

  @Get("insumos")
  listarInsumos(@Req() req: any) {
    return this.recursosService.listarInsumos(this.getUnidadeId(req));
  }

  @Post("insumos")
  criarInsumo(@Req() req: any, @Body() body: any) {
    return this.recursosService.criarInsumo(this.getUnidadeId(req), body);
  }

  @Patch("insumos/:id")
  atualizarInsumo(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.recursosService.atualizarInsumo(
      this.getUnidadeId(req),
      id,
      body,
    );
  }

  @Delete("insumos/:id")
  excluirInsumo(@Req() req: any, @Param("id") id: string) {
    return this.recursosService.excluirInsumo(this.getUnidadeId(req), id);
  }

  @Get("movimentacoes")
  listarMovimentacoes(@Req() req: any) {
    return this.recursosService.listarMovimentacoes(this.getUnidadeId(req));
  }

  @Post("movimentacoes")
  movimentar(@Req() req: any, @Body() body: any) {
    return this.recursosService.movimentar(this.getUnidadeId(req), body);
  }

  @Get("aparelhos")
  listarAparelhos(@Req() req: any) {
    return this.recursosService.listarAparelhos(this.getUnidadeId(req));
  }

  @Post("aparelhos")
  criarAparelho(@Req() req: any, @Body() body: any) {
    return this.recursosService.criarAparelho(this.getUnidadeId(req), body);
  }

  @Patch("aparelhos/:id")
  atualizarAparelho(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.recursosService.atualizarAparelho(
      this.getUnidadeId(req),
      id,
      body,
    );
  }

  @Delete("aparelhos/:id")
  excluirAparelho(@Req() req: any, @Param("id") id: string) {
    return this.recursosService.excluirAparelho(this.getUnidadeId(req), id);
  }

  @Post("aparelhos/:id/uso")
  registrarUso(@Req() req: any, @Param("id") id: string) {
    return this.recursosService.registrarUso(this.getUnidadeId(req), id);
  }

  @Patch("aparelhos/:id/manutencao")
  alternarManutencao(@Req() req: any, @Param("id") id: string) {
    return this.recursosService.alternarManutencao(this.getUnidadeId(req), id);
  }

  @Get("biosseguranca")
  listarBiosseguranca(@Req() req: any) {
    return this.recursosService.listarBiosseguranca(this.getUnidadeId(req));
  }

  @Post("ciclos")
  registrarCiclo(@Req() req: any, @Body() body: any) {
    return this.recursosService.registrarCiclo(this.getUnidadeId(req), body);
  }

  @Put("checklist/:id")
  alternarChecklist(
    @Req() req: any,
    @Param("id") id: string,
    @Body("ok") ok: boolean,
  ) {
    return this.recursosService.alternarChecklist(
      this.getUnidadeId(req),
      id,
      ok,
    );
  }

  @Post("checklist/reiniciar")
  reiniciarChecklist(@Req() req: any) {
    return this.recursosService.reiniciarChecklist(this.getUnidadeId(req));
  }

  @Get("documentos")
  listarDocumentos(@Req() req: any) {
    return this.recursosService.listarDocumentos(this.getUnidadeId(req));
  }

  @Post("documentos")
  criarDocumento(@Req() req: any, @Body() body: any) {
    return this.recursosService.criarDocumento(this.getUnidadeId(req), body);
  }

  @Patch("documentos/:id")
  atualizarDocumento(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.recursosService.atualizarDocumento(
      this.getUnidadeId(req),
      id,
      body,
    );
  }

  @Delete("documentos/:id")
  excluirDocumento(@Req() req: any, @Param("id") id: string) {
    return this.recursosService.excluirDocumento(this.getUnidadeId(req), id);
  }

  @Post("documentos/:id/renovar")
  renovarDocumento(@Req() req: any, @Param("id") id: string) {
    return this.recursosService.renovarDocumento(this.getUnidadeId(req), id);
  }

  @Get("compras")
  listarCompras(@Req() req: any) {
    return this.recursosService.listarCompras(this.getUnidadeId(req));
  }

  @Post("compras")
  criarCompra(@Req() req: any, @Body() body: any) {
    return this.recursosService.criarCompra(this.getUnidadeId(req), body);
  }

  @Patch("compras/:id")
  atualizarCompra(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.recursosService.atualizarCompra(
      this.getUnidadeId(req),
      id,
      body,
    );
  }

  @Delete("compras/:id")
  excluirCompra(@Req() req: any, @Param("id") id: string) {
    return this.recursosService.excluirCompra(this.getUnidadeId(req), id);
  }

  @Post("pedidos/gerar")
  gerarPedidos(@Req() req: any) {
    return this.recursosService.gerarPedidos(this.getUnidadeId(req));
  }

  @Patch("pedidos/:id/enviar")
  marcarEnviado(@Req() req: any, @Param("id") id: string) {
    return this.recursosService.marcarEnviado(this.getUnidadeId(req), id);
  }

  @Patch("pedidos/:id/receber")
  receberPedido(@Req() req: any, @Param("id") id: string) {
    return this.recursosService.receberPedido(this.getUnidadeId(req), id);
  }

  @Post("caixa/ajuste")
  ajustarCaixa(@Req() req: any, @Body("delta") delta: number) {
    if (!Number.isInteger(Number(delta))) {
      throw new BadRequestException("O ajuste deve ser um número inteiro.");
    }
    return this.recursosService.ajustarCaixa(
      this.getUnidadeId(req),
      Number(delta),
    );
  }

  @Post("caixa/coleta")
  solicitarColeta(@Req() req: any) {
    return this.recursosService.solicitarColeta(this.getUnidadeId(req));
  }
}
