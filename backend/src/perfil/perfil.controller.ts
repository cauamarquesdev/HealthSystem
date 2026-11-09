import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard'; // ajuste para o guard real do seu projeto
import { PerfilService } from './perfil.service';

type ReqUser = { user?: { id?: string; sub?: string; userId?: string } };

/** Tudo aqui é sobre o usuário LOGADO: o id vem do token, nunca da URL ou do corpo. */
@UseGuards(AuthGuard)
@Controller('perfil')
export class PerfilController {
  constructor(private readonly service: PerfilService) {}

  private userId(req: ReqUser): string {
    const id = req.user?.id ?? req.user?.sub ?? req.user?.userId;
    if (!id) throw new UnauthorizedException('Usuário não identificado no token.');
    return id;
  }

  @Get()
  obter(@Req() req: ReqUser) {
    return this.service.obter(this.userId(req));
  }

  @Patch()
  atualizar(@Req() req: ReqUser, @Body() body: Record<string, unknown>) {
    return this.service.atualizar(this.userId(req), body);
  }

  @Put('avatar')
  definirAvatar(@Req() req: ReqUser, @Body('avatar') avatar: string) {
    return this.service.definirAvatar(this.userId(req), avatar);
  }

  @Delete('avatar')
  removerAvatar(@Req() req: ReqUser) {
    return this.service.removerAvatar(this.userId(req));
  }

  @Post('senha')
  alterarSenha(@Req() req: ReqUser, @Body() body: { senhaAtual?: string; novaSenha?: string }) {
    return this.service.alterarSenha(this.userId(req), body?.senhaAtual, body?.novaSenha);
  }

  @Post('email')
  alterarEmail(@Req() req: ReqUser, @Body() body: { senha?: string; novoEmail?: string }) {
    return this.service.alterarEmail(this.userId(req), body?.senha, body?.novoEmail);
  }

  @Put('clinica')
  atualizarClinica(@Req() req: ReqUser, @Body() body: Record<string, unknown>) {
    return this.service.atualizarClinica(this.userId(req), body);
  }
}