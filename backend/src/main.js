import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    // Habilita a comunicação cruzada entre o Frontend (Next.js) e o Backend (NestJS)
    app.enableCors({
        origin: ['http://localhost:3000', 'https://seusistemaclinica.com.br'],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    // Roda o servidor backend na porta 3001 para não conflitar com o Next.js
    await app.listen(3001);
    console.log(`🚀 Motor do ClinicOS rodando na porta: ${await app.getUrl()}`);
}
bootstrap();
