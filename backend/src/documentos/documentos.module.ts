import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module'; // ajuste se o seu PrismaModule estiver em outro lugar
// Integração opcional com a Central de Notificações (aviso quando o paciente assina pelo link).
// Se você não usa o módulo de notificações, remova esta linha e o NotificacoesModule do imports.
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { DocumentosController, DocumentosPublicoController } from './documentos.controller';
import { DocumentosService } from './documentos.service';

/**
 * As assinaturas e arquivos digitalizados viajam como JSON (Data URL). No main.ts, aumente o limite do body:
 *   const app = await NestFactory.create<NestExpressApplication>(AppModule);
 *   app.useBodyParser('json', { limit: '12mb' });
 *
 * Se o app roda atrás de proxy (Nginx, Vercel, etc.), habilite  app.set('trust proxy', true)  para o IP real
 * de quem assina ser registrado como evidência.
 */
@Module({
  imports: [PrismaModule, NotificacoesModule],
  controllers: [DocumentosController, DocumentosPublicoController],
  providers: [DocumentosService],
  exports: [DocumentosService],
})
export class DocumentosModule {}

// Registre no AppModule:  imports: [..., DocumentosModule]