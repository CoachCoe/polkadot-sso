import { NextFunction, Request, Response } from 'express';
import { AuditService } from '../services/auditService';
import { createLogger } from '../utils/logger';

const logger = createLogger('WalletSecurityMiddleware');

export interface WalletSecurityConfig {
  maxTransactionSize: number;
  maxCredentialSize: number;
  rateLimitWindow: number;
  maxRequestsPerWindow: number;
  allowedWalletProviders: string[];
  requireSignatureValidation: boolean;
  maxConcurrentConnections: number;
}

const DEFAULT_CONFIG: WalletSecurityConfig = {
  maxTransactionSize: 1024 * 1024, // 1MB
  maxCredentialSize: 100 * 1024, // 100KB
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  maxRequestsPerWindow: 50,
  allowedWalletProviders: ['polkadot-js', 'talisman', 'subwallet'],
  requireSignatureValidation: true,
  maxConcurrentConnections: 5,
};

// Track wallet connections and rate limiting
const walletConnections = new Map<
  string,
  {
    connections: number;
    lastRequest: number;
    requestCount: number;
    blocked: boolean;
    blockExpiry: number;
  }
>();

/**
 * Wallet Security Middleware
 *
 * Provides comprehensive security for wallet integration operations
 */
export class WalletSecurityMiddleware {
  private config: WalletSecurityConfig;
  private auditService: AuditService;

  constructor(auditService: AuditService, config: Partial<WalletSecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.auditService = auditService;
  }

  /**
   * Validate Kusama address format
   */
  static validateKusamaAddress(address: string): boolean {
    // Kusama addresses start with 5 and are 47 characters long
    const kusamaAddressRegex = /^5[a-km-zA-HJ-NP-Z1-9]{46}$/;
    return kusamaAddressRegex.test(address);
  }

  /**
   * Validate wallet provider
   */
  static validateWalletProvider(provider: string, allowedProviders: string[]): boolean {
    return allowedProviders.includes(provider);
  }

  /**
   * Validate transaction data
   */
  static validateTransactionData(data: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
    size: number;
  } {
    const errors: string[] = [];
    const dataString = JSON.stringify(data);
    const size = Buffer.byteLength(dataString, 'utf8');

    // Check size limits
    if (size > DEFAULT_CONFIG.maxCredentialSize) {
      errors.push(
        `Transaction data too large: ${size} bytes (max: ${DEFAULT_CONFIG.maxCredentialSize})`
      );
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /document\./i,
      /window\./i,
      /localStorage/i,
      /sessionStorage/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(dataString)) {
        errors.push(`Suspicious pattern detected: ${pattern.source}`);
      }
    }

    // Check for required fields
    if (!data.type || typeof data.type !== 'string') {
      errors.push('Missing or invalid credential type');
    }

