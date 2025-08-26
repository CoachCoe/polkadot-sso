#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3000';

const testProfile = {
  display_name: 'API Test User',
  email: 'api-test@example.com',
  bio: 'Testing the API endpoints',
  website: 'https://example.com',
  location: 'Test City',
  timezone: 'UTC',
  preferences: { theme: 'dark' },
};

const testCredentialType = {
  name: 'API Test Credential',
  description: 'Credential type created via API testing',
  schema_version: '1.0.0',
  schema_definition: JSON.stringify({
    type: 'object',
    properties: {
      test_field: { type: 'string' },
      test_number: { type: 'number' },
    },
    required: ['test_field'],
  }),
  issuer_pattern: '^5.*$',
  required_fields: JSON.stringify(['test_field']),
  optional_fields: JSON.stringify(['test_number']),
  validation_rules: JSON.stringify({}),
};

const testCredential = {
  user_address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  credential_type_id: '', // Will be filled after creating credential type
  credential_data: {
    test_field: 'API Test Value',
    test_number: 42,
  },
  expires_at: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
  metadata: {
    source: 'API Test',
    created_by: 'test-script',
  },
};

function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null,
          };
          resolve(response);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
          });
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testCredentialTypes() {
  console.log('\n🔧 Testing Credential Types...');

  try {
    console.log('Creating credential type...');
    const createResponse = await makeRequest('POST', '/api/credentials/types', testCredentialType);

    if (createResponse.status === 201) {
      console.log('✅ Credential type created successfully');
      console.log('ID:', createResponse.body.id);
      testCredential.credential_type_id = createResponse.body.id;
      return createResponse.body.id;
    } else {
      console.log(
        '❌ Failed to create credential type:',
        createResponse.status,
        createResponse.body
      );
      return null;
    }
  } catch (error) {
    console.log('❌ Error creating credential type:', error.message);
    return null;
  }
}

async function testCredentials(credentialTypeId) {
  console.log('\n🎓 Testing Credentials...');

  if (!credentialTypeId) {
    console.log('❌ Skipping credential tests - no credential type ID');
    return;
  }

  try {
    console.log('Creating credential...');
    const createResponse = await makeRequest(
      'POST',
      '/api/credentials/credentials',
      testCredential
    );

    if (createResponse.status === 201) {
      console.log('✅ Credential created successfully');
      console.log('ID:', createResponse.body.id);
      return createResponse.body.id;
    } else {
      console.log('❌ Failed to create credential:', createResponse.status, createResponse.body);
      return null;
    }
  } catch (error) {
    console.log('❌ Error creating credential:', error.message);
    return null;
  }
}

async function testCredentialTypesList() {
  console.log('\n📋 Testing Credential Types List...');

  try {
    const response = await makeRequest('GET', '/api/credentials/types');

    if (response.status === 200) {
      console.log('✅ Retrieved credential types successfully');
      console.log('Count:', response.body.length);
      return response.body;
    } else {
      console.log('❌ Failed to retrieve credential types:', response.status, response.body);
      return null;
    }
  } catch (error) {
    console.log('❌ Error retrieving credential types:', error.message);
    return null;
  }
}

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');

  try {
    const response = await makeRequest('GET', '/api/credentials/types');

    if (response.status === 200) {
      console.log('✅ Server is running and responding');
      console.log('✅ Credentials API is working');
      return true;
    } else {
      console.log('❌ Server responded with status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not running or not accessible:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting API Tests for Polkadot SSO Credentials System');
  console.log('=====================================================');

  const serverHealthy = await testHealthCheck();
  if (!serverHealthy) {
    console.log('\n❌ Server is not running. Please start the server with: npm run dev');
    process.exit(1);
  }

  const credentialTypeId = await testCredentialTypes();

  await testCredentialTypesList();

  await testCredentials(credentialTypeId);

  console.log('\n🎉 API Tests Completed!');
  console.log('\nNote: Some tests may fail due to authentication requirements.');
  console.log('To test authenticated endpoints, you need to:');
  console.log('1. Start the server: npm run dev');
  console.log('2. Visit http://localhost:3000');
  console.log('3. Authenticate with a Polkadot wallet');
  console.log('4. Use the JWT token in the Authorization header');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  makeRequest,
  testHealthCheck,
  testCredentialTypes,
  testCredentials,
  testCredentialTypesList,
};
