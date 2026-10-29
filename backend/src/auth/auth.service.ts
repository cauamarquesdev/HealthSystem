import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'crypto';

const scrypt = (password: string, salt: Buffer, keyLength: number) =>
  new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString('base64')}:${hash.toString('base64')}`;
};

const verifyPassword = async (
  password: string,
  storedHash: string,
): Promise<boolean> => {
  const [saltValue, hashValue] = storedHash.split(':');
  if (!saltValue || !hashValue) return false;

  const salt = Buffer.from(saltValue, 'base64');
  const expectedHash = Buffer.from(hashValue, 'base64');
  const actualHash = await scrypt(password, salt, expectedHash.length);

  return (
    actualHash.length === expectedHash.length &&
    timingSafeEqual(actualHash, expectedHash)
  );
};

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async signIn(email: string, pass: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isMatch = await verifyPassword(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // O payload carrega o tenant real do usuário logado
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    return {
      access_token: this.signToken(payload),
    };
  }

  private signToken(payload: Record<string, unknown>): string {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsignedToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
    const signature = createHmac(
      'sha256',
      process.env.JWT_SECRET || 'clinicos-secret-key-2026',
    )
      .update(unsignedToken)
      .digest('base64url');

    return `${unsignedToken}.${signature}`;
  }

  // Aqui está o signUp que estava faltando!
  async signUp(data: any) {
    const hashedPassword = await hashPassword(data.password);

    // Cria o usuário e já vincula ao tenant padrão com segurança
    const newUser = await this.usersService.create({
      ...data,
      password: hashedPassword,
      tenantId: 'default-tenant',
    });

    return this.signIn(newUser.email, data.password);
  }
}