    return {
      valid: errors.length === 0,
      errors,
      size,
    };
  }

  /**
   * Rate limiting for wallet operations
   */
  createWalletRateLimiter() {
    return (req: Request, res: Response, next: NextFunction) => {
      const userAddress = req.body.userAddress || req.query.userAddress;
      const ip = req.ip || 'unknown';

      if (!userAddress) {
        return res.status(400).json({
          error: 'User address required for rate limiting',
          code: 'MISSING_USER_ADDRESS',
        });
      }

      const key = `${ip}:${String(userAddress as string)}`;
      const now = Date.now();
      const userData = walletConnections.get(key) || {
        connections: 0,
        lastRequest: 0,
        requestCount: 0,
        blocked: false,
        blockExpiry: 0,
      };

      // Check if user is blocked
      if (userData.blocked && now < userData.blockExpiry) {
        void this.auditService.log({
          type: 'SECURITY_EVENT',
          client_id: 'wallet-security',
          action: 'RATE_LIMIT_BLOCKED',
          status: 'failure',
          details: {
            path: req.path,
            method: req.method,
            userAddress,
            ip,
            blockExpiry: userData.blockExpiry,
          },
          ip_address: ip,
          user_agent: req.get('user-agent') || 'unknown',
        });

        return res.status(429).json({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((userData.blockExpiry - now) / 1000),
        });
      }

      // Reset block if expired
      if (userData.blocked && now >= userData.blockExpiry) {
        userData.blocked = false;
        userData.requestCount = 0;
      }

      // Check rate limit window
      if (now - userData.lastRequest > this.config.rateLimitWindow) {
        userData.requestCount = 0;
      }

      userData.requestCount++;
      userData.lastRequest = now;

      // Block if rate limit exceeded
      if (userData.requestCount > this.config.maxRequestsPerWindow) {
        userData.blocked = true;
        userData.blockExpiry = now + this.config.rateLimitWindow;

        void this.auditService.log({
          type: 'SECURITY_EVENT',
          client_id: 'wallet-security',
          action: 'RATE_LIMIT_EXCEEDED',
          status: 'failure',
          details: {
            path: req.path,
            method: req.method,
            userAddress,
            ip,
            requestCount: userData.requestCount,
            maxRequests: this.config.maxRequestsPerWindow,
          },
          ip_address: ip,
          user_agent: req.get('user-agent') || 'unknown',
        });

        return res.status(429).json({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(this.config.rateLimitWindow / 1000),
        });
      }

      walletConnections.set(key, userData);
      next();
    };
  }

  /**
   * Validate wallet connection requests
   */
  validateWalletConnection() {
    return (req: Request, res: Response, next: NextFunction) => {
      const { provider, userAddress } = req.body;

      // Validate provider
      if (
        !provider ||
        !WalletSecurityMiddleware.validateWalletProvider(
          provider as string,
          this.config.allowedWalletProviders
        )
      ) {
        void this.auditService.log({
          type: 'SECURITY_EVENT',
          client_id: 'wallet-security',
          action: 'INVALID_WALLET_PROVIDER',
          status: 'failure',
          details: {
            path: req.path,
            method: req.method,
            provider,
            allowedProviders: this.config.allowedWalletProviders,
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });

        return res.status(400).json({
          error: 'Invalid wallet provider',
          code: 'INVALID_WALLET_PROVIDER',
          allowedProviders: this.config.allowedWalletProviders,
        });
      }

      // Validate user address
      if (
        !userAddress ||
        !WalletSecurityMiddleware.validateKusamaAddress(String(userAddress as string))
      ) {
        void this.auditService.log({
          type: 'SECURITY_EVENT',
          client_id: 'wallet-security',
          action: 'INVALID_KUSAMA_ADDRESS',
          status: 'failure',
          details: {
            path: req.path,
            method: req.method,
            userAddress,
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });

        return res.status(400).json({
          error: 'Invalid Kusama address format',
          code: 'INVALID_KUSAMA_ADDRESS',
        });
      }

      next();
    };
  }

  /**
   * Validate transaction requests
   */
  validateTransactionRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      const { userAddress, credentialData, credentialType } = req.body;

      // Validate user address
      if (
        !userAddress ||
        !WalletSecurityMiddleware.validateKusamaAddress(String(userAddress as string))
      ) {
        return res.status(400).json({
          error: 'Invalid Kusama address format',
          code: 'INVALID_KUSAMA_ADDRESS',
        });
      }

      // Validate credential data
      if (!credentialData || typeof credentialData !== 'object') {
        return res.status(400).json({
          error: 'Invalid credential data',
          code: 'INVALID_CREDENTIAL_DATA',
        });
      }

      const validation = WalletSecurityMiddleware.validateTransactionData(
        credentialData as Record<string, unknown>
      );
      if (!validation.valid) {
        void this.auditService.log({
          type: 'SECURITY_EVENT',
          client_id: 'wallet-security',
          action: 'INVALID_TRANSACTION_DATA',
          status: 'failure',
          details: {
            path: req.path,
            method: req.method,
            userAddress,
            errors: validation.errors,
            size: validation.size,
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });

        return res.status(400).json({
          error: 'Invalid transaction data',
          code: 'INVALID_TRANSACTION_DATA',
          details: validation.errors,
        });
      }

      // Validate credential type
      if (!credentialType || typeof credentialType !== 'string' || credentialType.length > 100) {
        return res.status(400).json({
          error: 'Invalid credential type',
          code: 'INVALID_CREDENTIAL_TYPE',
        });
      }

      next();
    };
  }

  /**
   * Validate signature if required
   */
  validateSignature() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.requireSignatureValidation) {
        return next();
      }

      const { userSignature, userMessage } = req.body;

      if (!userSignature || typeof userSignature !== 'string') {
        return res.status(400).json({
          error: 'User signature required',
          code: 'MISSING_SIGNATURE',
        });
      }

      // Validate signature format (should start with 0x and be hex)
      if (!userSignature.startsWith('0x') || !/^0x[0-9a-fA-F]+$/.test(userSignature)) {
        void this.auditService.log({
          type: 'SECURITY_EVENT',
          client_id: 'wallet-security',
          action: 'INVALID_SIGNATURE_FORMAT',
          status: 'failure',
          details: {
            path: req.path,
            method: req.method,
            signatureLength: userSignature.length,
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });

        return res.status(400).json({
          error: 'Invalid signature format',
          code: 'INVALID_SIGNATURE_FORMAT',
        });
      }

      // Validate message if provided
      if (userMessage && typeof userMessage !== 'string') {
        return res.status(400).json({
          error: 'Invalid message format',
          code: 'INVALID_MESSAGE_FORMAT',
        });
      }

      next();
    };
  }

  /**
   * Sanitize wallet-related request data
   */
  sanitizeWalletData() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Sanitize user address
      if (req.body.userAddress) {
        req.body.userAddress = String(req.body.userAddress).trim();
      }

      // Sanitize credential type
      if (req.body.credentialType) {
        req.body.credentialType = String(req.body.credentialType).trim();
      }

      // Sanitize provider
      if (req.body.provider) {
        req.body.provider = String(req.body.provider).trim().toLowerCase();
      }

      // Sanitize signature
      if (req.body.userSignature) {
        req.body.userSignature = String(req.body.userSignature).trim();
      }

      // Sanitize message
      if (req.body.userMessage) {
        req.body.userMessage = String(req.body.userMessage).trim();
      }

      next();
    };
  }

  /**
   * Log wallet security events
   */
  logWalletEvent(action: string, details: Record<string, unknown>) {
    void this.auditService.log({
      type: 'SECURITY_EVENT',
      client_id: 'wallet-security',
      action,
      status: 'success',
      details,
      ip_address: 'unknown', // Will be set by caller
      user_agent: 'unknown', // Will be set by caller
    });
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    const stats = {
      totalConnections: 0,
      blockedUsers: 0,
      activeConnections: 0,
    };

    for (const [, data] of walletConnections) {
      stats.totalConnections += data.connections;
      if (data.blocked) {
        stats.blockedUsers++;
      }
      if (data.connections > 0) {
        stats.activeConnections++;
      }
    }

    return stats;
  }
}
