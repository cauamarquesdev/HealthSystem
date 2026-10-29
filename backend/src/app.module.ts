import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AgendaModule } from './agenda/agenda.module';
import { SalesModule } from './sales/sales.module';
import { FinanceModule } from './finance/finance.module';
import { MedicalRecordModule } from './medical-record/medical-record.module';
import { CrmModule } from './crm/crm.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProceduresModule } from './procedures/procedures.module';
import { RecursosModule } from './recurses/recursos.module';
import { AvaliacoesModule } from './avaliacoes/avaliacoes.module';
import { RecordsModule } from './prontuarios/records.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { ProtocolosModule } from './protocolos/protocolos.module';
import { FotosModule } from './fotos/fotos.module';
import { DocumentosModule } from './documentos/documentos.module'; // Importando o módulo de documentos

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    DashboardModule,
    UsersModule,
    AgendaModule,
    SalesModule,
    FinanceModule,
    MedicalRecordModule,
    CrmModule,
    PatientsModule,
    ProceduresModule,
    AppointmentsModule,
    RecursosModule,
    AvaliacoesModule,
    RecordsModule,
    NotificacoesModule,
    ProtocolosModule,
    FotosModule,
    DocumentosModule, // Adicionando o módulo de documentos aos imports
  ],
  // Deixe apenas o Controller e o Service raiz aqui.
  // Os outros Controllers e Services vão viver nos seus próprios módulos (ex: AuthModule).
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}