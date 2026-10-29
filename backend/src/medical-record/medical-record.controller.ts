import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MedicalRecordService } from './medical-record.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard) // Acesso restrito a profissionais logados
@Controller('api/prontuario')
export class MedicalRecordController {
  constructor(private readonly medicalRecordService: MedicalRecordService) {}

  @Post(':patientId/evolucao')
  async createNote(
    @Param('patientId') patientId: string,
    @Body() data: { content: string; isAI: boolean },
    @Request() req: any, // Pega os dados do usuário logado através do token
  ) {
    return this.medicalRecordService.createClinicalNote({
      patientId,
      userId: req.user.sub, // ID do profissional que está fazendo a requisição
      content: data.content,
      isAI: data.isAI,
    });
  }

  @Get(':patientId/historico')
  async getHistory(@Param('patientId') patientId: string) {
    return this.medicalRecordService.getPatientHistory(patientId);
  }
}
