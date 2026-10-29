import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PatientsService } from './patients.service';

@Controller('patients') // <-- Isso define que a rota base é /patients
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  // Rota: POST /patients (Criar paciente)
  @Post()
  create(@Body() data: any) {
    return this.patientsService.create(data);
  }

  // Rota: GET /patients (Listar todos)
  @Get()
  findAll() {
    return this.patientsService.findAll();
  }

  // Rota: PATCH /patients/:id/status (Ativar/Inativar)
  @Patch(':id/status')
  toggleStatus(@Param('id') id: string, @Body('active') active: boolean) {
    return this.patientsService.toggleStatus(id, active);
  }

  // Rota: DELETE /patients/batch (Exclusão em lote)
  @Delete('batch')
  deleteBatch(@Body('ids') ids: string[]) {
    return this.patientsService.deleteBatch(ids);
  }
}
