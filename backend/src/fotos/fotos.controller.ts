import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard'; // ajuste para o guard real do seu projeto
import { FotosService } from './fotos.service';

type ReqUser = { user?: { id?: string; sub?: string; userId?: string; tenantId?: string } };

@UseGuards(AuthGuard)
@Controller('fotos')
export class FotosController {
  constructor(private readonly service: FotosService) {}

  /** Tudo é restrito ao tenant do usuário logado; o userId alimenta a auditoria. */
  private ctx(req: ReqUser) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant não identificado no token.');
    return { tenantId, userId: req.user?.id ?? req.user?.sub ?? req.user?.userId };
  }

  // ── Rotas estáticas ANTES de ':id' ───────────────────────────

  @Get('resumo')
  resumo(@Req() req: ReqUser) {
    return this.service.resumo(this.ctx(req).tenantId);
  }

  @Get('pacientes')
  pacientes(@Req() req: ReqUser, @Query() q: Record<string, string>) {
    return this.service.pacientes(this.ctx(req).tenantId, q);
  }

  @Get('pacientes/:id')
  paciente(@Req() req: ReqUser, @Param('id') id: string) {
    return this.service.paciente(this.ctx(req).tenantId, id);
  }

  @Get('pacientes/:id/atendimentos')
  atendimentos(@Req() req: ReqUser, @Param('id') id: string) {
    return this.service.atendimentos(this.ctx(req).tenantId, id);
  }

  @Patch('lote')
  atualizarLote(@Req() req: ReqUser, @Body() body: Record<string, unknown>) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.atualizarLote(tenantId, userId, body);
  }

  @Post('excluir-lote')
  @HttpCode(200)
  excluirLote(@Req() req: ReqUser, @Body('ids') ids: string[]) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.excluirLote(tenantId, userId, Array.isArray(ids) ? ids : []);
  }

  // ── Fotos ────────────────────────────────────────────────────

  @Get()
  listar(@Req() req: ReqUser, @Query() q: Record<string, string>) {
    return this.service.listar(this.ctx(req).tenantId, q);
  }

  @Post()
  criar(@Req() req: ReqUser, @Body() body: Record<string, unknown>) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.criar(tenantId, userId, body);
  }

  @Get(':id')
  obter(@Req() req: ReqUser, @Param('id') id: string) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.obter(tenantId, userId, id);
  }

  @Patch(':id')
  atualizar(@Req() req: ReqUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const { tenantId, userId } = this.ctx(req);
    return this.service.atualizar(tenantId, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async excluir(@Req() req: ReqUser, @Param('id') id: string) {
    const { tenantId, userId } = this.ctx(req);
    await this.service.excluirLote(tenantId, userId, [id]);
  }
}