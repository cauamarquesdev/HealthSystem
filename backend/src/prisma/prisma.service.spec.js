import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service.js';
describe('PrismaService', () => {
    let service;
    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [PrismaService],
        }).compile();
        service = module.get(PrismaService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
