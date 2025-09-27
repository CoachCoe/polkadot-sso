import { beforeAll, afterAll } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = ':memory:';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/api/auth/google/callback';
process.env.TALISMAN_DEEP_LINK_SCHEME = 'talisman://';
process.env.TALISMAN_CALLBACK_URL = 'http://localhost:3001/api/auth/mobile/callback';
process.env.PAPI_POLKADOT_RPC = 'wss://test-polkadot-rpc';
process.env.PAPI_KUSAMA_RPC = 'wss://test-kusama-rpc';
process.env.PAPI_LIGHT_CLIENT_ENABLED = 'false';
process.env.PAPI_FALLBACK_TO_POLKADOT_JS = 'true';

beforeAll(async () => {
  // Setup test environment
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test environment
  console.log('Cleaning up test environment...');
});
