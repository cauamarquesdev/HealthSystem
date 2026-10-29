import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module'; // ajuste se o seu PrismaModule estiver em outro lugar
import { AvaliacoesController } from './avaliacoes.controller';
import { AvaliacoesService } from './avaliacoes.service';

@Module({
  imports: [PrismaModule],
  controllers: [AvaliacoesController],
  providers: [AvaliacoesService],
  exports: [AvaliacoesService],
})
export class AvaliacoesModule {}

