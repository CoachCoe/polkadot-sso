import { z } from 'zod';
export declare const addressSchema: z.ZodString;
export declare const hexStringSchema: z.ZodString;
export declare const uuidSchema: z.ZodString;
export declare const timestampSchema: z.ZodNumber;
export declare const challengeQuerySchema: z.ZodObject<{
    client_id: z.ZodString;
    address: z.ZodOptional<z.ZodString>;
    wallet: z.ZodOptional<z.ZodEnum<["polkadot-js", "nova-wallet", "subwallet", "talisman"]>>;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    address?: string | undefined;
    wallet?: "polkadot-js" | "nova-wallet" | "subwallet" | "talisman" | undefined;
}, {
    client_id: string;
    address?: string | undefined;
    wallet?: "polkadot-js" | "nova-wallet" | "subwallet" | "talisman" | undefined;
}>;
export declare const challengeResponseSchema: z.ZodObject<{
    id: z.ZodString;
    message: z.ZodString;
    code_verifier: z.ZodString;
    state: z.ZodString;
    expires_at: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    message: string;
    id: string;
    expires_at: number;
    code_verifier: string;
    state: string;
}, {
    message: string;
    id: string;
    expires_at: number;
    code_verifier: string;
    state: string;
}>;
export declare const verificationQuerySchema: z.ZodObject<{
    signature: z.ZodString;
    challenge_id: z.ZodString;
    address: z.ZodString;
    code_verifier: z.ZodString;
    state: z.ZodString;
}, "strip", z.ZodTypeAny, {
    address: string;
    code_verifier: string;
    state: string;
    signature: string;
    challenge_id: string;
}, {
    address: string;
    code_verifier: string;
    state: string;
    signature: string;
    challenge_id: string;
}>;
export declare const verificationResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    auth_code: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    error?: string | undefined;
    auth_code?: string | undefined;
}, {
    success: boolean;
    error?: string | undefined;
    auth_code?: string | undefined;
}>;
export declare const tokenRequestSchema: z.ZodObject<{
    grant_type: z.ZodLiteral<"authorization_code">;
    code: z.ZodString;
    client_id: z.ZodString;
    client_secret: z.ZodString;
    redirect_uri: z.ZodString;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    code: string;
    grant_type: "authorization_code";
    client_secret: string;
    redirect_uri: string;
}, {
    client_id: string;
    code: string;
    grant_type: "authorization_code";
    client_secret: string;
    redirect_uri: string;
}>;
export declare const tokenResponseSchema: z.ZodObject<{
    access_token: z.ZodString;
    token_type: z.ZodLiteral<"Bearer">;
    expires_in: z.ZodNumber;
    refresh_token: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    access_token: string;
    token_type: "Bearer";
    expires_in: number;
    refresh_token?: string | undefined;
    scope?: string | undefined;
}, {
    access_token: string;
    token_type: "Bearer";
    expires_in: number;
    refresh_token?: string | undefined;
    scope?: string | undefined;
}>;
export declare const clientCreateSchema: z.ZodObject<{
    client_id: z.ZodString;
    name: z.ZodString;
    redirect_urls: z.ZodArray<z.ZodString, "many">;
    allowed_origins: z.ZodArray<z.ZodString, "many">;
    client_secret: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    name: string;
    redirect_urls: string[];
    allowed_origins: string[];
    client_secret?: string | undefined;
}, {
    client_id: string;
    name: string;
    redirect_urls: string[];
    allowed_origins: string[];
    client_secret?: string | undefined;
}>;
export declare const clientUpdateSchema: z.ZodObject<Omit<{
    client_id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    redirect_urls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    allowed_origins: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    client_secret: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "client_id">, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    client_secret?: string | undefined;
    redirect_urls?: string[] | undefined;
    allowed_origins?: string[] | undefined;
}, {
    name?: string | undefined;
    client_secret?: string | undefined;
    redirect_urls?: string[] | undefined;
    allowed_origins?: string[] | undefined;
}>;
export declare const clientResponseSchema: z.ZodObject<{
    client_id: z.ZodString;
    name: z.ZodString;
    redirect_urls: z.ZodArray<z.ZodString, "many">;
    allowed_origins: z.ZodArray<z.ZodString, "many">;
    created_at: z.ZodNumber;
    updated_at: z.ZodNumber;
    is_active: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    name: string;
    created_at: number;
    redirect_urls: string[];
    allowed_origins: string[];
    updated_at: number;
    is_active: boolean;
}, {
    client_id: string;
    name: string;
    created_at: number;
    redirect_urls: string[];
    allowed_origins: string[];
    updated_at: number;
    is_active: boolean;
}>;
export declare const credentialTypeCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    schema_version: z.ZodString;
    schema_definition: z.ZodString;
    issuer_pattern: z.ZodOptional<z.ZodString>;
    required_fields: z.ZodArray<z.ZodString, "many">;
    optional_fields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    validation_rules: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    schema_version: string;
    schema_definition: string;
    required_fields: string[];
    description?: string | undefined;
    issuer_pattern?: string | undefined;
    optional_fields?: string[] | undefined;
    validation_rules?: string | undefined;
}, {
    name: string;
    schema_version: string;
    schema_definition: string;
    required_fields: string[];
    description?: string | undefined;
    issuer_pattern?: string | undefined;
    optional_fields?: string[] | undefined;
    validation_rules?: string | undefined;
}>;
export declare const credentialCreateSchema: z.ZodObject<{
    credential_type_id: z.ZodString;
    issuer_address: z.ZodString;
    issuer_name: z.ZodOptional<z.ZodString>;
    credential_data: z.ZodString;
    proof_signature: z.ZodOptional<z.ZodString>;
    proof_type: z.ZodOptional<z.ZodString>;
    expires_at: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    credential_type_id: string;
    issuer_address: string;
    credential_data: string;
    expires_at?: number | undefined;
    issuer_name?: string | undefined;
    proof_signature?: string | undefined;
    proof_type?: string | undefined;
}, {
    credential_type_id: string;
    issuer_address: string;
    credential_data: string;
    expires_at?: number | undefined;
    issuer_name?: string | undefined;
    proof_signature?: string | undefined;
    proof_type?: string | undefined;
}>;
export declare const credentialResponseSchema: z.ZodObject<{
    id: z.ZodString;
    user_address: z.ZodString;
    credential_type_id: z.ZodString;
    issuer_address: z.ZodString;
    issuer_name: z.ZodOptional<z.ZodString>;
    credential_data: z.ZodString;
    credential_hash: z.ZodString;
    proof_signature: z.ZodOptional<z.ZodString>;
    proof_type: z.ZodOptional<z.ZodString>;
    expires_at: z.ZodOptional<z.ZodNumber>;
    created_at: z.ZodNumber;
    updated_at: z.ZodNumber;
    is_revoked: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: number;
    updated_at: number;
    credential_type_id: string;
    issuer_address: string;
    credential_data: string;
    user_address: string;
    credential_hash: string;
    is_revoked: boolean;
    expires_at?: number | undefined;
    issuer_name?: string | undefined;
    proof_signature?: string | undefined;
    proof_type?: string | undefined;
}, {
    id: string;
    created_at: number;
    updated_at: number;
    credential_type_id: string;
    issuer_address: string;
    credential_data: string;
    user_address: string;
    credential_hash: string;
    is_revoked: boolean;
    expires_at?: number | undefined;
    issuer_name?: string | undefined;
    proof_signature?: string | undefined;
    proof_type?: string | undefined;
}>;
export declare const sessionCreateSchema: z.ZodObject<{
    address: z.ZodString;
    client_id: z.ZodString;
    fingerprint: z.ZodString;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    address: string;
    fingerprint: string;
}, {
    client_id: string;
    address: string;
    fingerprint: string;
}>;
export declare const sessionResponseSchema: z.ZodObject<{
    id: z.ZodString;
    address: z.ZodString;
    client_id: z.ZodString;
    access_token: z.ZodString;
    refresh_token: z.ZodString;
    access_token_expires_at: z.ZodNumber;
    refresh_token_expires_at: z.ZodNumber;
    created_at: z.ZodNumber;
    last_used_at: z.ZodNumber;
    is_active: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    address: string;
    id: string;
    created_at: number;
    access_token: string;
    refresh_token: string;
    is_active: boolean;
    access_token_expires_at: number;
    refresh_token_expires_at: number;
    last_used_at: number;
}, {
    client_id: string;
    address: string;
    id: string;
    created_at: number;
    access_token: string;
    refresh_token: string;
    is_active: boolean;
    access_token_expires_at: number;
    refresh_token_expires_at: number;
    last_used_at: number;
}>;
export declare const auditLogCreateSchema: z.ZodObject<{
    event_type: z.ZodEnum<["login", "logout", "credential_create", "credential_revoke", "token_refresh", "error"]>;
    user_address: z.ZodOptional<z.ZodString>;
    client_id: z.ZodString;
    action: z.ZodString;
    status: z.ZodEnum<["success", "failure", "pending"]>;
    details: z.ZodOptional<z.ZodString>;
    ip_address: z.ZodString;
    user_agent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    status: "success" | "failure" | "pending";
    event_type: "error" | "login" | "logout" | "credential_create" | "credential_revoke" | "token_refresh";
    action: string;
    ip_address: string;
    user_address?: string | undefined;
    details?: string | undefined;
    user_agent?: string | undefined;
}, {
    client_id: string;
    status: "success" | "failure" | "pending";
    event_type: "error" | "login" | "logout" | "credential_create" | "credential_revoke" | "token_refresh";
    action: string;
    ip_address: string;
    user_address?: string | undefined;
    details?: string | undefined;
    user_agent?: string | undefined;
}>;
export declare const auditLogResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    event_type: z.ZodString;
    user_address: z.ZodOptional<z.ZodString>;
    client_id: z.ZodString;
    action: z.ZodString;
    status: z.ZodString;
    details: z.ZodOptional<z.ZodString>;
    ip_address: z.ZodString;
    user_agent: z.ZodOptional<z.ZodString>;
    created_at: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    id: number;
    created_at: number;
    status: string;
    event_type: string;
    action: string;
    ip_address: string;
    user_address?: string | undefined;
    details?: string | undefined;
    user_agent?: string | undefined;
}, {
    client_id: string;
    id: number;
    created_at: number;
    status: string;
    event_type: string;
    action: string;
    ip_address: string;
    user_address?: string | undefined;
    details?: string | undefined;
    user_agent?: string | undefined;
}>;
export declare const kusamaStoreSchema: z.ZodObject<{
    credential_data: z.ZodString;
    encryption_key: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    credential_data: string;
    description?: string | undefined;
    encryption_key?: string | undefined;
}, {
    credential_data: string;
    description?: string | undefined;
    encryption_key?: string | undefined;
}>;
export declare const kusamaRetrieveSchema: z.ZodObject<{
    transaction_hash: z.ZodString;
    encryption_key: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    transaction_hash: string;
    encryption_key?: string | undefined;
}, {
    transaction_hash: string;
    encryption_key?: string | undefined;
}>;
export declare const kusamaResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    transaction_hash: z.ZodOptional<z.ZodString>;
    credential_data: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
    estimated_cost: z.ZodOptional<z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodString;
        storage_method: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        amount: string;
        currency: string;
        storage_method: string;
    }, {
        amount: string;
        currency: string;
        storage_method: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    error?: string | undefined;
    credential_data?: string | undefined;
    transaction_hash?: string | undefined;
    estimated_cost?: {
        amount: string;
        currency: string;
        storage_method: string;
    } | undefined;
}, {
    success: boolean;
    error?: string | undefined;
    credential_data?: string | undefined;
    transaction_hash?: string | undefined;
    estimated_cost?: {
        amount: string;
        currency: string;
        storage_method: string;
    } | undefined;
}>;
export declare const errorResponseSchema: z.ZodObject<{
    error: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
    request_id: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    error: string;
    message?: string | undefined;
    details?: string | undefined;
    request_id?: string | undefined;
}, {
    timestamp: number;
    error: string;
    message?: string | undefined;
    details?: string | undefined;
    request_id?: string | undefined;
}>;
export declare const paginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    sort_by: z.ZodOptional<z.ZodString>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    sort_order: "asc" | "desc";
    sort_by?: string | undefined;
}, {
    limit?: string | undefined;
    page?: string | undefined;
    sort_by?: string | undefined;
    sort_order?: "asc" | "desc" | undefined;
}>;
export declare const paginatedResponseSchema: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
    items: z.ZodArray<T, "many">;
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        total_pages: z.ZodNumber;
        has_next: z.ZodBoolean;
        has_prev: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        total: number;
        limit: number;
        page: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    }, {
        total: number;
        limit: number;
        page: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    items: T["_output"][];
    pagination: {
        total: number;
        limit: number;
        page: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}, {
    items: T["_input"][];
    pagination: {
        total: number;
        limit: number;
        page: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}>;
export declare const schemas: {
    readonly address: z.ZodString;
    readonly hexString: z.ZodString;
    readonly uuid: z.ZodString;
    readonly timestamp: z.ZodNumber;
    readonly challengeQuery: z.ZodObject<{
        client_id: z.ZodString;
        address: z.ZodOptional<z.ZodString>;
        wallet: z.ZodOptional<z.ZodEnum<["polkadot-js", "nova-wallet", "subwallet", "talisman"]>>;
    }, "strip", z.ZodTypeAny, {
        client_id: string;
        address?: string | undefined;
        wallet?: "polkadot-js" | "nova-wallet" | "subwallet" | "talisman" | undefined;
    }, {
        client_id: string;
        address?: string | undefined;
        wallet?: "polkadot-js" | "nova-wallet" | "subwallet" | "talisman" | undefined;
    }>;
    readonly challengeResponse: z.ZodObject<{
        id: z.ZodString;
        message: z.ZodString;
        code_verifier: z.ZodString;
        state: z.ZodString;
        expires_at: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        message: string;
        id: string;
        expires_at: number;
        code_verifier: string;
        state: string;
    }, {
        message: string;
        id: string;
        expires_at: number;
        code_verifier: string;
        state: string;
    }>;
    readonly verificationQuery: z.ZodObject<{
        signature: z.ZodString;
        challenge_id: z.ZodString;
        address: z.ZodString;
        code_verifier: z.ZodString;
        state: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        address: string;
        code_verifier: string;
        state: string;
        signature: string;
        challenge_id: string;
    }, {
        address: string;
        code_verifier: string;
        state: string;
        signature: string;
        challenge_id: string;
    }>;
    readonly verificationResponse: z.ZodObject<{
        success: z.ZodBoolean;
        auth_code: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        success: boolean;
        error?: string | undefined;
        auth_code?: string | undefined;
    }, {
        success: boolean;
        error?: string | undefined;
        auth_code?: string | undefined;
    }>;
    readonly tokenRequest: z.ZodObject<{
        grant_type: z.ZodLiteral<"authorization_code">;
        code: z.ZodString;
        client_id: z.ZodString;
        client_secret: z.ZodString;
        redirect_uri: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        client_id: string;
        code: string;
        grant_type: "authorization_code";
        client_secret: string;
        redirect_uri: string;
    }, {
        client_id: string;
        code: string;
        grant_type: "authorization_code";
        client_secret: string;
        redirect_uri: string;
    }>;
    readonly tokenResponse: z.ZodObject<{
        access_token: z.ZodString;
        token_type: z.ZodLiteral<"Bearer">;
        expires_in: z.ZodNumber;
        refresh_token: z.ZodOptional<z.ZodString>;
        scope: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        access_token: string;
        token_type: "Bearer";
        expires_in: number;
        refresh_token?: string | undefined;
        scope?: string | undefined;
    }, {
        access_token: string;
        token_type: "Bearer";
        expires_in: number;
        refresh_token?: string | undefined;
        scope?: string | undefined;
    }>;
    readonly clientCreate: z.ZodObject<{
        client_id: z.ZodString;
        name: z.ZodString;
        redirect_urls: z.ZodArray<z.ZodString, "many">;
        allowed_origins: z.ZodArray<z.ZodString, "many">;
        client_secret: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        client_id: string;
        name: string;
        redirect_urls: string[];
        allowed_origins: string[];
        client_secret?: string | undefined;
    }, {
        client_id: string;
        name: string;
        redirect_urls: string[];
        allowed_origins: string[];
        client_secret?: string | undefined;
    }>;
    readonly clientUpdate: z.ZodObject<Omit<{
        client_id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        redirect_urls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        allowed_origins: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        client_secret: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, "client_id">, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        client_secret?: string | undefined;
        redirect_urls?: string[] | undefined;
        allowed_origins?: string[] | undefined;
    }, {
        name?: string | undefined;
        client_secret?: string | undefined;
        redirect_urls?: string[] | undefined;
        allowed_origins?: string[] | undefined;
    }>;
    readonly clientResponse: z.ZodObject<{
        client_id: z.ZodString;
        name: z.ZodString;
        redirect_urls: z.ZodArray<z.ZodString, "many">;
        allowed_origins: z.ZodArray<z.ZodString, "many">;
        created_at: z.ZodNumber;
        updated_at: z.ZodNumber;
        is_active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        client_id: string;
        name: string;
        created_at: number;
        redirect_urls: string[];
        allowed_origins: string[];
        updated_at: number;
        is_active: boolean;
    }, {
        client_id: string;
        name: string;
        created_at: number;
        redirect_urls: string[];
        allowed_origins: string[];
        updated_at: number;
        is_active: boolean;
    }>;
    readonly credentialTypeCreate: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        schema_version: z.ZodString;
        schema_definition: z.ZodString;
        issuer_pattern: z.ZodOptional<z.ZodString>;
        required_fields: z.ZodArray<z.ZodString, "many">;
        optional_fields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        validation_rules: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        schema_version: string;
        schema_definition: string;
        required_fields: string[];
        description?: string | undefined;
        issuer_pattern?: string | undefined;
        optional_fields?: string[] | undefined;
        validation_rules?: string | undefined;
    }, {
        name: string;
        schema_version: string;
        schema_definition: string;
        required_fields: string[];
        description?: string | undefined;
        issuer_pattern?: string | undefined;
        optional_fields?: string[] | undefined;
        validation_rules?: string | undefined;
    }>;
    readonly credentialCreate: z.ZodObject<{
        credential_type_id: z.ZodString;
        issuer_address: z.ZodString;
        issuer_name: z.ZodOptional<z.ZodString>;
        credential_data: z.ZodString;
        proof_signature: z.ZodOptional<z.ZodString>;
        proof_type: z.ZodOptional<z.ZodString>;
        expires_at: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        credential_type_id: string;
        issuer_address: string;
        credential_data: string;
        expires_at?: number | undefined;
        issuer_name?: string | undefined;
        proof_signature?: string | undefined;
        proof_type?: string | undefined;
    }, {
        credential_type_id: string;
        issuer_address: string;
        credential_data: string;
        expires_at?: number | undefined;
        issuer_name?: string | undefined;
        proof_signature?: string | undefined;
        proof_type?: string | undefined;
    }>;
    readonly credentialResponse: z.ZodObject<{
        id: z.ZodString;
        user_address: z.ZodString;
        credential_type_id: z.ZodString;
        issuer_address: z.ZodString;
        issuer_name: z.ZodOptional<z.ZodString>;
        credential_data: z.ZodString;
        credential_hash: z.ZodString;
        proof_signature: z.ZodOptional<z.ZodString>;
        proof_type: z.ZodOptional<z.ZodString>;
        expires_at: z.ZodOptional<z.ZodNumber>;
        created_at: z.ZodNumber;
        updated_at: z.ZodNumber;
        is_revoked: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        created_at: number;
        updated_at: number;
        credential_type_id: string;
        issuer_address: string;
        credential_data: string;
        user_address: string;
        credential_hash: string;
        is_revoked: boolean;
        expires_at?: number | undefined;
        issuer_name?: string | undefined;
        proof_signature?: string | undefined;
        proof_type?: string | undefined;
    }, {
        id: string;
        created_at: number;
        updated_at: number;
        credential_type_id: string;
        issuer_address: string;
        credential_data: string;
        user_address: string;
        credential_hash: string;
        is_revoked: boolean;
        expires_at?: number | undefined;
        issuer_name?: string | undefined;
        proof_signature?: string | undefined;
        proof_type?: string | undefined;
    }>;
    readonly sessionCreate: z.ZodObject<{
        address: z.ZodString;
        client_id: z.ZodString;
        fingerprint: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        client_id: string;
        address: string;
        fingerprint: string;
    }, {
        client_id: string;
        address: string;
        fingerprint: string;
    }>;
    readonly sessionResponse: z.ZodObject<{
        id: z.ZodString;
        address: z.ZodString;
        client_id: z.ZodString;
        access_token: z.ZodString;
        refresh_token: z.ZodString;
        access_token_expires_at: z.ZodNumber;
        refresh_token_expires_at: z.ZodNumber;
        created_at: z.ZodNumber;
        last_used_at: z.ZodNumber;
        is_active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        client_id: string;
        address: string;
        id: string;
        created_at: number;
        access_token: string;
        refresh_token: string;
        is_active: boolean;
        access_token_expires_at: number;
        refresh_token_expires_at: number;
        last_used_at: number;
    }, {
        client_id: string;
        address: string;
        id: string;
        created_at: number;
        access_token: string;
        refresh_token: string;
        is_active: boolean;
        access_token_expires_at: number;
        refresh_token_expires_at: number;
        last_used_at: number;
    }>;
    readonly auditLogCreate: z.ZodObject<{
        event_type: z.ZodEnum<["login", "logout", "credential_create", "credential_revoke", "token_refresh", "error"]>;
        user_address: z.ZodOptional<z.ZodString>;
        client_id: z.ZodString;
        action: z.ZodString;
        status: z.ZodEnum<["success", "failure", "pending"]>;
        details: z.ZodOptional<z.ZodString>;
        ip_address: z.ZodString;
        user_agent: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        client_id: string;
        status: "success" | "failure" | "pending";
        event_type: "error" | "login" | "logout" | "credential_create" | "credential_revoke" | "token_refresh";
        action: string;
        ip_address: string;
        user_address?: string | undefined;
        details?: string | undefined;
        user_agent?: string | undefined;
    }, {
        client_id: string;
        status: "success" | "failure" | "pending";
        event_type: "error" | "login" | "logout" | "credential_create" | "credential_revoke" | "token_refresh";
        action: string;
        ip_address: string;
        user_address?: string | undefined;
        details?: string | undefined;
        user_agent?: string | undefined;
    }>;
    readonly auditLogResponse: z.ZodObject<{
        id: z.ZodNumber;
        event_type: z.ZodString;
        user_address: z.ZodOptional<z.ZodString>;
        client_id: z.ZodString;
        action: z.ZodString;
        status: z.ZodString;
        details: z.ZodOptional<z.ZodString>;
        ip_address: z.ZodString;
        user_agent: z.ZodOptional<z.ZodString>;
        created_at: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        client_id: string;
        id: number;
        created_at: number;
        status: string;
        event_type: string;
        action: string;
        ip_address: string;
        user_address?: string | undefined;
        details?: string | undefined;
        user_agent?: string | undefined;
    }, {
        client_id: string;
        id: number;
        created_at: number;
        status: string;
        event_type: string;
        action: string;
        ip_address: string;
        user_address?: string | undefined;
        details?: string | undefined;
        user_agent?: string | undefined;
    }>;
    readonly kusamaStore: z.ZodObject<{
        credential_data: z.ZodString;
        encryption_key: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        credential_data: string;
        description?: string | undefined;
        encryption_key?: string | undefined;
    }, {
        credential_data: string;
        description?: string | undefined;
        encryption_key?: string | undefined;
    }>;
    readonly kusamaRetrieve: z.ZodObject<{
        transaction_hash: z.ZodString;
        encryption_key: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        transaction_hash: string;
        encryption_key?: string | undefined;
    }, {
        transaction_hash: string;
        encryption_key?: string | undefined;
    }>;
    readonly kusamaResponse: z.ZodObject<{
        success: z.ZodBoolean;
        transaction_hash: z.ZodOptional<z.ZodString>;
        credential_data: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        estimated_cost: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodString;
            storage_method: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            amount: string;
            currency: string;
            storage_method: string;
        }, {
            amount: string;
            currency: string;
            storage_method: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        success: boolean;
        error?: string | undefined;
        credential_data?: string | undefined;
        transaction_hash?: string | undefined;
        estimated_cost?: {
            amount: string;
            currency: string;
            storage_method: string;
        } | undefined;
    }, {
        success: boolean;
        error?: string | undefined;
        credential_data?: string | undefined;
        transaction_hash?: string | undefined;
        estimated_cost?: {
            amount: string;
            currency: string;
            storage_method: string;
        } | undefined;
    }>;
    readonly errorResponse: z.ZodObject<{
        error: z.ZodString;
        message: z.ZodOptional<z.ZodString>;
        request_id: z.ZodOptional<z.ZodString>;
        details: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        timestamp: number;
        error: string;
        message?: string | undefined;
        details?: string | undefined;
        request_id?: string | undefined;
    }, {
        timestamp: number;
        error: string;
        message?: string | undefined;
        details?: string | undefined;
        request_id?: string | undefined;
    }>;
    readonly paginationQuery: z.ZodObject<{
        page: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
        limit: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
        sort_by: z.ZodOptional<z.ZodString>;
        sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
        sort_order: "asc" | "desc";
        sort_by?: string | undefined;
    }, {
        limit?: string | undefined;
        page?: string | undefined;
        sort_by?: string | undefined;
        sort_order?: "asc" | "desc" | undefined;
    }>;
    readonly paginatedResponse: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
        items: z.ZodArray<T, "many">;
        pagination: z.ZodObject<{
            page: z.ZodNumber;
            limit: z.ZodNumber;
            total: z.ZodNumber;
            total_pages: z.ZodNumber;
            has_next: z.ZodBoolean;
            has_prev: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            total: number;
            limit: number;
            page: number;
            total_pages: number;
            has_next: boolean;
            has_prev: boolean;
        }, {
            total: number;
            limit: number;
            page: number;
            total_pages: number;
            has_next: boolean;
            has_prev: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        items: T["_output"][];
        pagination: {
            total: number;
            limit: number;
            page: number;
            total_pages: number;
            has_next: boolean;
            has_prev: boolean;
        };
    }, {
        items: T["_input"][];
        pagination: {
            total: number;
            limit: number;
            page: number;
            total_pages: number;
            has_next: boolean;
            has_prev: boolean;
        };
    }>;
};
//# sourceMappingURL=schemas.d.ts.map