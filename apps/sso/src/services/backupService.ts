import { createLogger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Database } from 'sqlite';

const logger = createLogger('backup-service');

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron expression
  retentionDays: number;
  backupPath: string;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  encryptionKey?: string;
  includeDatabase: boolean;
  includeLogs: boolean;
  includeConfig: boolean;
}

export interface BackupInfo {
  id: string;
  timestamp: number;
  size: number;
  type: 'full' | 'incremental' | 'database_only';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  files: string[];
  checksum: string;
  error?: string;
}

export interface RestoreOptions {
  backupId: string;
  restoreDatabase: boolean;
  restoreLogs: boolean;
  restoreConfig: boolean;
  overwriteExisting: boolean;
}

export class BackupService {
  private config: BackupConfig;
  private backups: Map<string, BackupInfo> = new Map();
  private database: Database | null = null;

  constructor(config: BackupConfig) {
    this.config = config;
    
    // Ensure backup directory exists
    this.ensureBackupDirectory();
    
    // Load existing backups
    this.loadExistingBackups();
    
    logger.info('Backup service initialized', {
      enabled: config.enabled,
      backupPath: config.backupPath,
      retentionDays: config.retentionDays,
    });
  }

  /**
   * Initialize with database reference
   */
  initialize(database: Database): void {
    this.database = database;
    logger.info('Backup service initialized with database');
  }

