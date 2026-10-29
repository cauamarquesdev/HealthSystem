import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Torna o Prisma acessível em qualquer módulo sem precisar importar toda hora
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
