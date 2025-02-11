"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const token_js_1 = require("../services/token.js");
describe('TokenService', () => {
    let tokenService;
    let mockDb;
    beforeEach(() => {
        mockDb = {
            get: jest.fn(),
            run: jest.fn(),
        };
        tokenService = new token_js_1.TokenService(mockDb);
    });
    it('should generate valid tokens', () => {
        const { accessToken, refreshToken, fingerprint } = tokenService.generateTokens('test-address', 'test-client');
        expect(accessToken).toBeDefined();
        expect(refreshToken).toBeDefined();
        expect(fingerprint).toBeDefined();
    });
});
