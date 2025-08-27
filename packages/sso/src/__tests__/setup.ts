import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.DB_PATH = ':memory:';
process.env.PORT = '3001';

// Mock console methods to reduce noise in tests
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

// Global test timeout
jest.setTimeout(10000);
