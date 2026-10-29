import { Test } from '@nestjs/testing';
import { AgendaController } from './agenda.controller.js';
import { AgendaService } from './agenda.service.js';
describe('AgendaController', () => {
    let controller;
    beforeEach(async () => {
        const module = await Test.createTestingModule({
            controllers: [AgendaController],
            providers: [AgendaService],
        }).compile();
        controller = module.get(AgendaController);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
