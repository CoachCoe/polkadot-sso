import { Database } from 'sqlite';
import { SecurityConfig } from '../config/security';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class TokenService {
  constructor(private db: Database) {}

  async generateTokenPair(address: string, clientId: string) {
    const jti = crypto.randomUUID();
    const accessToken = jwt.sign(
      {
        sub: address,
        client_id: clientId,
        jti,
        type: 'access'
      },
      SecurityConfig.jwt.secret,
      { expiresIn: SecurityConfig.jwt.accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      {
        sub: address,
        client_id: clientId,
        jti,
        type: 'refresh'
      },
      SecurityConfig.jwt.secret,
      { expiresIn: SecurityConfig.jwt.refreshTokenExpiry }
    );

    // Store token metadata for revocation
    await this.db.run(
      `INSERT INTO token_metadata (
        jti, user_address, client_id, 
        created_at, expires_at, is_revoked
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        jti,
        address,
        clientId,
        Date.now(),
        Date.now() + SecurityConfig.jwt.refreshTokenExpiry * 1000,
        0
      ]
    );

    return { accessToken, refreshToken };
  }

  async revokeToken(jti: string) {
    await this.db.run(
      'UPDATE token_metadata SET is_revoked = 1 WHERE jti = ?',
      [jti]
    );
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    const result = await this.db.get(
      'SELECT is_revoked FROM token_metadata WHERE jti = ?',
      [jti]
    );
    return result?.is_revoked === 1;
  }
} 