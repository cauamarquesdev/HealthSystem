var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
import { Controller, Get, Post, Patch, UseGuards, } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
let CrmController = (() => {
    let _classDecorators = [UseGuards(AuthGuard), Controller('api/crm')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _createOpp_decorators;
    let _moveStage_decorators;
    let _getBoard_decorators;
    var CrmController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _createOpp_decorators = [Post('oportunidade')];
            _moveStage_decorators = [Patch('oportunidade/:id/etapa')];
            _getBoard_decorators = [Get('kanban')];
            __esDecorate(this, null, _createOpp_decorators, { kind: "method", name: "createOpp", static: false, private: false, access: { has: obj => "createOpp" in obj, get: obj => obj.createOpp }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _moveStage_decorators, { kind: "method", name: "moveStage", static: false, private: false, access: { has: obj => "moveStage" in obj, get: obj => obj.moveStage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getBoard_decorators, { kind: "method", name: "getBoard", static: false, private: false, access: { has: obj => "getBoard" in obj, get: obj => obj.getBoard }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CrmController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        crmService = __runInitializers(this, _instanceExtraInitializers);
        constructor(crmService) {
            this.crmService = crmService;
        }
        async createOpp(data, req) {
            // Injeta automaticamente o ID do usuário que está logado criando o card
            return this.crmService.createOpportunity({
                ...data,
                userId: req.user.sub,
            });
        }
        async moveStage(id, stage) {
            return this.crmService.updateOpportunityStage(id, stage);
        }
        async getBoard() {
            return this.crmService.getKanbanBoard();
        }
    };
    return CrmController = _classThis;
})();
export { CrmController };
