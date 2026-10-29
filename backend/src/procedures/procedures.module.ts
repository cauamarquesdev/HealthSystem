import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProceduresController } from './procedures.controller';
import { ProceduresService } from './procedures.service';

@Module({
  controllers: [ProceduresController],
  // Se você usa um PrismaModule global, remova PrismaService daqui.
  providers: [ProceduresService, PrismaService],
})
export class ProceduresModule {}