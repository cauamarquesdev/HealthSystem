import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module'; // ajuste se o seu PrismaModule estiver em outro lugar
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesService } from './notificacoes.service';

/**
 * Para outros módulos dispararem notificações:
 *   1) imports: [NotificacoesModule]   no módulo deles
 *   2) constructor(private notificacoes: NotificacoesService) {}
 *   3) await this.notificacoes.notificar({ tenantId, tipo: 'CRM', titulo: 'Novo lead', href: '/crm' });
 */
@Module({
  imports: [PrismaModule],
  controllers: [NotificacoesController],
  providers: [NotificacoesService],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}

// Registre no AppModule:  imports: [..., NotificacoesModule]