"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQueryProtectionMiddleware = exports.QueryProtection = void 0;
const crypto = __importStar(require("crypto"));
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('query-protection');
class QueryProtection {
    constructor(database) {
        this.queryStats = new Map();
        this.db = database;
    }
    static getInstance(database) {
        if (!QueryProtection.instance) {
            QueryProtection.instance = new QueryProtection(database);
        }
        return QueryProtection.instance;
    }
    validateQuery(query) {
        const threats = [];
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
                }
                else if (patternRisk === 'medium' && risk === 'low') {
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
    sanitizeParams(params) {
        return params.map(param => {
            if (typeof param === 'string') {
                return param.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
            }
            return param;
        });
    }
    generateQueryFingerprint(query) {
        const normalized = query
            .replace(/\s+/g, ' ')
            .replace(/\b\d+\b/g, '?')
            .replace(/'[^']*'/g, '?')
            .replace(/"[^"]*"/g, '?')
            .trim()
            .toLowerCase();
        return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
    }
    async safeQuery(query, params = [], options = {}) {
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
            const sanitizedParams = options.validateParams !== false ? this.sanitizeParams(params) : params;
            const timeout = options.timeout || 30000;
            const result = await this.executeWithTimeout(query, sanitizedParams, timeout);
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
        }
        catch (error) {
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
    executeWithTimeout(query, params, timeout) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Query timeout'));
            }, timeout);
            this.db.all(query, params, (err, rows) => {
                clearTimeout(timeoutId);
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    updateQueryStats(fingerprint, executionTime) {
        const existing = this.queryStats.get(fingerprint);
        if (existing) {
            existing.count++;
            existing.avgTime = (existing.avgTime * (existing.count - 1) + executionTime) / existing.count;
        }
        else {
            this.queryStats.set(fingerprint, {
                count: 1,
                avgTime: executionTime,
            });
        }
    }
    getQueryStats() {
        return new Map(this.queryStats);
    }
    async safeSelect(table, columns = ['*'], where = {}, options = {}) {
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
        const whereClause = Object.keys(where).length > 0
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
        return this.safeQuery(query, params, options);
    }
    async safeInsert(table, data, options = {}) {
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
    async safeUpdate(table, data, where, options = {}) {
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
exports.QueryProtection = QueryProtection;
const createQueryProtectionMiddleware = (database) => {
    const queryProtection = QueryProtection.getInstance(database);
    return (req, res, next) => {
        req.safeQuery = queryProtection.safeQuery.bind(queryProtection);
        req.safeSelect = queryProtection.safeSelect.bind(queryProtection);
        req.safeInsert = queryProtection.safeInsert.bind(queryProtection);
        req.safeUpdate = queryProtection.safeUpdate.bind(queryProtection);
        next();
    };
};
exports.createQueryProtectionMiddleware = createQueryProtectionMiddleware;
//# sourceMappingURL=queryProtection.js.map