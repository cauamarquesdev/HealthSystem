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

@Controller('patients') // Com o main.ts, isto vira /api/patients
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  create(@Body() data: any) {
    return this.patientsService.create(data);
  }

  @Get()
  findAll() {
    return this.patientsService.findAll();
  }

  @Patch(':id/status')
  toggleStatus(@Param('id') id: string, @Body('active') active: boolean) {
    return this.patientsService.toggleStatus(id, active);
  }

  // ROTA CORRIGIDA: Agora é @Post para bater certo com o Front-end
  @Post('batch-delete')
  deleteBatch(@Body('ids') ids: string[]) {
    return this.patientsService.deleteBatch(ids);
  }
}
