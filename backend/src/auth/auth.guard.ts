import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Acesso negado. Token não encontrado.');
    }

    try {
      const payload = this.verifyToken(token);
      // Injeta os dados do profissional logado na requisição (req.user)
      request['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException(
        'Token inválido ou expirado. Faça login novamente.',
      );
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private verifyToken(token: string): Record<string, unknown> {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Token inválido');

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = JSON.parse(this.decode(encodedHeader)) as { alg?: string };
    if (header.alg !== 'HS256') throw new Error('Algoritmo não suportado');

    const expectedSignature = createHmac(
      'sha256',
      process.env.JWT_SECRET || 'clinicos-secret-key-2026',
    )
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    const actual = Buffer.from(encodedSignature, 'base64url');
    const expected = Buffer.from(expectedSignature, 'base64url');

    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      throw new Error('Assinatura inválida');
    }

    const payload = JSON.parse(this.decode(encodedPayload)) as Record<
      string,
      unknown
    >;
    if (typeof payload.exp === 'number' && payload.exp <= Date.now() / 1000) {
      throw new Error('Token expirado');
    }
    return payload;
  }

  private decode(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
  }
}
