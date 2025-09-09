"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: '.env.test' });
// Set test environment
Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
});
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-testing-only-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only-32-chars';
process.env.SESSION_SECRET = 'test-session-secret-key-for-testing-only-32-chars';
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing-only-32-chars';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.DB_PATH = ':memory:';
process.env.PORT = '3001';
const originalConsole = { ...console };
beforeAll(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
});
afterAll(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
});
jest.setTimeout(10000);
// Add a simple test to satisfy Jest's requirement
describe('Test Setup', () => {
    it('should configure test environment', () => {
        expect(process.env.NODE_ENV).toBe('test');
        expect(process.env.JWT_ACCESS_SECRET).toBeDefined();
        expect(process.env.JWT_REFRESH_SECRET).toBeDefined();
    });
});
//# sourceMappingURL=setup.js.map