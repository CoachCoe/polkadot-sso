"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = exports.paginatedResponseSchema = exports.paginationQuerySchema = exports.errorResponseSchema = exports.kusamaResponseSchema = exports.kusamaRetrieveSchema = exports.kusamaStoreSchema = exports.auditLogResponseSchema = exports.auditLogCreateSchema = exports.sessionResponseSchema = exports.sessionCreateSchema = exports.credentialResponseSchema = exports.credentialCreateSchema = exports.credentialTypeCreateSchema = exports.clientResponseSchema = exports.clientUpdateSchema = exports.clientCreateSchema = exports.tokenResponseSchema = exports.tokenRequestSchema = exports.verificationResponseSchema = exports.verificationQuerySchema = exports.challengeResponseSchema = exports.challengeQuerySchema = exports.timestampSchema = exports.uuidSchema = exports.hexStringSchema = exports.addressSchema = void 0;
const zod_1 = require("zod");
exports.addressSchema = zod_1.z
    .string()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,}$/, 'Invalid Polkadot address format');
exports.hexStringSchema = zod_1.z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid hex string format');
exports.uuidSchema = zod_1.z.string().uuid('Invalid UUID format');
exports.timestampSchema = zod_1.z.number().int().positive('Timestamp must be a positive integer');
exports.challengeQuerySchema = zod_1.z.object({
    client_id: zod_1.z.string().min(1, 'Client ID is required'),
    address: exports.addressSchema.optional(),
    wallet: zod_1.z.enum(['polkadot-js', 'nova-wallet', 'subwallet', 'talisman']).optional(),
});
exports.challengeResponseSchema = zod_1.z.object({
    id: exports.uuidSchema,
    message: zod_1.z.string().min(1, 'Challenge message is required'),
    code_verifier: zod_1.z.string().min(32, 'Code verifier must be at least 32 characters'),
    state: zod_1.z.string().min(16, 'State must be at least 16 characters'),
    expires_at: exports.timestampSchema,
});
exports.verificationQuerySchema = zod_1.z.object({
    signature: exports.hexStringSchema.min(64, 'Signature must be at least 64 characters'),
    challenge_id: exports.uuidSchema,
    address: exports.addressSchema,
    code_verifier: zod_1.z.string().min(32, 'Code verifier must be at least 32 characters'),
    state: zod_1.z.string().min(16, 'State must be at least 16 characters'),
});
exports.verificationResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    auth_code: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
});
exports.tokenRequestSchema = zod_1.z.object({
    grant_type: zod_1.z.literal('authorization_code'),
    code: zod_1.z.string().min(32, 'Authorization code must be at least 32 characters'),
    client_id: zod_1.z.string().min(1, 'Client ID is required'),
    client_secret: zod_1.z.string().min(32, 'Client secret must be at least 32 characters'),
    redirect_uri: zod_1.z.string().url('Invalid redirect URI'),
});
exports.tokenResponseSchema = zod_1.z.object({
    access_token: zod_1.z.string(),
    token_type: zod_1.z.literal('Bearer'),
    expires_in: zod_1.z.number().int().positive(),
    refresh_token: zod_1.z.string().optional(),
    scope: zod_1.z.string().optional(),
});
exports.clientCreateSchema = zod_1.z.object({
    client_id: zod_1.z.string().min(1, 'Client ID is required').max(100, 'Client ID too long'),
    name: zod_1.z.string().min(1, 'Client name is required').max(200, 'Client name too long'),
    redirect_urls: zod_1.z
        .array(zod_1.z.string().url('Invalid redirect URL'))
        .min(1, 'At least one redirect URL is required'),
    allowed_origins: zod_1.z
        .array(zod_1.z.string().url('Invalid origin URL'))
        .min(1, 'At least one allowed origin is required'),
    client_secret: zod_1.z.string().min(32, 'Client secret must be at least 32 characters').optional(),
});
exports.clientUpdateSchema = exports.clientCreateSchema.partial().omit({ client_id: true });
exports.clientResponseSchema = zod_1.z.object({
    client_id: zod_1.z.string(),
    name: zod_1.z.string(),
    redirect_urls: zod_1.z.array(zod_1.z.string()),
    allowed_origins: zod_1.z.array(zod_1.z.string()),
    created_at: exports.timestampSchema,
    updated_at: exports.timestampSchema,
    is_active: zod_1.z.boolean(),
});
exports.credentialTypeCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Credential type name is required').max(100, 'Name too long'),
    description: zod_1.z.string().max(500, 'Description too long').optional(),
    schema_version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid schema version format'),
    schema_definition: zod_1.z.string().min(1, 'Schema definition is required'),
    issuer_pattern: zod_1.z
        .string()
        .regex(/^[1-9A-HJ-NP-Za-km-z\*]+$/, 'Invalid issuer pattern')
        .optional(),
    required_fields: zod_1.z.array(zod_1.z.string()).min(1, 'At least one required field is needed'),
    optional_fields: zod_1.z.array(zod_1.z.string()).optional(),
    validation_rules: zod_1.z.string().optional(),
});
exports.credentialCreateSchema = zod_1.z.object({
    credential_type_id: exports.uuidSchema,
    issuer_address: exports.addressSchema,
    issuer_name: zod_1.z.string().max(100, 'Issuer name too long').optional(),
    credential_data: zod_1.z.string().min(1, 'Credential data is required'),
    proof_signature: exports.hexStringSchema.optional(),
    proof_type: zod_1.z.string().optional(),
    expires_at: exports.timestampSchema.optional(),
});
exports.credentialResponseSchema = zod_1.z.object({
    id: exports.uuidSchema,
    user_address: exports.addressSchema,
    credential_type_id: exports.uuidSchema,
    issuer_address: exports.addressSchema,
    issuer_name: zod_1.z.string().optional(),
    credential_data: zod_1.z.string(),
    credential_hash: exports.hexStringSchema,
    proof_signature: zod_1.z.string().optional(),
    proof_type: zod_1.z.string().optional(),
    expires_at: exports.timestampSchema.optional(),
    created_at: exports.timestampSchema,
    updated_at: exports.timestampSchema,
    is_revoked: zod_1.z.boolean(),
});
exports.sessionCreateSchema = zod_1.z.object({
    address: exports.addressSchema,
    client_id: zod_1.z.string().min(1, 'Client ID is required'),
    fingerprint: zod_1.z.string().min(16, 'Fingerprint must be at least 16 characters'),
});
exports.sessionResponseSchema = zod_1.z.object({
    id: exports.uuidSchema,
    address: exports.addressSchema,
    client_id: zod_1.z.string(),
    access_token: zod_1.z.string(),
    refresh_token: zod_1.z.string(),
    access_token_expires_at: exports.timestampSchema,
    refresh_token_expires_at: exports.timestampSchema,
    created_at: exports.timestampSchema,
    last_used_at: exports.timestampSchema,
    is_active: zod_1.z.boolean(),
});
exports.auditLogCreateSchema = zod_1.z.object({
    event_type: zod_1.z.enum([
        'login',
        'logout',
        'credential_create',
        'credential_revoke',
        'token_refresh',
        'error',
    ]),
    user_address: exports.addressSchema.optional(),
    client_id: zod_1.z.string().min(1, 'Client ID is required'),
    action: zod_1.z.string().min(1, 'Action is required').max(200, 'Action too long'),
    status: zod_1.z.enum(['success', 'failure', 'pending']),
    details: zod_1.z.string().max(1000, 'Details too long').optional(),
    ip_address: zod_1.z.string().ip('Invalid IP address'),
    user_agent: zod_1.z.string().max(500, 'User agent too long').optional(),
});
exports.auditLogResponseSchema = zod_1.z.object({
    id: zod_1.z.number().int().positive(),
    event_type: zod_1.z.string(),
    user_address: zod_1.z.string().optional(),
    client_id: zod_1.z.string(),
    action: zod_1.z.string(),
    status: zod_1.z.string(),
    details: zod_1.z.string().optional(),
    ip_address: zod_1.z.string(),
    user_agent: zod_1.z.string().optional(),
    created_at: exports.timestampSchema,
});
exports.kusamaStoreSchema = zod_1.z.object({
    credential_data: zod_1.z.string().min(1, 'Credential data is required'),
    encryption_key: exports.hexStringSchema.optional(),
    description: zod_1.z.string().max(200, 'Description too long').optional(),
});
exports.kusamaRetrieveSchema = zod_1.z.object({
    transaction_hash: exports.hexStringSchema,
    encryption_key: exports.hexStringSchema.optional(),
});
exports.kusamaResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    transaction_hash: exports.hexStringSchema.optional(),
    credential_data: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
    estimated_cost: zod_1.z
        .object({
        amount: zod_1.z.string(),
        currency: zod_1.z.string(),
        storage_method: zod_1.z.string(),
    })
        .optional(),
});
exports.errorResponseSchema = zod_1.z.object({
    error: zod_1.z.string(),
    message: zod_1.z.string().optional(),
    request_id: zod_1.z.string().optional(),
    details: zod_1.z.string().optional(),
    timestamp: exports.timestampSchema,
});
exports.paginationQuerySchema = zod_1.z.object({
    page: zod_1.z.string().transform(Number).pipe(zod_1.z.number().int().min(1)).default('1'),
    limit: zod_1.z.string().transform(Number).pipe(zod_1.z.number().int().min(1).max(100)).default('20'),
    sort_by: zod_1.z.string().optional(),
    sort_order: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
const paginatedResponseSchema = (itemSchema) => zod_1.z.object({
    items: zod_1.z.array(itemSchema),
    pagination: zod_1.z.object({
        page: zod_1.z.number().int().positive(),
        limit: zod_1.z.number().int().positive(),
        total: zod_1.z.number().int().nonnegative(),
        total_pages: zod_1.z.number().int().nonnegative(),
        has_next: zod_1.z.boolean(),
        has_prev: zod_1.z.boolean(),
    }),
});
exports.paginatedResponseSchema = paginatedResponseSchema;
exports.schemas = {
    address: exports.addressSchema,
    hexString: exports.hexStringSchema,
    uuid: exports.uuidSchema,
    timestamp: exports.timestampSchema,
    challengeQuery: exports.challengeQuerySchema,
    challengeResponse: exports.challengeResponseSchema,
    verificationQuery: exports.verificationQuerySchema,
    verificationResponse: exports.verificationResponseSchema,
    tokenRequest: exports.tokenRequestSchema,
    tokenResponse: exports.tokenResponseSchema,
    clientCreate: exports.clientCreateSchema,
    clientUpdate: exports.clientUpdateSchema,
    clientResponse: exports.clientResponseSchema,
    credentialTypeCreate: exports.credentialTypeCreateSchema,
    credentialCreate: exports.credentialCreateSchema,
    credentialResponse: exports.credentialResponseSchema,
    sessionCreate: exports.sessionCreateSchema,
    sessionResponse: exports.sessionResponseSchema,
    auditLogCreate: exports.auditLogCreateSchema,
    auditLogResponse: exports.auditLogResponseSchema,
    kusamaStore: exports.kusamaStoreSchema,
    kusamaRetrieve: exports.kusamaRetrieveSchema,
    kusamaResponse: exports.kusamaResponseSchema,
    errorResponse: exports.errorResponseSchema,
    paginationQuery: exports.paginationQuerySchema,
    paginatedResponse: exports.paginatedResponseSchema,
};
//# sourceMappingURL=schemas.js.map