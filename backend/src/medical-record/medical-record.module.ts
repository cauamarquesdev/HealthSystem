import { Module } from '@nestjs/common';
import { MedicalRecordService } from './medical-record.service';
import { MedicalRecordController } from './medical-record.controller';

@Module({
  providers: [MedicalRecordService],
  controllers: [MedicalRecordController],
})
export class MedicalRecordModule {}
