import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  controllers: [FinanceController],
  // Se você usa um PrismaModule global, remova PrismaService daqui.
  providers: [FinanceService, PrismaService],
})
export class FinanceModule {}