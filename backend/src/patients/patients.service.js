var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { Injectable, NotFoundException } from '@nestjs/common';
let PatientsService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var PatientsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            PatientsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        prisma;
        constructor(prisma) {
            this.prisma = prisma;
        }
        // Lista todos os pacientes (com opção de busca por nome)
        async findAll(search) {
            const prisma = this.prisma;
            return prisma.patient.findMany({
                where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
                orderBy: { name: 'asc' },
            });
        }
        // Busca o perfil completo de 1 paciente e seus relacionamentos básicos
        async findOne(id) {
            const prisma = this.prisma;
            const patient = await prisma.patient.findUnique({
                where: { id },
            });
            if (!patient)
                throw new NotFoundException('Paciente não encontrado');
            return patient;
        }
        // Cria um novo paciente
        async create(data) {
            const prisma = this.prisma;
            return prisma.patient.create({
                data: {
                    ...data,
                    birthDate: data.birthDate ? new Date(data.birthDate) : null,
                },
            });
        }
        // Atualiza os dados cadastrais
        async update(id, data) {
            const prisma = this.prisma;
            return prisma.patient.update({
                where: { id },
                data: {
                    ...data,
                    birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
                },
            });
        }
        // Deleta o cadastro
        async remove(id) {
            const prisma = this.prisma;
            return prisma.patient.delete({
                where: { id },
            });
        }
    };
    return PatientsService = _classThis;
})();
export { PatientsService };
