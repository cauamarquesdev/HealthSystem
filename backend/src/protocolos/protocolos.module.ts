import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module'; // ajuste se o seu PrismaModule estiver em outro lugar
import { ProtocolosController } from './protocolos.controller';
import { ProtocolosService } from './protocolos.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProtocolosController],
  providers: [ProtocolosService],
  exports: [ProtocolosService],
})
export class ProtocolosModule {}

// Registre no AppModule:  imports: [..., ProtocolosModule]