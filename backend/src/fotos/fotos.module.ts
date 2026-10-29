import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module'; // ajuste se o seu PrismaModule estiver em outro lugar
import { FotosController } from './fotos.controller';
import { FotosService } from './fotos.service';

/**
 * IMPORTANTE: as fotos viajam como JSON (Data URL, ~0,3–1 MB cada após a compressão do navegador).
 * No main.ts, aumente o limite do body (o padrão de 100 kb rejeita qualquer foto):
 *
 *   const app = await NestFactory.create<NestExpressApplication>(AppModule);
 *   app.useBodyParser('json', { limit: '12mb' });
 */
@Module({
  imports: [PrismaModule],
  controllers: [FotosController],
  providers: [FotosService],
  exports: [FotosService],
})
export class FotosModule {}

// Registre no AppModule:  imports: [..., FotosModule]