import { Controller, Post, Get, Body } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('api/vendas')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('nova')
  async createSale(@Body() data: any) {
    // Se o modal mandou string vazia, null ou undefined, tratamos aqui para cair no fallback do service
    const cleanData = {
      ...data,
      patientId:
        !data.patientId ||
        data.patientId === '' ||
        data.patientId.includes('ID_')
          ? undefined
          : data.patientId,
      userId:
        !data.userId || data.userId === '' || data.userId.includes('ID_')
          ? undefined
          : data.userId,
    };

    return this.salesService.createSale(cleanData);
  }

  @Get('metricas')
  async getMetrics() {
    return this.salesService.getDashboardMetrics();
  }
}
