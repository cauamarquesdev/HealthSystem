import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';

@Module({
  controllers: [RecordsController],
  // Se você usa um PrismaModule global, remova PrismaService daqui.
  providers: [RecordsService, PrismaService],
})
export class RecordsModule {}