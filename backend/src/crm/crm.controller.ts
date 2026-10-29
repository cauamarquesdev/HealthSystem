import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CrmService } from './crm.service';

@Controller('crm/leads')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  findAll() {
    return this.crmService.findAll();
  }

  @Post()
  create(@Body() data: any) {
    return this.crmService.create(data);
  }

  // Rota para editar os dados completos do Lead
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.crmService.update(id, data);
  }

  // Rota para o Drag & Drop (atualiza só o status)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.crmService.updateStatus(id, status);
  }

  // Rota para excluir o Lead
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crmService.remove(id);
  }
}