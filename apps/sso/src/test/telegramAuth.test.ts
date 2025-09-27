import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TelegramAuthService } from '../services/telegramAuthService.js';
import type { TelegramAuthData } from '../types/telegram.js';

// Mock environment variables for testing
const originalEnv = process.env;

describe('TelegramAuthService', () => {
  let telegramAuthService: TelegramAuthService;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    
    // Set up test environment
    process.env.TELEGRAM_BOT_TOKEN = '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz';
    process.env.TELEGRAM_BOT_USERNAME = 'test_bot';
    process.env.TELEGRAM_AUTH_TIMEOUT = '300';
    process.env.TELEGRAM_ALLOWED_DOMAINS = 'localhost,test.com';
    
    telegramAuthService = new TelegramAuthService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isEnabled', () => {
    it('should return true when bot configuration is available', () => {
      expect(telegramAuthService.isEnabled()).toBe(true);
    });

    it('should return false when bot token is missing', () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      const service = new TelegramAuthService();
      expect(service.isEnabled()).toBe(false);
    });

    it('should return false when bot username is missing', () => {
      delete process.env.TELEGRAM_BOT_USERNAME;
      const service = new TelegramAuthService();
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('getBotConfig', () => {
    it('should return bot configuration when enabled', () => {
      const config = telegramAuthService.getBotConfig();
      expect(config).not.toBeNull();
      expect(config?.botToken).toBe('1234567890:ABCdefGHIjklMNOpqrsTUVwxyz');
      expect(config?.botUsername).toBe('test_bot');
      expect(config?.authTimeout).toBe(300);
      expect(config?.allowedDomains).toEqual(['localhost', 'test.com']);
    });

    it('should return null when disabled', () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      const service = new TelegramAuthService();
      expect(service.getBotConfig()).toBeNull();
    });
  });

  describe('verifyTelegramAuth', () => {
    it('should throw error when not configured', () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      const service = new TelegramAuthService();
      
      const authData: TelegramAuthData = {
        id: 123456789,
        first_name: 'Test',
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'test_hash',
      };

      expect(() => service.verifyTelegramAuth(authData)).toThrow('Telegram authentication is not configured');
    });

    it('should return false for invalid auth data', () => {
      const authData: TelegramAuthData = {
        id: 123456789,
        first_name: 'Test',
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'invalid_hash',
      };

      // This will return false because the hash is invalid
      expect(telegramAuthService.verifyTelegramAuth(authData)).toBe(false);
    });
  });

  describe('createDataCheckString', () => {
    it('should create correct data check string for basic auth data', () => {
      const authData: TelegramAuthData = {
        id: 123456789,
        first_name: 'John',
        auth_date: 1234567890,
        hash: 'test_hash',
      };

      // Access private method through any for testing
      const service = telegramAuthService as any;
      const dataCheckString = service.createDataCheckString(authData);
      
      expect(dataCheckString).toBe('auth_date=1234567890\nfirst_name=John\nid=123456789');
    });

    it('should include optional fields in data check string', () => {
      const authData: TelegramAuthData = {
        id: 123456789,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        photo_url: 'https://example.com/photo.jpg',
        auth_date: 1234567890,
        hash: 'test_hash',
      };

      const service = telegramAuthService as any;
      const dataCheckString = service.createDataCheckString(authData);
      
      expect(dataCheckString).toBe('auth_date=1234567890\nfirst_name=John\nid=123456789\nlast_name=Doe\nphoto_url=https://example.com/photo.jpg\nusername=johndoe');
    });
  });
});

describe('Telegram Authentication Integration', () => {
  it('should have proper environment variable validation', () => {
    // Test that the service properly validates environment variables
    expect(() => {
      process.env.TELEGRAM_BOT_TOKEN = 'short';
      new TelegramAuthService();
    }).not.toThrow(); // Should not throw, just disable the service
  });

  it('should handle missing environment variables gracefully', () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_USERNAME;
    
    const service = new TelegramAuthService();
    expect(service.isEnabled()).toBe(false);
    expect(service.getBotConfig()).toBeNull();
  });
});
