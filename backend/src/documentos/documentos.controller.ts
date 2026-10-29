import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Patch,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard'; // ajuste para o guard real do seu projeto
import { DocumentosService } from './documentos.service';

type ReqHttp = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  user?: { id?: string; sub?: string; userId?: string; tenantId?: string };
};

/** IP e navegador de quem assina: evidência de autoria junto com data/hora e hash. */
function meta(req: ReqHttp) {
  const xff = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(xff) ? xff[0] : xff?.split(',')[0])?.trim() ?? req.ip;
  const ua = req.headers['user-agent'];
  return { ip, userAgent: Array.isArray(ua) ? ua[0] : ua };
}

/* ═══════════════ Área logada ═══════════════ */

@UseGuards(AuthGuard)
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  private ctx(req: ReqHttp) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id ?? req.user?.sub ?? req.user?.userId;
    if (!tenantId || !userId) throw new UnauthorizedException('Usuário não identificado no token.');
    return { tenantId, userId };
  }

  // ── Rotas estáticas ANTES de ':id' ───────────────────────────

  @Get('resumo')
  resumo(@Req() req: ReqHttp) {
    return this.service.resumo(this.ctx(req).tenantId);
  }

  @Get('conformidade')
  conformidade(@Req() req: ReqHttp) {
    return this.service.conformidade(this.ctx(req).tenantId);
  }

  @Get('pacientes')
  pacientes(@Req() req: ReqHttp, @Query('search') search?: string) {
    return this.service.pacientes(this.ctx(req).tenantId, search);
  }

  @Get('modelos')
  modelos(@Req() req: ReqHttp) {
    return this.service.modelos(this.ctx(req).tenantId);
  }

  @Post('modelos')
  criarModelo(@Req() req: ReqHttp, @Body() body: Record<string, unknown>) {
    return this.service.criarModelo(this.ctx(req).tenantId, body);
  }

  @Put('modelos/:id')
  atualizarModelo(@Req() req: ReqHttp, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.atualizarModelo(this.ctx(req).tenantId, id, body);
  }

  @Delete('modelos/:id')
  @HttpCode(204)
  async excluirModelo(@Req() req: ReqHttp, @Param('id') id: string) {
    await this.service.excluirModelo(this.ctx(req).tenantId, id);
  }

  @Post('anexar')
  anexar(@Req() req: ReqHttp, @Body() body: Record<string, unknown>) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.anexar(tenantId, userId, body);
  }

  @Post('solicitar')
  solicitar(@Req() req: ReqHttp, @Body() body: Record<string, unknown>) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.solicitar(tenantId, userId, body);
  }

  // ── Documentos ───────────────────────────────────────────────

  @Get()
  listar(@Req() req: ReqHttp, @Query() q: Record<string, string>) {
    return this.service.listar(this.ctx(req).tenantId, q);
  }

  @Post()
  criar(@Req() req: ReqHttp, @Body() body: Record<string, unknown>) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.criar(tenantId, userId, body);
  }

  @Get(':id')
  obter(@Req() req: ReqHttp, @Param('id') id: string) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.obter(tenantId, userId, id);
  }

  @Patch(':id')
  atualizar(@Req() req: ReqHttp, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.atualizar(tenantId, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async excluir(@Req() req: ReqHttp, @Param('id') id: string) {
    const { tenantId, userId } = this.ctx(req);
    await this.service.excluir(tenantId, userId, id);
  }

  @Post(':id/assinar')
  assinar(@Req() req: ReqHttp, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.assinar(tenantId, userId, id, body, meta(req));
  }

  @Post(':id/link')
  gerarLink(@Req() req: ReqHttp, @Param('id') id: string, @Body('dias') dias?: number) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.gerarLink(tenantId, userId, id, dias);
  }

  @Delete(':id/link')
  revogarLink(@Req() req: ReqHttp, @Param('id') id: string) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.revogarLink(tenantId, userId, id);
  }

  @Post(':id/cancelar')
  cancelar(@Req() req: ReqHttp, @Param('id') id: string, @Body('motivo') motivo: string) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.cancelar(tenantId, userId, id, motivo);
  }

  @Get(':id/verificar')
  verificar(@Req() req: ReqHttp, @Param('id') id: string) {
    return this.service.verificar(this.ctx(req).tenantId, id);
  }
}

/* ═══════════════ Páginas públicas (o paciente abre o link, sem login) ═══════════════
 * A autorização é o próprio token: aleatório (192 bits), de uso único e com validade.
 * Recomendado: limitar requisições com @nestjs/throttler. */

@Controller('documentos/publico')
export class DocumentosPublicoController {
  constructor(private readonly service: DocumentosService) {}

  @Get(':token')
  obter(@Param('token') token: string) {
    return this.service.publicoObter(token);
  }

  @Post(':token/assinar')
  @HttpCode(200)
  assinar(@Req() req: ReqHttp, @Param('token') token: string, @Body() body: Record<string, unknown>) {
    return this.service.publicoAssinar(token, body, meta(req));
  }
}