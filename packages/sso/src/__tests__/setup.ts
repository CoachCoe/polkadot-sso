import { config } from 'dotenv';

config({ path: '.env.test' });

// Set test environment
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: true,
});
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.SESSION_SECRET = 'test-session-secret';
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
