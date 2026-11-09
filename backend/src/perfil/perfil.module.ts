import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module'; // ajuste se o seu PrismaModule estiver em outro lugar
import { PerfilController } from './perfil.controller';
import { PerfilService } from './perfil.service';

/**
 * A foto, a logo e a rubrica viajam como JSON (Data URL). Se você ainda não fez, aumente o limite do body no main.ts:
 *   app.useBodyParser('json', { limit: '12mb' });
 */
@Module({
  imports: [PrismaModule],
  controllers: [PerfilController],
  providers: [PerfilService],
  exports: [PerfilService],
})
export class PerfilModule {}

// Registre no AppModule:  imports: [..., PerfilModule]