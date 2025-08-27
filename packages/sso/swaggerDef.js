const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Polkadot SSO API',
    version: '1.0.0',
    description:
      'Polkadot Single Sign-On (SSO) service API for wallet-based authentication and credential management',
    contact: {
      name: 'Polkadot Auth Team',
      email: 'support@polkadot-auth.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://api.polkadot-auth.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from authentication',
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for client applications',
      },
    },
    schemas: {
      Challenge: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique challenge identifier',
            example: 'challenge_123456789',
          },
          client_id: {
            type: 'string',
            description: 'Client application identifier',
            example: 'my-app',
          },
          user_address: {
            type: 'string',
            nullable: true,
            description: 'User wallet address (optional)',
            example: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          },
          challenge: {
            type: 'string',
            description: 'Challenge string to be signed',
            example: 'Sign this message to authenticate: 1234567890',
          },
          expires_at: {
            type: 'string',
            format: 'date-time',
            description: 'Challenge expiration timestamp',
            example: '2024-01-01T12:00:00.000Z',
          },
          is_used: {
            type: 'boolean',
            description: 'Whether the challenge has been used',
            example: false,
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Challenge creation timestamp',
            example: '2024-01-01T11:55:00.000Z',
          },
        },
        required: ['id', 'client_id', 'challenge', 'expires_at', 'is_used', 'created_at'],
      },
      Session: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Session identifier',
            example: 'session_123456789',
          },
          address: {
            type: 'string',
            description: 'User wallet address',
            example: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          },
          client_id: {
            type: 'string',
            description: 'Client application identifier',
            example: 'my-app',
          },
          access_token: {
            type: 'string',
            description: 'JWT access token',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          refresh_token: {
            type: 'string',
            description: 'JWT refresh token',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          is_active: {
            type: 'boolean',
            description: 'Whether the session is active',
            example: true,
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Session creation timestamp',
            example: '2024-01-01T12:00:00.000Z',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Session last update timestamp',
            example: '2024-01-01T12:00:00.000Z',
          },
        },
        required: [
          'id',
          'address',
          'client_id',
          'access_token',
          'refresh_token',
          'is_active',
          'created_at',
          'updated_at',
        ],
      },
      Tokens: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'JWT access token',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          refreshToken: {
            type: 'string',
            description: 'JWT refresh token',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          fingerprint: {
            type: 'string',
            description: 'Token fingerprint for security',
            example: 'fp_123456789',
          },
        },
        required: ['accessToken', 'refreshToken', 'fingerprint'],
      },
      UserProfile: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'User wallet address',
            example: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          },
          name: {
            type: 'string',
            description: 'User display name',
            example: 'John Doe',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
            example: 'john.doe@example.com',
          },
          avatar_url: {
            type: 'string',
            format: 'uri',
            description: 'User avatar URL',
            example: 'https://example.com/avatar.jpg',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Profile creation timestamp',
            example: '2024-01-01T12:00:00.000Z',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Profile last update timestamp',
            example: '2024-01-01T12:00:00.000Z',
          },
        },
        required: ['address', 'created_at', 'updated_at'],
      },
      CredentialType: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Credential type identifier',
            example: 'credential_type_123',
          },
          name: {
            type: 'string',
            description: 'Credential type name',
            example: 'Identity Verification',
          },
          description: {
            type: 'string',
            description: 'Credential type description',
            example: 'Government-issued identity verification',
          },
          schema: {
            type: 'object',
            description: 'JSON schema for credential data',
            example: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                dateOfBirth: { type: 'string', format: 'date' },
                nationality: { type: 'string' },
              },
              required: ['name', 'dateOfBirth', 'nationality'],
            },
          },
          issuer_address: {
            type: 'string',
            description: 'Issuer wallet address',
            example: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Credential type creation timestamp',
            example: '2024-01-01T12:00:00.000Z',
          },
        },
        required: ['id', 'name', 'description', 'schema', 'issuer_address', 'created_at'],
      },
      Credential: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Credential identifier',
            example: 'credential_123',
          },
          user_address: {
            type: 'string',
            description: 'User wallet address',
            example: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          },
          issuer_address: {
            type: 'string',
            description: 'Issuer wallet address',
            example: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          },
          credential_type_id: {
            type: 'string',
            description: 'Credential type identifier',
            example: 'credential_type_123',
          },
          credential_data: {
            type: 'object',
            description: 'Credential data according to schema',
            example: {
              name: 'John Doe',
              dateOfBirth: '1990-01-01',
              nationality: 'US',
            },
          },
          metadata: {
            type: 'object',
            description: 'Additional credential metadata',
            example: {
              source: 'government_database',
              verificationLevel: 'high',
            },
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Credential creation timestamp',
            example: '2024-01-01T12:00:00.000Z',
          },
        },
        required: [
          'id',
          'user_address',
          'issuer_address',
          'credential_type_id',
          'credential_data',
          'created_at',
        ],
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            description: 'Error message',
            example: 'Invalid request parameters',
          },
          code: {
            type: 'string',
            description: 'Error code',
            example: 'INVALID_PARAMETERS',
          },
        },
        required: ['success', 'error'],
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            description: 'Success message',
            example: 'Operation completed successfully',
          },
        },
        required: ['success'],
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'Authentication and session management endpoints',
    },
    {
      name: 'Tokens',
      description: 'Token management and refresh endpoints',
    },
    {
      name: 'Credentials',
      description: 'Credential management endpoints',
    },
    {
      name: 'Clients',
      description: 'Client application management endpoints',
    },
    {
      name: 'Health',
      description: 'Health check and monitoring endpoints',
    },
  ],
};

module.exports = swaggerDefinition;
