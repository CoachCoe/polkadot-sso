import { z } from 'zod';

// Base schemas
export const addressSchema = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,}$/, 'Invalid Polkadot address format');
export const hexStringSchema = z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid hex string format');
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const timestampSchema = z.number().int().positive('Timestamp must be a positive integer');

// Challenge schemas
export const challengeQuerySchema = z.object({
  client_id: z.string().min(1, 'Client ID is required'),
  address: addressSchema.optional(),
  wallet: z.enum(['polkadot-js', 'nova-wallet', 'subwallet', 'talisman']).optional(),
});

export const challengeResponseSchema = z.object({
  id: uuidSchema,
  message: z.string().min(1, 'Challenge message is required'),
  code_verifier: z.string().min(32, 'Code verifier must be at least 32 characters'),
  state: z.string().min(16, 'State must be at least 16 characters'),
  expires_at: timestampSchema,
});

// Verification schemas
export const verificationQuerySchema = z.object({
  signature: hexStringSchema.min(64, 'Signature must be at least 64 characters'),
  challenge_id: uuidSchema,
  address: addressSchema,
  code_verifier: z.string().min(32, 'Code verifier must be at least 32 characters'),
  state: z.string().min(16, 'State must be at least 16 characters'),
});

export const verificationResponseSchema = z.object({
  success: z.boolean(),
  auth_code: z.string().optional(),
  error: z.string().optional(),
});

// Token schemas
export const tokenRequestSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(32, 'Authorization code must be at least 32 characters'),
  client_id: z.string().min(1, 'Client ID is required'),
  client_secret: z.string().min(32, 'Client secret must be at least 32 characters'),
  redirect_uri: z.string().url('Invalid redirect URI'),
});

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

// Client schemas
export const clientCreateSchema = z.object({
  client_id: z.string().min(1, 'Client ID is required').max(100, 'Client ID too long'),
  name: z.string().min(1, 'Client name is required').max(200, 'Client name too long'),
  redirect_urls: z
    .array(z.string().url('Invalid redirect URL'))
    .min(1, 'At least one redirect URL is required'),
  allowed_origins: z
    .array(z.string().url('Invalid origin URL'))
    .min(1, 'At least one allowed origin is required'),
  client_secret: z.string().min(32, 'Client secret must be at least 32 characters').optional(),
});

export const clientUpdateSchema = clientCreateSchema.partial().omit({ client_id: true });

export const clientResponseSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  redirect_urls: z.array(z.string()),
  allowed_origins: z.array(z.string()),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  is_active: z.boolean(),
});

// Credential schemas
export const credentialTypeCreateSchema = z.object({
  name: z.string().min(1, 'Credential type name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  schema_version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid schema version format'),
  schema_definition: z.string().min(1, 'Schema definition is required'),
  issuer_pattern: z
    .string()
    .regex(/^[1-9A-HJ-NP-Za-km-z\*]+$/, 'Invalid issuer pattern')
    .optional(),
  required_fields: z.array(z.string()).min(1, 'At least one required field is needed'),
  optional_fields: z.array(z.string()).optional(),
  validation_rules: z.string().optional(),
});

export const credentialCreateSchema = z.object({
  credential_type_id: uuidSchema,
  issuer_address: addressSchema,
  issuer_name: z.string().max(100, 'Issuer name too long').optional(),
  credential_data: z.string().min(1, 'Credential data is required'),
  proof_signature: hexStringSchema.optional(),
  proof_type: z.string().optional(),
  expires_at: timestampSchema.optional(),
});

export const credentialResponseSchema = z.object({
  id: uuidSchema,
  user_address: addressSchema,
  credential_type_id: uuidSchema,
  issuer_address: addressSchema,
  issuer_name: z.string().optional(),
  credential_data: z.string(),
  credential_hash: hexStringSchema,
  proof_signature: z.string().optional(),
  proof_type: z.string().optional(),
  expires_at: timestampSchema.optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  is_revoked: z.boolean(),
});

