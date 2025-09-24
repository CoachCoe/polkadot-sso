export type AuditEventType =
  | 'AUTH_ATTEMPT'
  | 'TOKEN_EXCHANGE'
  | 'CHALLENGE_CREATED'
  | 'CHALLENGE_VERIFIED'
  | 'TOKEN_REFRESH'
  | 'CLIENT_ERROR'
  | 'SECURITY_EVENT'
  | 'CREDENTIAL_PROFILE'
  | 'CREDENTIAL_TYPE'
  | 'CREDENTIAL'
  | 'CREDENTIAL_SHARE'
  | 'CREDENTIAL_VERIFICATION'
  | 'ISSUANCE_REQUEST'
  | 'API_ACCESS'
  | 'HYBRID_CREDENTIAL'
  | 'CREDENTIAL_INTEGRITY'
  | 'CREDENTIAL_MIGRATION'
  | 'DATA_RETENTION'
  | 'SECURITY_ALERT';

export interface AuditEvent {
  type: AuditEventType;
  user_address?: string;
  client_id: string;
  action: string;
  status: 'success' | 'failure';
  details?: unknown;
  ip_address: string;
  user_agent?: string;
  created_at?: number;
}
