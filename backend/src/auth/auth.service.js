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
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual, } from 'crypto';
const scrypt = (password, salt, keyLength) => new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, (error, key) => {
        if (error)
            reject(error);
        else
            resolve(key);
    });
});
const hashPassword = async (password) => {
    const salt = randomBytes(16);
    const hash = await scrypt(password, salt, 64);
    return `${salt.toString('base64')}:${hash.toString('base64')}`;
};
const verifyPassword = async (password, storedHash) => {
    const [saltValue, hashValue] = storedHash.split(':');
    if (!saltValue || !hashValue)
        return false;
    const salt = Buffer.from(saltValue, 'base64');
    const expectedHash = Buffer.from(hashValue, 'base64');
    const actualHash = await scrypt(password, salt, expectedHash.length);
    return (actualHash.length === expectedHash.length &&
        timingSafeEqual(actualHash, expectedHash));
};
let AuthService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AuthService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AuthService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        usersService;
        constructor(usersService) {
            this.usersService = usersService;
        }
        async signIn(email, pass) {
            const user = await this.usersService.findByEmail(email);
            if (!user) {
                throw new UnauthorizedException('Credenciais inválidas');
            }
            const isMatch = await verifyPassword(pass, user.password);
            if (!isMatch) {
                throw new UnauthorizedException('Credenciais inválidas');
            }
            const payload = { sub: user.id, email: user.email, role: user.role };
            return {
                access_token: this.signToken(payload),
            };
        }
        signToken(payload) {
            const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
            const unsignedToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
            const signature = createHmac('sha256', process.env.JWT_SECRET || 'change-me')
                .update(unsignedToken)
                .digest('base64url');
            return `${unsignedToken}.${signature}`;
        }
        async signUp(data) {
            const hashedPassword = await hashPassword(data.password);
            const newUser = await this.usersService.create({
                ...data,
                password: hashedPassword,
            });
            return this.signIn(newUser.email, data.password);
        }
    };
    return AuthService = _classThis;
})();
export { AuthService };
