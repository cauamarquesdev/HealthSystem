import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { FinanceService } from './finance.service';

@Controller('finance')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Get('summary')
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(from, to);
  }

  @Get('billable')
  billable() {
    return this.service.billable();
  }

  // ---- vendas
  @Get('sales')
  sales(@Query('from') from?: string, @Query('to') to?: string, @Query('q') q?: string, @Query('status') status?: string) {
    return this.service.listSales(from, to, q, status);
  }

  @Post('sales')
  createSale(@Body() body: any) {
    return this.service.createSale(body);
  }

  @Post('sales/:id/cancel')
  cancelSale(@Param('id') id: string) {
    return this.service.cancelSale(id);
  }

  // ---- lançamentos
  @Get('transactions')
  transactions(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.service.listTransactions(from, to, type, status, q);
  }

  @Post('transactions')
  createTransaction(@Body() body: any) {
    return this.service.createTransaction(body);
  }

  @Patch('transactions/:id')
  updateTransaction(@Param('id') id: string, @Body() body: any) {
    return this.service.updateTransaction(id, body);
  }

  @Post('transactions/:id/pay')
  pay(@Param('id') id: string, @Body() body: any) {
    return this.service.pay(id, body);
  }

  @Post('transactions/:id/reopen')
  reopen(@Param('id') id: string) {
    return this.service.reopen(id);
  }

  @Delete('transactions/:id')
  remove(@Param('id') id: string) {
    return this.service.removeTransaction(id);
  }
}