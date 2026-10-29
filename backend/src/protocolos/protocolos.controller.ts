import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard'; // ajuste para o guard real do seu projeto
import { ProtocolosService } from './protocolos.service';

type ReqUser = { user?: { tenantId?: string } };

@UseGuards(AuthGuard)
@Controller('protocolos')
export class ProtocolosController {
  constructor(private readonly service: ProtocolosService) {}

  /** Toda consulta é restrita ao tenant do usuário logado. */
  private tenantId(req: ReqUser): string {
    const id = req.user?.tenantId;
    if (!id) throw new UnauthorizedException('Tenant não identificado no token.');
    return id;
  }

  // ── Rotas estáticas ANTES de ':id' ───────────────────────────

  @Get('procedimentos')
  procedimentos(@Req() req: ReqUser) {
    return this.service.procedimentos(this.tenantId(req));
  }

  @Get('pacientes')
  pacientes(@Req() req: ReqUser, @Query('search') search?: string) {
    return this.service.pacientes(this.tenantId(req), search);
  }

  @Patch('aplicacoes/:id')
  acaoAplicacao(@Req() req: ReqUser, @Param('id') id: string, @Body('acao') acao: string) {
    return this.service.acaoAplicacao(this.tenantId(req), id, acao);
  }

  // ── Protocolos ───────────────────────────────────────────────

  @Get()
  listar(@Req() req: ReqUser) {
    return this.service.listar(this.tenantId(req));
  }

  @Get(':id')
  obter(@Req() req: ReqUser, @Param('id') id: string) {
    return this.service.obter(this.tenantId(req), id);
  }

  @Post()
  criar(@Req() req: ReqUser, @Body() body: Record<string, unknown>) {
    return this.service.criar(this.tenantId(req), body);
  }

  @Put(':id')
  atualizar(@Req() req: ReqUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.atualizar(this.tenantId(req), id, body);
  }

  @Patch(':id/ativo')
  alterarAtivo(@Req() req: ReqUser, @Param('id') id: string, @Body('active') active: boolean) {
    return this.service.alterarAtivo(this.tenantId(req), id, active);
  }

  @Post(':id/duplicar')
  duplicar(@Req() req: ReqUser, @Param('id') id: string) {
    return this.service.duplicar(this.tenantId(req), id);
  }

  @Post(':id/aplicar')
  aplicar(@Req() req: ReqUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.aplicar(this.tenantId(req), id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async excluir(@Req() req: ReqUser, @Param('id') id: string) {
    await this.service.excluir(this.tenantId(req), id);
  }
}