"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const vitest_1 = require("vitest");
(0, dotenv_1.config)({ path: '.env.test' });
// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6';
process.env.JWT_REFRESH_SECRET = 'z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4';
process.env.JWT_ISSUER = 'test-issuer';
process.env.JWT_ACCESS_EXPIRY = '900';
process.env.JWT_REFRESH_EXPIRY = '604800';
process.env.SESSION_SECRET = 'test-session-secret-key-for-testing-only-32-chars';
process.env.DATABASE_ENCRYPTION_KEY = 'test-encryption-key-for-testing-only-32-chars';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.DB_PATH = ':memory:';
process.env.PORT = '3001';
const originalConsole = { ...console };
(0, vitest_1.beforeAll)(() => {
    console.log = () => { };
    console.warn = () => { };
    console.error = () => { };
});
(0, vitest_1.afterAll)(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
});
//# sourceMappingURL=setup.js.map