  /**
   * Create a full backup
   */
  async createFullBackup(): Promise<BackupInfo> {
    const backupId = crypto.randomUUID();
    const timestamp = Date.now();
    
    const backupInfo: BackupInfo = {
      id: backupId,
      timestamp,
      size: 0,
      type: 'full',
      status: 'in_progress',
      files: [],
      checksum: '',
    };

    this.backups.set(backupId, backupInfo);

    try {
      logger.info('Starting full backup', { backupId });

      const backupDir = path.join(this.config.backupPath, backupId);
      await fs.mkdir(backupDir, { recursive: true });

      const files: string[] = [];

      // Backup database
      if (this.config.includeDatabase && this.database) {
        const dbBackupPath = path.join(backupDir, 'database.sql');
        await this.backupDatabase(dbBackupPath);
        files.push('database.sql');
      }

      // Backup logs
      if (this.config.includeLogs) {
        const logsBackupPath = path.join(backupDir, 'logs.tar.gz');
        await this.backupLogs(logsBackupPath);
        files.push('logs.tar.gz');
      }

      // Backup configuration
      if (this.config.includeConfig) {
        const configBackupPath = path.join(backupDir, 'config.json');
        await this.backupConfig(configBackupPath);
        files.push('config.json');
      }

      // Calculate total size
      let totalSize = 0;
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }

      // Create checksum
      const checksum = await this.calculateChecksum(backupDir);

      // Update backup info
      backupInfo.size = totalSize;
      backupInfo.files = files;
      backupInfo.checksum = checksum;
      backupInfo.status = 'completed';

      // Save backup metadata
      await this.saveBackupMetadata(backupInfo);

      logger.info('Full backup completed', {
        backupId,
        size: totalSize,
        files: files.length,
        checksum,
      });

      return backupInfo;
    } catch (error) {
      backupInfo.status = 'failed';
      backupInfo.error = error instanceof Error ? error.message : String(error);
      
      logger.error('Full backup failed', {
        backupId,
        error: backupInfo.error,
      });

      throw error;
    }
  }

  /**
   * Create database-only backup
   */
  async createDatabaseBackup(): Promise<BackupInfo> {
    const backupId = crypto.randomUUID();
    const timestamp = Date.now();
    
    const backupInfo: BackupInfo = {
      id: backupId,
      timestamp,
      size: 0,
      type: 'database_only',
      status: 'in_progress',
      files: [],
      checksum: '',
    };

    this.backups.set(backupId, backupInfo);

    try {
      logger.info('Starting database backup', { backupId });

      const backupDir = path.join(this.config.backupPath, backupId);
      await fs.mkdir(backupDir, { recursive: true });

      const dbBackupPath = path.join(backupDir, 'database.sql');
      await this.backupDatabase(dbBackupPath);

      const stats = await fs.stat(dbBackupPath);
      const checksum = await this.calculateChecksum(backupDir);

      backupInfo.size = stats.size;
      backupInfo.files = ['database.sql'];
      backupInfo.checksum = checksum;
      backupInfo.status = 'completed';

      await this.saveBackupMetadata(backupInfo);

      logger.info('Database backup completed', {
        backupId,
        size: stats.size,
        checksum,
      });

      return backupInfo;
    } catch (error) {
      backupInfo.status = 'failed';
      backupInfo.error = error instanceof Error ? error.message : String(error);
      
      logger.error('Database backup failed', {
        backupId,
        error: backupInfo.error,
      });

      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(options: RestoreOptions): Promise<void> {
    const backup = this.backups.get(options.backupId);
    if (!backup) {
      throw new Error(`Backup not found: ${options.backupId}`);
    }

    if (backup.status !== 'completed') {
      throw new Error(`Backup is not completed: ${backup.status}`);
    }

    logger.info('Starting restore', {
      backupId: options.backupId,
      options,
    });

    const backupDir = path.join(this.config.backupPath, options.backupId);

    try {
      // Restore database
      if (options.restoreDatabase && backup.files.includes('database.sql')) {
        await this.restoreDatabase(path.join(backupDir, 'database.sql'));
      }

      // Restore logs
      if (options.restoreLogs && backup.files.includes('logs.tar.gz')) {
        await this.restoreLogs(path.join(backupDir, 'logs.tar.gz'));
      }

      // Restore configuration
      if (options.restoreConfig && backup.files.includes('config.json')) {
        await this.restoreConfig(path.join(backupDir, 'config.json'));
      }

      logger.info('Restore completed', { backupId: options.backupId });
    } catch (error) {
      logger.error('Restore failed', {
        backupId: options.backupId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List available backups
   */
  getBackups(): BackupInfo[] {
    return Array.from(this.backups.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    const backupDir = path.join(this.config.backupPath, backupId);
    await fs.rm(backupDir, { recursive: true, force: true });
    
    this.backups.delete(backupId);
    
    logger.info('Backup deleted', { backupId });
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(): Promise<void> {
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    const oldBackups = Array.from(this.backups.values())
      .filter(backup => backup.timestamp < cutoff);

    for (const backup of oldBackups) {
      await this.deleteBackup(backup.id);
    }

    if (oldBackups.length > 0) {
      logger.info('Cleaned up old backups', { count: oldBackups.length });
    }
  }

  /**
   * Get backup statistics
   */
  getBackupStats(): Record<string, any> {
    const backups = Array.from(this.backups.values());
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const successfulBackups = backups.filter(backup => backup.status === 'completed');
    const failedBackups = backups.filter(backup => backup.status === 'failed');

    return {
      totalBackups: backups.length,
      successfulBackups: successfulBackups.length,
      failedBackups: failedBackups.length,
      totalSize,
      averageSize: backups.length > 0 ? Math.round(totalSize / backups.length) : 0,
      oldestBackup: backups.length > 0 ? Math.min(...backups.map(b => b.timestamp)) : null,
      newestBackup: backups.length > 0 ? Math.max(...backups.map(b => b.timestamp)) : null,
    };
  }

  /**
   * Backup database
   */
  private async backupDatabase(outputPath: string): Promise<void> {
    if (!this.database) {
      throw new Error('Database not available');
    }

    // For SQLite, we can use the .backup() method or export to SQL
    // This is a simplified version - in production, you might want to use sqlite3's backup API
    const tables = await this.database.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);

    let sql = '';
    for (const table of tables) {
      const tableName = table.name;
      const rows = await this.database.all(`SELECT * FROM ${tableName}`);
      
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const values = rows.map(row => 
          `(${columns.map(col => `'${row[col]}'`).join(', ')})`
        );
        
        sql += `CREATE TABLE IF NOT EXISTS ${tableName} (${columns.join(', ')});\n`;
        sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${values.join(', ')};\n`;
      }
    }

    await fs.writeFile(outputPath, sql);
  }

  /**
   * Backup logs
   */
  private async backupLogs(outputPath: string): Promise<void> {
    // This is a simplified version - in production, you might want to use tar or zip
    const logFiles = ['combined.log', 'error.log'];
    const logContent: string[] = [];

    for (const logFile of logFiles) {
      try {
        const content = await fs.readFile(logFile, 'utf-8');
        logContent.push(`=== ${logFile} ===\n${content}\n`);
      } catch (error) {
        // Log file might not exist
        logContent.push(`=== ${logFile} ===\n(File not found)\n`);
      }
    }

    await fs.writeFile(outputPath, logContent.join('\n'));
  }

  /**
   * Backup configuration
   */
  private async backupConfig(outputPath: string): Promise<void> {
    const config = {
      timestamp: Date.now(),
      environment: process.env,
      // Add other configuration data as needed
    };

    await fs.writeFile(outputPath, JSON.stringify(config, null, 2));
  }

  /**
   * Restore database
   */
  private async restoreDatabase(backupPath: string): Promise<void> {
    if (!this.database) {
      throw new Error('Database not available');
    }

    const sql = await fs.readFile(backupPath, 'utf-8');
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await this.database.exec(statement);
      }
    }
  }

  /**
   * Restore logs
   */
  private async restoreLogs(backupPath: string): Promise<void> {
    const content = await fs.readFile(backupPath, 'utf-8');
    // This is a simplified version - in production, you might want to parse the backup format
    await fs.writeFile('restored-logs.txt', content);
  }

  /**
   * Restore configuration
   */
  private async restoreConfig(backupPath: string): Promise<void> {
    const config = JSON.parse(await fs.readFile(backupPath, 'utf-8'));
    // This is a simplified version - in production, you might want to apply the configuration
    await fs.writeFile('restored-config.json', JSON.stringify(config, null, 2));
  }

  /**
   * Calculate checksum for backup directory
   */
  private async calculateChecksum(backupDir: string): Promise<string> {
    const files = await fs.readdir(backupDir);
    const hash = crypto.createHash('sha256');

    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const content = await fs.readFile(filePath);
      hash.update(content);
    }

    return hash.digest('hex');
  }

  /**
   * Save backup metadata
   */
  private async saveBackupMetadata(backup: BackupInfo): Promise<void> {
    const metadataPath = path.join(this.config.backupPath, 'metadata.json');
    const metadata = Array.from(this.backups.values());
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Load existing backups
   */
  private async loadExistingBackups(): Promise<void> {
    try {
      const metadataPath = path.join(this.config.backupPath, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      
      for (const backup of metadata) {
        this.backups.set(backup.id, backup);
      }
      
      logger.info('Loaded existing backups', { count: metadata.length });
    } catch (error) {
      // Metadata file might not exist yet
      logger.debug('No existing backup metadata found');
    }
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.backupPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create backup directory', {
        path: this.config.backupPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Default backup configuration
export const defaultBackupConfig: BackupConfig = {
  enabled: true,
  schedule: '0 2 * * *', // Daily at 2 AM
  retentionDays: 30,
  backupPath: './backups',
  compressionEnabled: true,
  encryptionEnabled: false,
  includeDatabase: true,
  includeLogs: true,
  includeConfig: true,
};
