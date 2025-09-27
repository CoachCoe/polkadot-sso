import { createLogger } from '../utils/logger.js';
import { Database } from 'sqlite';
import { PapiService } from './papiService.js';

const logger = createLogger('monitoring-service');

export interface SystemMetrics {
  timestamp: number;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connected: boolean;
    poolSize: number;
    activeConnections: number;
  };
  papi: {
    available: boolean;
    chains: string[];
    lastHealthCheck: number;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: {
    database: boolean;
    papi: boolean;
    memory: boolean;
    disk: boolean;
  };
  metrics: SystemMetrics;
  errors: string[];
}

export class MonitoringService {
  private startTime: number;
  private requestCounts: Map<string, number> = new Map();
  private responseTimes: number[] = [];
  private papiService: PapiService | null = null;
  private database: Database | null = null;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Initialize monitoring service
   */
  initialize(papiService?: PapiService, database?: Database): void {
    this.papiService = papiService || null;
    this.database = database || null;
    
    logger.info('Monitoring service initialized', {
      hasPapiService: !!this.papiService,
      hasDatabase: !!this.database,
    });
  }

  /**
   * Record a request
   */
  recordRequest(endpoint: string, success: boolean, responseTime: number): void {
    // Update request counts
    const key = `${endpoint}:${success ? 'success' : 'failure'}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    // Update response times (keep last 1000)
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usedMemory = memoryUsage.heapUsed + memoryUsage.external;

    const metrics: SystemMetrics = {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
      database: {
        connected: false,
        poolSize: 0,
        activeConnections: 0,
      },
      papi: {
        available: false,
        chains: [],
        lastHealthCheck: 0,
      },
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
      },
    };

    // Database metrics
    if (this.database) {
      try {
        // Simple query to check connection
        await this.database.get('SELECT 1');
        metrics.database.connected = true;
        // Note: SQLite doesn't have connection pooling like PostgreSQL
        metrics.database.poolSize = 1;
        metrics.database.activeConnections = 1;
      } catch (error) {
        logger.warn('Database health check failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // PAPI metrics
    if (this.papiService) {
      try {
        metrics.papi.available = true;
        metrics.papi.chains = this.papiService.getAvailableChains();
        metrics.papi.lastHealthCheck = Date.now();
      } catch (error) {
        logger.warn('PAPI health check failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Request metrics
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    for (const [key, count] of this.requestCounts.entries()) {
      totalRequests += count;
      if (key.endsWith(':success')) {
        successfulRequests += count;
      } else {
        failedRequests += count;
      }
    }

    metrics.requests.total = totalRequests;
    metrics.requests.successful = successfulRequests;
    metrics.requests.failed = failedRequests;
    metrics.requests.averageResponseTime = this.responseTimes.length > 0 
      ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
      : 0;

    return metrics;
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const errors: string[] = [];
    const checks = {
      database: false,
      papi: false,
      memory: false,
      disk: false,
    };

    // Database health check
    if (this.database) {
      try {
        await this.database.get('SELECT 1');
        checks.database = true;
      } catch (error) {
        errors.push(`Database: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      errors.push('Database: Not configured');
    }

    // PAPI health check
    if (this.papiService) {
      try {
        const chains = this.papiService.getAvailableChains();
        checks.papi = chains.length > 0;
        if (chains.length === 0) {
          errors.push('PAPI: No chains available');
        }
      } catch (error) {
        errors.push(`PAPI: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      errors.push('PAPI: Not configured');
    }

    // Memory health check
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usedMemory = memoryUsage.heapUsed + memoryUsage.external;
    const memoryPercentage = (usedMemory / totalMemory) * 100;
    
    checks.memory = memoryPercentage < 90; // Consider unhealthy if >90% memory used
    if (memoryPercentage >= 90) {
      errors.push(`Memory: High usage (${Math.round(memoryPercentage)}%)`);
    }

    // Disk health check (simplified)
    try {
      const fs = require('fs');
      const stats = fs.statSync('./data/sso.db');
      checks.disk = true;
    } catch (error) {
      errors.push(`Disk: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Determine overall status
    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const metrics = await this.getSystemMetrics();

    logger.info('Health check completed', {
      status,
      healthyChecks,
      totalChecks,
      errors: errors.length,
    });

    return {
      status,
      timestamp: Date.now(),
      checks,
      metrics,
      errors,
    };
  }

  /**
   * Get request statistics
   */
  getRequestStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [key, count] of this.requestCounts.entries()) {
      const [endpoint, type] = key.split(':');
      if (!stats[endpoint]) {
        stats[endpoint] = { success: 0, failure: 0 };
      }
      stats[endpoint][type] = count;
    }

    return stats;
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.requestCounts.clear();
    this.responseTimes.length = 0;
    this.startTime = Date.now();
    
    logger.info('Monitoring metrics reset');
  }
}

// Singleton instance
export const monitoringService = new MonitoringService();
