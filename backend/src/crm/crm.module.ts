import { Module } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CrmController],
  providers: [CrmService, PrismaService],
})
export class CrmModule {}