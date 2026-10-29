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
import { NotificacoesService } from './notificacoes.service';

type ReqUser = { user?: { id?: string; sub?: string; userId?: string; tenantId?: string } };

@UseGuards(AuthGuard)
@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly service: NotificacoesService) {}

  /** Tudo é restrito ao tenant e ao usuário do token. */
  private ctx(req: ReqUser) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id ?? req.user?.sub ?? req.user?.userId;
    if (!tenantId || !userId) throw new UnauthorizedException('Usuário não identificado no token.');
    return { tenantId, userId };
  }

  // ── Rotas estáticas ANTES de ':id' ───────────────────────────

  @Get('poll')
  poll(@Req() req: ReqUser, @Query('since') since?: string) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.poll(tenantId, userId, since);
  }

  @Get('resumo')
  resumo(@Req() req: ReqUser) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.resumo(tenantId, userId);
  }

  @Get('preferencias')
  preferencias(@Req() req: ReqUser) {
    return this.service.preferencias(this.ctx(req).userId);
  }

  @Put('preferencias')
  definirPreferencia(@Req() req: ReqUser, @Body() body: { tipo?: string; ativo?: boolean }) {
    return this.service.definirPreferencia(this.ctx(req).userId, body?.tipo, body?.ativo);
  }

  @Post('teste')
  teste(@Req() req: ReqUser) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.teste(tenantId, userId);
  }

  @Post('sincronizar')
  sincronizar(@Req() req: ReqUser) {
    return this.service.sincronizar(this.ctx(req).tenantId);
  }

  @Post('marcar-todas-lidas')
  marcarTodas(@Req() req: ReqUser, @Query('tipo') tipo?: string) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.marcarTodas(tenantId, userId, tipo);
  }

  @Delete('lidas')
  limparLidas(@Req() req: ReqUser) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.limparLidas(tenantId, userId);
  }

  // ── Coleção ──────────────────────────────────────────────────

  @Get()
  listar(@Req() req: ReqUser, @Query() q: Record<string, string>) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.listar(tenantId, userId, q);
  }

  @Patch(':id/lida')
  marcarLida(@Req() req: ReqUser, @Param('id') id: string, @Body() body: { lida?: boolean }) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.marcarLida(tenantId, userId, id, body?.lida !== false);
  }

  @Delete(':id')
  @HttpCode(204)
  async remover(@Req() req: ReqUser, @Param('id') id: string) {
    const { tenantId, userId } = this.ctx(req);
    await this.service.remover(tenantId, userId, id);
  }
}