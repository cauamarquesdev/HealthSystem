import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { gerarHash, verificarSenha } from './senha.util';

type Body = Record<string, unknown>;

const CONSELHOS = ['CRM', 'CRO', 'COREN', 'CREFITO', 'CRBM', 'CRF', 'CRN', 'CRP', 'OUTRO'];
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const MAX_AVATAR = 160_000; // caracteres do Data URL (~120 KB)
const MAX_LOGO = 220_000;
const MAX_RUBRICA = 400_000;
const IMG = /^data:image\/(jpeg|png|webp);base64,/;
const PNG = /^data:image\/png;base64,/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const texto = (v: unknown, max: number): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

const has = (b: Body, k: string) => Object.prototype.hasOwnProperty.call(b, k);

/** Mín. 8 caracteres, com letra e número. */
function validarForcaSenha(s: string) {
  if (s.length < 8) throw new BadRequestException('A nova senha precisa ter pelo menos 8 caracteres.');
  if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) throw new BadRequestException('A nova senha precisa ter letras e números.');
  if (s.length > 128) throw new BadRequestException('A nova senha é longa demais.');
}

const USUARIO_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  jobTitle: true,
  councilType: true,
  councilNumber: true,
  councilState: true,
  bio: true,
  avatar: true,
  signatureData: true,
  tenant: {
    select: {
      id: true,
      name: true,
      document: true,
      address: true,
      openingHours: true,
      phone: true,
      logo: true,
    } as Prisma.TenantSelect,
  },
} as Prisma.UserSelect;

type LinhaUsuario = Prisma.UserGetPayload<{ select: typeof USUARIO_SELECT }> & {
  jobTitle?: string | null;
  phone?: string | null;
  councilType?: string | null;
  councilNumber?: string | null;
  councilState?: string | null;
  bio?: string | null;
  avatar?: string | null;
  signatureData?: string | null;
  tenant: Prisma.UserGetPayload<{ select: typeof USUARIO_SELECT }>['tenant'] & {
    phone?: string | null;
    address?: string | null;
    openingHours?: string | null;
    logo?: string | null;
  };
};

const mapear = (u: LinhaUsuario) => {
  const tenant = u.tenant as typeof u.tenant & {
    phone?: string | null;
    address?: string | null;
    openingHours?: string | null;
    logo?: string | null;
  };

  return {
    id: u.id,
    nome: u.name,
    email: u.email,
    role: u.role,
    telefone: u.phone ?? null,
    cargo: u.jobTitle,
    registroTipo: u.councilType,
    registroNumero: u.councilNumber,
    registroUf: u.councilState,
    bio: u.bio,
    avatar: u.avatar,
    rubrica: u.signatureData,
    clinica: {
      id: tenant.id,
      nome: tenant.name,
      documento: tenant.document,
      unidade: null,
      telefone: tenant.phone ?? null,
      email: null,
      endereco: tenant.address ?? null,
      horario: tenant.openingHours ?? null,
      logo: tenant.logo,
    },
  };
};

@Injectable()
export class PerfilService {
  private readonly log = new Logger(PerfilService.name);

  constructor(private readonly prisma: PrismaService) {}

