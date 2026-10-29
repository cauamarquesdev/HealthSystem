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
import { Injectable, UnauthorizedException, } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
let AuthGuard = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AuthGuard = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AuthGuard = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async canActivate(context) {
            const request = context.switchToHttp().getRequest();
            const token = this.extractTokenFromHeader(request);
            if (!token) {
                throw new UnauthorizedException('Acesso negado. Token não encontrado.');
            }
            try {
                const payload = this.verifyToken(token);
                // Injeta os dados do profissional logado na requisição (req.user)
                request['user'] = payload;
            }
            catch {
                throw new UnauthorizedException('Token inválido ou expirado. Faça login novamente.');
            }
            return true;
        }
        extractTokenFromHeader(request) {
            const [type, token] = request.headers.authorization?.split(' ') ?? [];
            return type === 'Bearer' ? token : undefined;
        }
        verifyToken(token) {
            const parts = token.split('.');
            if (parts.length !== 3)
                throw new Error('Token inválido');
            const [encodedHeader, encodedPayload, encodedSignature] = parts;
            const header = JSON.parse(this.decode(encodedHeader));
            if (header.alg !== 'HS256')
                throw new Error('Algoritmo não suportado');
            const expectedSignature = createHmac('sha256', process.env.JWT_SECRET || 'clinicos-secret-key-2026')
                .update(`${encodedHeader}.${encodedPayload}`)
                .digest('base64url');
            const actual = Buffer.from(encodedSignature, 'base64url');
            const expected = Buffer.from(expectedSignature, 'base64url');
            if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
                throw new Error('Assinatura inválida');
            }
            const payload = JSON.parse(this.decode(encodedPayload));
            if (typeof payload.exp === 'number' && payload.exp <= Date.now() / 1000) {
                throw new Error('Token expirado');
            }
            return payload;
        }
        decode(value) {
            return Buffer.from(value, 'base64url').toString('utf8');
        }
    };
    return AuthGuard = _classThis;
})();
export { AuthGuard };
