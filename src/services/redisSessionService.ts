import { createClient, RedisClientType } from 'redis';
import { createLogger } from '../utils/logger';
const logger = createLogger('redis-session');
export interface RedisSessionConfig {
  url: string;
  password?: string;
  db?: number;
  keyPrefix: string;
  ttl: number;
  retryAttempts: number;
  retryDelay: number;
  enableCompression: boolean;
}
export const defaultRedisSessionConfig: RedisSessionConfig = {
  url: process.env['REDIS_URL'] || 'redis://localhost:6379',
  keyPrefix: 'sso:session:',
  ttl: 24 * 60 * 60,
  retryAttempts: 3,
  retryDelay: 1000,
  enableCompression: true,
};
export interface SessionData {
  id: string;
  data: Record<string, unknown>;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number;
  metadata?: {
    userAgent?: string;
    ip?: string;
    deviceId?: string;
  };
}
export class RedisSessionService {
  private client: RedisClientType;
  private config: RedisSessionConfig;
  private isConnected = false;
  private reconnectTimer?: NodeJS.Timeout;
  constructor(config: RedisSessionConfig = defaultRedisSessionConfig) {
    this.config = config;
    this.client = createClient({
      url: config.url,
      ...(config.password && { password: config.password }),
      ...(config.db && { database: config.db }),
      socket: {
        reconnectStrategy: retries => {
          if (retries > config.retryAttempts) {
            logger.error('Max Redis reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          const delay = Math.min(config.retryDelay * Math.pow(2, retries), 30000);
          logger.info(`Redis reconnection attempt ${retries + 1} in ${delay}ms`);
          return delay;
        },
      },
    });
    this.setupEventHandlers();
  }
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection', { error });
    }
  }
  async setSession(sessionId: string, data: Record<string, unknown>, ttl?: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    try {
      const sessionData: SessionData = {
        id: sessionId,
        data,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + (ttl || this.config.ttl) * 1000,
        metadata: {
          userAgent: data['userAgent'] as string,
          ip: data['ip'] as string,
          deviceId: data['deviceId'] as string,
        },
      };
      const key = this.config.keyPrefix + sessionId;
      const serializedData = JSON.stringify(sessionData);
      await this.client.setEx(key, ttl || this.config.ttl, serializedData);
      logger.debug('Session stored successfully', { sessionId, ttl });
    } catch (error) {
      logger.error('Failed to store session', { sessionId, error });
      throw error;
    }
  }
  async getSession(sessionId: string): Promise<SessionData | null> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    try {
      const key = this.config.keyPrefix + sessionId;
      const data = await this.client.get(key);
      if (!data) {
        return null;
      }
      const sessionData: SessionData = JSON.parse(data);
      sessionData.lastAccessed = Date.now();
      await this.updateSessionAccess(sessionId, sessionData);
      return sessionData;
    } catch (error) {
      logger.error('Failed to retrieve session', { sessionId, error });
      return null;
    }
  }
  private async updateSessionAccess(sessionId: string, sessionData: SessionData): Promise<void> {
    try {
      const key = this.config.keyPrefix + sessionId;
      const serializedData = JSON.stringify(sessionData);
      const ttl = await this.client.ttl(key);
      if (ttl > 0) {
        await this.client.setEx(key, ttl, serializedData);
      }
    } catch (error) {
      logger.warn('Failed to update session access time', { sessionId, error });
    }
  }
  async deleteSession(sessionId: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    try {
      const key = this.config.keyPrefix + sessionId;
      await this.client.del(key);
      logger.debug('Session deleted successfully', { sessionId });
    } catch (error) {
      logger.error('Failed to delete session', { sessionId, error });
      throw error;
    }
  }
  async hasSession(sessionId: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }
    try {
      const key = this.config.keyPrefix + sessionId;
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Failed to check session existence', { sessionId, error });
      return false;
    }
  }
  async extendSession(sessionId: string, ttl: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    try {
      const key = this.config.keyPrefix + sessionId;
      await this.client.expire(key, ttl);
      logger.debug('Session TTL extended', { sessionId, ttl });
    } catch (error) {
      logger.error('Failed to extend session TTL', { sessionId, ttl, error });
      throw error;
    }
  }
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    memoryUsage: number;
  }> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.client.keys(pattern);
      let activeSessions = 0;
      let expiredSessions = 0;
      for (const key of keys) {
        const ttl = await this.client.ttl(key);
        if (ttl > 0) {
          activeSessions++;
        } else {
          expiredSessions++;
        }
      }
      const info = await this.client.info('memory');
      const memoryUsage = this.parseMemoryInfo(info);
      return {
        totalSessions: keys.length,
        activeSessions,
        expiredSessions,
        memoryUsage,
      };
    } catch (error) {
      logger.error('Failed to get session statistics', { error });
      throw error;
    }
  }
  async cleanupExpiredSessions(): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.client.keys(pattern);
      let cleanedCount = 0;
      for (const key of keys) {
        const ttl = await this.client.ttl(key);
        if (ttl <= 0) {
          await this.client.del(key);
          cleanedCount++;
        }
      }
      logger.info('Expired sessions cleanup completed', { cleanedCount });
      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', { error });
      return 0;
    }
  }
  private parseMemoryInfo(info: string): number {
    const usedMemoryMatch = info.match(/used_memory_human:(\S+)/);
    if (usedMemoryMatch) {
      const value = parseFloat(usedMemoryMatch[1] || '0');
      const unit = (usedMemoryMatch[1] || '').replace(/[\d.]/g, '');
      switch (unit) {
        case 'K':
          return value * 1024;
        case 'M':
          return value * 1024 * 1024;
        case 'G':
          return value * 1024 * 1024 * 1024;
        default:
          return value;
      }
    }
    return 0;
  }
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });
    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });
    this.client.on('error', error => {
      logger.error('Redis client error', { error });
      this.isConnected = false;
    });
    this.client.on('end', () => {
      logger.warn('Redis client connection ended');
      this.isConnected = false;
      this.scheduleReconnect();
    });
    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });
  }
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('Reconnection failed, will retry', { error });
        this.scheduleReconnect();
      }
    }, this.config.retryDelay);
  }
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  }
}
export const redisSessionService = new RedisSessionService();
