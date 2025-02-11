import { config } from 'dotenv';
import crypto from 'crypto';

// Load and validate environment variables
config();

const requiredEnvVars = [
  'SESSION_SECRET',
  'DATABASE_ENCRYPTION_KEY',
  'JWT_SECRET',
  'ALLOWED_ORIGINS'
] as const;

// Validate all required environment variables exist
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const SecurityConfig = {
  session: {
    secret: process.env.SESSION_SECRET!,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict' as const,
      maxAge: 15 * 60 * 1000 // 15 minutes
    }
  },
  database: {
    encryptionKey: process.env.DATABASE_ENCRYPTION_KEY!,
    encryptField: (text: string): string => {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(process.env.DATABASE_ENCRYPTION_KEY!, 'base64'),
        iv
      );
      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
      ]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([iv, tag, encrypted]).toString('base64');
    },
    decryptField: (encryptedText: string): string => {
      const buf = Buffer.from(encryptedText, 'base64');
      const iv = buf.subarray(0, 16);
      const tag = buf.subarray(16, 32);
      const encrypted = buf.subarray(32);
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(process.env.DATABASE_ENCRYPTION_KEY!, 'base64'),
        iv
      );
      decipher.setAuthTag(tag);
      return decipher.update(encrypted) + decipher.final('utf8');
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    accessTokenExpiry: 15 * 60, // 15 minutes
    refreshTokenExpiry: 7 * 24 * 60 * 60 // 7 days
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS!.split(','),
    methods: ['GET', 'POST'],
    credentials: true
  }
}; 