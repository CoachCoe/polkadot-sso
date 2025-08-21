import * as crypto from 'crypto';
import { Database } from 'sqlite3';
import { createLogger } from './logger';
const logger = createLogger('query-protection');
export interface QueryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number;
}
export interface QueryOptions {
  timeout?: number;
  maxRetries?: number;
  validateParams?: boolean;
  logQuery?: boolean;
}
export class QueryProtection {
  private static instance: QueryProtection;
  private db: Database;
  private queryStats = new Map<string, { count: number; avgTime: number }>();
  private constructor(database: Database) {
    this.db = database;
  }
  static getInstance(database: Database): QueryProtection {
    if (!QueryProtection.instance) {
      QueryProtection.instance = new QueryProtection(database);
    }
    return QueryProtection.instance;
  }
  private validateQuery(query: string): { valid: boolean; risk: string; threats: string[] } {
    const threats: string[] = [];
    let risk = 'low';
    const injectionPatterns = [
      { pattern: /(\bUNION\b.*\bSELECT\b)/i, threat: 'UNION-based injection', risk: 'high' },
      { pattern: /(\bOR\b\s+\d+\s*=\s*\d+)/i, threat: 'Boolean-based injection', risk: 'high' },
      { pattern: /(\bAND\b\s+\d+\s*=\s*\d+)/i, threat: 'Boolean-based injection', risk: 'medium' },
      {
        pattern: /(\bSLEEP\s*\(|\bWAITFOR\s+DELAY\b)/i,
        threat: 'Time-based injection',
        risk: 'high',
      },
      { pattern: /(;\s*\w+)/i, threat: 'Stacked queries', risk: 'high' },
      { pattern: /(\bINFORMATION_SCHEMA\b)/i, threat: 'Schema enumeration', risk: 'medium' },
      {
        pattern: /(\bDROP\b|\bALTER\b|\bCREATE\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b)/i,
        threat: 'DDL/DML injection',
        risk: 'high',
      },
      { pattern: /(\/\*.*\*\/|--.*$)/m, threat: 'Comment-based bypass', risk: 'medium' },
      { pattern: /(0x[0-9a-f]+|%[0-9a-f]{2})/i, threat: 'Encoding-based bypass', risk: 'medium' },
      {
        pattern: /(\bLOAD_FILE\b|\bINTO\s+OUTFILE\b)/i,
        threat: 'File system access',
        risk: 'high',
      },
    ];
    for (const { pattern, threat, risk: patternRisk } of injectionPatterns) {
      if (pattern.test(query)) {
        threats.push(threat);
        if (patternRisk === 'high') {
          risk = 'high';
        } else if (patternRisk === 'medium' && risk === 'low') {
          risk = 'medium';
        }
      }
    }
    return {
      valid: threats.length === 0,
      risk,
      threats,
    };
  }
  private sanitizeParams(params: any[]): any[] {
    return params.map(param => {
      if (typeof param === 'string') {
        return param.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
      }
      return param;
    });
  }
  private generateQueryFingerprint(query: string): string {
    const normalized = query
      .replace(/\s+/g, ' ')
      .replace(/\b\d+\b/g, '?')
      .replace(/'[^']*'/g, '?')
      .replace(/"[^"]*"/g, '?')
      .trim()
      .toLowerCase();
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }
  async safeQuery<T = any>(
    query: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const queryFingerprint = this.generateQueryFingerprint(query);
    try {
      const validation = this.validateQuery(query);
      if (!validation.valid) {
        logger.warn('Potentially malicious query blocked', {
          fingerprint: queryFingerprint,
          risk: validation.risk,
          threats: validation.threats,
          query: query.substring(0, 200), 
        });
        return {
          success: false,
          error: 'Query validation failed - potential security risk detected',
        };
      }
      const sanitizedParams =
        options.validateParams !== false ? this.sanitizeParams(params) : params;
      const timeout = options.timeout || 30000; 
      const result = await this.executeWithTimeout<T>(query, sanitizedParams, timeout);
      const executionTime = Date.now() - startTime;
      this.updateQueryStats(queryFingerprint, executionTime);
      if (options.logQuery) {
        logger.info('Query executed successfully', {
          fingerprint: queryFingerprint,
          executionTime,
          paramCount: sanitizedParams.length,
        });
      }
      return {
        success: true,
        data: result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Query execution failed', {
        fingerprint: queryFingerprint,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        paramCount: params.length,
      });
      return {
        success: false,
        error: 'Database query failed',
        executionTime,
      };
    }
  }
  private executeWithTimeout<T>(query: string, params: any[], timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Query timeout'));
      }, timeout);
      this.db.all(query, params, (err, rows) => {
        clearTimeout(timeoutId);
        if (err) {
          reject(err);
        } else {
          resolve(rows as T);
        }
      });
    });
  }
  private updateQueryStats(fingerprint: string, executionTime: number): void {
    const existing = this.queryStats.get(fingerprint);
    if (existing) {
      existing.count++;
      existing.avgTime = (existing.avgTime * (existing.count - 1) + executionTime) / existing.count;
    } else {
      this.queryStats.set(fingerprint, {
        count: 1,
        avgTime: executionTime,
      });
    }
  }
  getQueryStats(): Map<string, { count: number; avgTime: number }> {
    return new Map(this.queryStats);
  }
  async safeSelect<T = any>(
    table: string,
    columns: string[] = ['*'],
    where: Record<string, any> = {},
    options: QueryOptions & { limit?: number; offset?: number } = {}
  ): Promise<QueryResult<T>> {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return {
        success: false,
        error: 'Invalid table name',
      };
    }
    for (const column of columns) {
      if (column !== '*' && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
        return {
          success: false,
          error: `Invalid column name: ${column}`,
        };
      }
    }
    const whereClause =
      Object.keys(where).length > 0
        ? `WHERE ${Object.keys(where)
            .map(key => `${key} = ?`)
            .join(' AND ')}`
        : '';
    const limitClause = options.limit ? `LIMIT ${options.limit}` : '';
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : '';
    const query = `
      SELECT ${columns.join(', ')}
      FROM ${table}
      ${whereClause}
      ${limitClause}
      ${offsetClause}
    `
      .trim()
      .replace(/\s+/g, ' ');
    const params = Object.values(where);
    return this.safeQuery<T>(query, params, options);
  }
  async safeInsert(
    table: string,
    data: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<QueryResult<{ lastID: number; changes: number }>> {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return {
        success: false,
        error: 'Invalid table name',
      };
    }
    for (const column of Object.keys(data)) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
        return {
          success: false,
          error: `Invalid column name: ${column}`,
        };
      }
    }
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const params = Object.values(data);
    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
    `;
    return this.safeQuery(query, params, options);
  }
  async safeUpdate(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<QueryResult<{ changes: number }>> {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return {
        success: false,
        error: 'Invalid table name',
      };
    }
    const allColumns = [...Object.keys(data), ...Object.keys(where)];
    for (const column of allColumns) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
        return {
          success: false,
          error: `Invalid column name: ${column}`,
        };
      }
    }
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const whereClause = Object.keys(where)
      .map(key => `${key} = ?`)
      .join(' AND ');
    const params = [...Object.values(data), ...Object.values(where)];
    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${whereClause}
    `;
    return this.safeQuery(query, params, options);
  }
}
export const createQueryProtectionMiddleware = (database: Database) => {
  const queryProtection = QueryProtection.getInstance(database);
  return (req: any, res: any, next: any) => {
    req.safeQuery = queryProtection.safeQuery.bind(queryProtection);
    req.safeSelect = queryProtection.safeSelect.bind(queryProtection);
    req.safeInsert = queryProtection.safeInsert.bind(queryProtection);
    req.safeUpdate = queryProtection.safeUpdate.bind(queryProtection);
    next();
  };
};