export type AuditEventType = 
  | 'AUTH_ATTEMPT'
  | 'TOKEN_EXCHANGE'
  | 'CHALLENGE_CREATED'
  | 'CHALLENGE_VERIFIED'
  | 'TOKEN_REFRESH'
  | 'CLIENT_ERROR';

export interface AuditEvent {
  type: AuditEventType;
  user_address?: string;
  client_id: string;
  action: string;
  status: 'success' | 'failure';
  details?: any;
  ip_address: string;
  user_agent?: string;
  created_at?: number;
} 