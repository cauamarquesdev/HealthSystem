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
import { AvaliacoesService } from './avaliacoes.service';

type ReqUser = { user?: { id?: string; sub?: string; userId?: string; name?: string; nome?: string; tenantId?: string } };

@UseGuards(AuthGuard)
@Controller('avaliacoes')
export class AvaliacoesController {
  constructor(private readonly service: AvaliacoesService) {}

  /** Toda consulta é restrita à clínica do usuário logado. */
  private tenantId(req: ReqUser): string {
    const id = req.user?.tenantId;
    if (!id) throw new UnauthorizedException('Tenant não identificado no token.');
    return id;
  }

  /** Normaliza o usuário do JWT (aceita id/sub/userId e name/nome). */
  private usuario(req: ReqUser) {
    const u = req.user;
    return { id: u?.id ?? u?.sub ?? u?.userId, nome: u?.name ?? u?.nome };
  }

  // Rotas estáticas ANTES de ':id'
  @Get('resumo')
  resumo(@Req() req: ReqUser) {
    return this.service.resumo(this.tenantId(req));
  }

  @Get('procedimentos')
  procedimentos(@Req() req: ReqUser) {
    return this.service.procedimentos(this.tenantId(req));
  }

  @Get('clientes')
  clientes(@Req() req: ReqUser, @Query('search') search?: string) {
    return this.service.clientes(this.tenantId(req), search);
  }

  @Get()
  listar(@Req() req: ReqUser, @Query() q: Record<string, string>) {
    return this.service.listar(this.tenantId(req), q);
  }

  @Get(':id')
  obter(@Req() req: ReqUser, @Param('id') id: string) {
    return this.service.obter(this.tenantId(req), id);
  }

  @Post()
  criar(@Req() req: ReqUser, @Body() body: Record<string, unknown>) {
    return this.service.criar(this.tenantId(req), this.usuario(req), body);
  }

  @Post(':id/duplicar')
  duplicar(@Req() req: ReqUser, @Param('id') id: string) {
    return this.service.duplicar(this.tenantId(req), id, this.usuario(req));
  }

  @Patch(':id/status')
  status(@Req() req: ReqUser, @Param('id') id: string, @Body('status') status: string) {
    return this.service.alterarStatus(this.tenantId(req), id, status);
  }

  @Patch(':id')
  atualizar(@Req() req: ReqUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.atualizar(this.tenantId(req), id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async excluir(@Req() req: ReqUser, @Param('id') id: string) {
    await this.service.excluir(this.tenantId(req), id);
  }
}