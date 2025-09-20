import request from 'supertest';
import app from '../app';

describe('Basic Functionality Test', () => {
  it('should start the server and respond to health check', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body.status).toBe('healthy');
    expect(response.body.service).toBe('polkadot-password-manager');
  });

  it('should handle credential creation', async () => {
    const credentialData = {
      name: 'Test Credential',
      type: 'password',
      value: 'test-password',
    };

    const response = await request(app).post('/api/credentials').send(credentialData).expect(200);

    expect(response.body.id).toBeDefined();
    expect(response.body.name).toBe('Test Credential');
    expect(response.body.type).toBe('password');
  });

  it('should handle credential retrieval', async () => {
    // First create a credential
    const credentialData = {
      name: 'Test Credential 2',
      type: 'api-key',
      value: 'test-api-key',
    };

    const createResponse = await request(app)
      .post('/api/credentials')
      .send(credentialData)
      .expect(200);

    const credentialId = createResponse.body.id;

    // Then retrieve it
    const getResponse = await request(app).get(`/api/credentials/${credentialId}`).expect(200);

    expect(getResponse.body.id).toBe(credentialId);
    expect(getResponse.body.name).toBe('Test Credential 2');
  });

  it('should handle credential listing', async () => {
    const response = await request(app).get('/api/credentials').expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should handle 404 for non-existent routes', async () => {
    await request(app).get('/api/non-existent').expect(404);
  });
});
