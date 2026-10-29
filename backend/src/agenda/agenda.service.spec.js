import { Test } from '@nestjs/testing';
import { AgendaService } from './agenda.service.js';
describe('AgendaService', () => {
    let service;
    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [AgendaService],
        }).compile();
        service = module.get(AgendaService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