// Session schemas
export const sessionCreateSchema = z.object({
  address: addressSchema,
  client_id: z.string().min(1, 'Client ID is required'),
  fingerprint: z.string().min(16, 'Fingerprint must be at least 16 characters'),
});

export const sessionResponseSchema = z.object({
  id: uuidSchema,
  address: addressSchema,
  client_id: z.string(),
  access_token: z.string(),
  refresh_token: z.string(),
  access_token_expires_at: timestampSchema,
  refresh_token_expires_at: timestampSchema,
  created_at: timestampSchema,
  last_used_at: timestampSchema,
  is_active: z.boolean(),
});

// Audit log schemas
export const auditLogCreateSchema = z.object({
  event_type: z.enum([
    'login',
    'logout',
    'credential_create',
    'credential_revoke',
    'token_refresh',
    'error',
  ]),
  user_address: addressSchema.optional(),
  client_id: z.string().min(1, 'Client ID is required'),
  action: z.string().min(1, 'Action is required').max(200, 'Action too long'),
  status: z.enum(['success', 'failure', 'pending']),
  details: z.string().max(1000, 'Details too long').optional(),
  ip_address: z.string().ip('Invalid IP address'),
  user_agent: z.string().max(500, 'User agent too long').optional(),
});

export const auditLogResponseSchema = z.object({
  id: z.number().int().positive(),
  event_type: z.string(),
  user_address: z.string().optional(),
  client_id: z.string(),
  action: z.string(),
  status: z.string(),
  details: z.string().optional(),
  ip_address: z.string(),
  user_agent: z.string().optional(),
  created_at: timestampSchema,
});

// Kusama integration schemas
export const kusamaStoreSchema = z.object({
  credential_data: z.string().min(1, 'Credential data is required'),
  encryption_key: hexStringSchema.optional(),
  description: z.string().max(200, 'Description too long').optional(),
});

export const kusamaRetrieveSchema = z.object({
  transaction_hash: hexStringSchema,
  encryption_key: hexStringSchema.optional(),
});

export const kusamaResponseSchema = z.object({
  success: z.boolean(),
  transaction_hash: hexStringSchema.optional(),
  credential_data: z.string().optional(),
  error: z.string().optional(),
  estimated_cost: z
    .object({
      amount: z.string(),
      currency: z.string(),
      storage_method: z.string(),
    })
    .optional(),
});

// Error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  request_id: z.string().optional(),
  details: z.string().optional(),
  timestamp: timestampSchema,
});

// Pagination schemas
export const paginationQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('20'),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      total_pages: z.number().int().nonnegative(),
      has_next: z.boolean(),
      has_prev: z.boolean(),
    }),
  });

// Export all schemas
export const schemas = {
  // Base schemas
  address: addressSchema,
  hexString: hexStringSchema,
  uuid: uuidSchema,
  timestamp: timestampSchema,

  // Challenge schemas
  challengeQuery: challengeQuerySchema,
  challengeResponse: challengeResponseSchema,

  // Verification schemas
  verificationQuery: verificationQuerySchema,
  verificationResponse: verificationResponseSchema,

  // Token schemas
  tokenRequest: tokenRequestSchema,
  tokenResponse: tokenResponseSchema,

  // Client schemas
  clientCreate: clientCreateSchema,
  clientUpdate: clientUpdateSchema,
  clientResponse: clientResponseSchema,

  // Credential schemas
  credentialTypeCreate: credentialTypeCreateSchema,
  credentialCreate: credentialCreateSchema,
  credentialResponse: credentialResponseSchema,

  // Session schemas
  sessionCreate: sessionCreateSchema,
  sessionResponse: sessionResponseSchema,

  // Audit log schemas
  auditLogCreate: auditLogCreateSchema,
  auditLogResponse: auditLogResponseSchema,

  // Kusama schemas
  kusamaStore: kusamaStoreSchema,
  kusamaRetrieve: kusamaRetrieveSchema,
  kusamaResponse: kusamaResponseSchema,

  // Utility schemas
  errorResponse: errorResponseSchema,
  paginationQuery: paginationQuerySchema,
  paginatedResponse: paginatedResponseSchema,
} as const;