  async obter(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: USUARIO_SELECT });
    if (!u) throw new NotFoundException('Usuário não encontrado.');
    return mapear(u);
  }

  async atualizar(userId: string, b: Body) {
    const data: Prisma.UserUpdateInput = {};

    if (has(b, 'nome')) {
      const n = texto(b.nome, 120);
      if (!n || n.length < 3) throw new BadRequestException('Informe seu nome completo.');
      data.name = n;
    }
    if (has(b, 'telefone')) {
      const t = texto(b.telefone, 30);
      const dig = (t ?? '').replace(/\D/g, '');
      if (t && (dig.length < 10 || dig.length > 13)) throw new BadRequestException('Telefone inválido. Use DDD + número.');
      Object.assign(data, { phone: t });
    }
    if (has(b, 'cargo')) (data as Prisma.UserUpdateInput & { jobTitle?: string | null }).jobTitle = texto(b.cargo, 80);
    if (has(b, 'bio')) (data as Prisma.UserUpdateInput & { bio?: string | null }).bio = texto(b.bio, 500);

    if (has(b, 'registroTipo')) {
      const tipo = texto(b.registroTipo, 12)?.toUpperCase() ?? null;
      if (tipo && !CONSELHOS.includes(tipo)) throw new BadRequestException(`Conselho inválido. Use: ${CONSELHOS.join(', ')}.`);
      Object.assign(data, { councilType: tipo });
    }
    if (has(b, 'registroNumero')) {
      const n = texto(b.registroNumero, 20);
      if (n && !/^[A-Za-z0-9.\-/ ]+$/.test(n)) throw new BadRequestException('Número de registro inválido.');
      Object.assign(data, { councilNumber: n });
    }
    if (has(b, 'registroUf')) {
      const uf = texto(b.registroUf, 2)?.toUpperCase() ?? null;
      if (uf && !UFS.includes(uf)) throw new BadRequestException('UF inválida.');
      (data as Prisma.UserUpdateInput & { councilState?: string | null }).councilState = uf;
    }
    if (has(b, 'rubrica')) {
      const r = b.rubrica === null ? null : typeof b.rubrica === 'string' ? b.rubrica : '';
      if (r !== null && (!PNG.test(r) || r.length > MAX_RUBRICA)) throw new BadRequestException('Assinatura inválida. Desenhe novamente.');
      Object.assign(data, { signatureData: r });
    }

    if (!Object.keys(data).length) throw new BadRequestException('Nada para atualizar.');
    await this.prisma.user.update({ where: { id: userId }, data });
    return this.obter(userId);
  }

  async definirAvatar(userId: string, avatar: unknown) {
    const a = typeof avatar === 'string' ? avatar : '';
    if (!IMG.test(a)) throw new BadRequestException('Envie uma imagem JPG, PNG ou WebP.');
    if (a.length > MAX_AVATAR) throw new BadRequestException('Foto muito grande. Use uma imagem menor.');
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: a } as Prisma.UserUpdateInput,
    });
    return { avatar: a };
  }

  async removerAvatar(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: null } as Prisma.UserUpdateInput,
    });
    return { avatar: null };
  }

  async alterarSenha(userId: string, atual: unknown, nova: unknown) {
    const senhaAtual = typeof atual === 'string' ? atual : '';
    const novaSenha = typeof nova === 'string' ? nova : '';
    if (!senhaAtual) throw new BadRequestException('Informe a senha atual.');
    validarForcaSenha(novaSenha);

    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!u) throw new NotFoundException('Usuário não encontrado.');

    let confere = false;
    try {
      confere = await verificarSenha(u.password, senhaAtual);
    } catch (e) {
      this.log.error((e as Error).message);
      throw new InternalServerErrorException('Não foi possível validar a senha. Verifique src/perfil/senha.util.ts.');
    }
    if (!confere) throw new BadRequestException('Senha atual incorreta.');
    if (senhaAtual === novaSenha) throw new BadRequestException('A nova senha deve ser diferente da atual.');

    const hash = await gerarHash(novaSenha, u.password);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hash } });
    return { ok: true };
  }

  async alterarEmail(userId: string, senha: unknown, novoEmail: unknown) {
    const email = texto(novoEmail, 160)?.toLowerCase() ?? '';
    if (!EMAIL.test(email)) throw new BadRequestException('E-mail inválido.');
    const s = typeof senha === 'string' ? senha : '';
    if (!s) throw new BadRequestException('Informe a senha atual para confirmar.');

    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true, email: true } });
    if (!u) throw new NotFoundException('Usuário não encontrado.');
    if (u.email.toLowerCase() === email) throw new BadRequestException('Este já é o seu e-mail atual.');

    let confere = false;
    try {
      confere = await verificarSenha(u.password, s);
    } catch (e) {
      this.log.error((e as Error).message);
      throw new InternalServerErrorException('Não foi possível validar a senha. Verifique src/perfil/senha.util.ts.');
    }
    if (!confere) throw new BadRequestException('Senha incorreta.');

    const existe = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existe) throw new BadRequestException('Este e-mail já está em uso por outro usuário.');

    await this.prisma.user.update({ where: { id: userId }, data: { email } });
    return { email };
  }

  /** Dados da clínica: só administradores podem alterar. */
  async atualizarClinica(userId: string, b: Body) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, tenantId: true } });
    if (!u) throw new NotFoundException('Usuário não encontrado.');
    if (u.role !== 'ADMIN') throw new ForbiddenException('Somente administradores podem alterar os dados da clínica.');

    const data: Prisma.TenantUpdateInput & {
      name?: string | null;
      document?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      openingHours?: string | null;
      logo?: string | null;
    } = {};

    if (has(b, 'nome')) {
      const n = texto(b.nome, 120);
      if (!n || n.length < 2) throw new BadRequestException('Informe o nome da clínica.');
      data.name = n;
    }
    if (has(b, 'documento')) data.document = texto(b.documento, 30);
    if (has(b, 'telefone')) Object.assign(data, { phone: texto(b.telefone, 30) });
    if (has(b, 'email')) {
      const e = texto(b.email, 160)?.toLowerCase() ?? null;
      if (e && !EMAIL.test(e)) throw new BadRequestException('E-mail da clínica inválido.');
      data.email = e;
    }
    if (has(b, 'endereco')) data.address = texto(b.endereco, 200);
    if (has(b, 'horario')) data.openingHours = texto(b.horario, 200);
    if (has(b, 'logo')) {
      const l = b.logo === null ? null : typeof b.logo === 'string' ? b.logo : '';
      if (l !== null && (!IMG.test(l) || l.length > MAX_LOGO)) throw new BadRequestException('Logo inválida ou muito grande.');
      data.logo = l;
    }

    if (!Object.keys(data).length) throw new BadRequestException('Nada para atualizar.');
    await this.prisma.tenant.update({ where: { id: u.tenantId }, data: data as Prisma.TenantUpdateInput });
    return this.obter(userId);
  }
}