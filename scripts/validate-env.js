#!/usr/bin/env node

/**
 * Environment validation script for Polkadot SSO
 *
 * This script validates that all required environment variables are set
 * and provides helpful error messages for missing or invalid values.
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix =
    type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
  const color =
    type === 'error' ? 'red' : type === 'warn' ? 'yellow' : type === 'success' ? 'green' : 'blue';

  console.log(`${colorize(prefix, color)} [${timestamp}] ${message}`);
}

// Environment variable definitions
const envDefinitions = {
  // Core Security (Required in production)
  JWT_ACCESS_SECRET: {
    required: true,
    description: 'JWT access token secret (min 32 chars)',
    validation: value => value && value.length >= 32,
    example: 'your-super-secure-access-secret-key-here-32-chars-min',
  },
  JWT_REFRESH_SECRET: {
    required: true,
    description: 'JWT refresh token secret (min 32 chars)',
    validation: value => value && value.length >= 32,
    example: 'your-super-secure-refresh-secret-key-here-32-chars-min',
  },
  SESSION_SECRET: {
    required: true,
    description: 'Session secret for cookie signing (min 32 chars)',
    validation: value => value && value.length >= 32,
    example: 'your-super-secure-session-secret-key-here-32-chars-min',
  },
  ENCRYPTION_KEY: {
    required: true,
    description: 'Encryption key for sensitive data (min 32 chars)',
    validation: value => value && value.length >= 32,
    example: 'your-super-secure-encryption-key-here-32-chars-min',
  },

  // Database Configuration
  DATABASE_TYPE: {
    required: false,
    description: 'Database type (sqlite, postgresql, mysql)',
    validation: value => !value || ['sqlite', 'postgresql', 'mysql'].includes(value),
    example: 'sqlite',
    default: 'sqlite',
  },
  DATABASE_PATH: {
    required: false,
    description: 'SQLite database file path',
    validation: value => !value || typeof value === 'string',
    example: './data/sso.db',
    default: './data/sso.db',
  },
  DATABASE_HOST: {
    required: false,
    description: 'Database host (required for postgresql/mysql)',
    validation: value => !value || typeof value === 'string',
    example: 'localhost',
  },
  DATABASE_PORT: {
    required: false,
    description: 'Database port',
    validation: value =>
      !value || (!isNaN(parseInt(value)) && parseInt(value) > 0 && parseInt(value) <= 65535),
    example: '5432',
    default: '5432',
  },
  DATABASE_NAME: {
    required: false,
    description: 'Database name',
    validation: value => !value || typeof value === 'string',
    example: 'polkadot_sso',
    default: 'polkadot_sso',
  },
  DATABASE_USERNAME: {
    required: false,
    description: 'Database username',
    validation: value => !value || typeof value === 'string',
    example: 'postgres',
  },
  DATABASE_PASSWORD: {
    required: false,
    description: 'Database password',
    validation: value => !value || typeof value === 'string',
    example: 'your-database-password',
  },
  DATABASE_URL: {
    required: false,
    description: 'Database connection string',
    validation: value => !value || typeof value === 'string',
    example: 'postgresql://user:password@localhost:5432/polkadot_sso',
  },

  // Server Configuration
  PORT: {
    required: false,
    description: 'Server port',
    validation: value =>
      !value || (!isNaN(parseInt(value)) && parseInt(value) > 0 && parseInt(value) <= 65535),
    example: '3001',
    default: '3001',
  },
  HOST: {
    required: false,
    description: 'Server host',
    validation: value => !value || typeof value === 'string',
    example: '0.0.0.0',
    default: '0.0.0.0',
  },

  // Remittance Configuration
  REMITANCE_ENABLED: {
    required: false,
    description: 'Enable remittance platform',
    validation: value => !value || ['true', 'false'].includes(value),
    example: 'true',
    default: 'false',
  },
  REMITANCE_TREASURY_ADDRESS: {
    required: false,
    description: 'Treasury address for remittance (required if enabled)',
    validation: value => !value || typeof value === 'string',
    example: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  },

  // Exchange Rate Configuration
  EXCHANGE_RATE_PROVIDER: {
    required: false,
    description: 'Exchange rate provider (coingecko, mock)',
    validation: value => !value || ['coingecko', 'mock'].includes(value),
    example: 'coingecko',
    default: 'coingecko',
  },
  COINGECKO_API_KEY: {
    required: false,
    description: 'CoinGecko API key (optional, for higher rate limits)',
    validation: value => !value || typeof value === 'string',
    example: 'your-coingecko-api-key',
  },

  // Chain Configuration
  DEFAULT_CHAIN: {
    required: false,
    description: 'Default Polkadot chain',
    validation: value => !value || ['polkadot', 'kusama', 'westend', 'rococo'].includes(value),
    example: 'kusama',
    default: 'kusama',
  },
  KUSAMA_RPC_URL: {
    required: false,
    description: 'Kusama RPC URL',
    validation: value => !value || typeof value === 'string',
    example: 'wss://kusama-rpc.polkadot.io',
    default: 'wss://kusama-rpc.polkadot.io',
  },
  POLKADOT_RPC_URL: {
    required: false,
    description: 'Polkadot RPC URL',
    validation: value => !value || typeof value === 'string',
    example: 'wss://rpc.polkadot.io',
    default: 'wss://rpc.polkadot.io',
  },

  // Feature Flags
  ENABLE_SIGNATURE_VERIFICATION: {
    required: false,
    description: 'Enable cryptographic signature verification',
    validation: value => !value || ['true', 'false'].includes(value),
    example: 'true',
    default: 'true',
  },
  ENABLE_RATE_LIMITING: {
    required: false,
    description: 'Enable rate limiting',
    validation: value => !value || ['true', 'false'].includes(value),
    example: 'true',
    default: 'true',
  },
  ENABLE_CORS: {
    required: false,
    description: 'Enable CORS',
    validation: value => !value || ['true', 'false'].includes(value),
    example: 'true',
    default: 'true',
  },
  ENABLE_HELMET: {
    required: false,
    description: 'Enable Helmet security headers',
    validation: value => !value || ['true', 'false'].includes(value),
    example: 'true',
    default: 'true',
  },
};

function validateEnvironment() {
  log('Starting environment validation...', 'info');

  const errors = [];
  const warnings = [];
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';

  log(
    `Environment: ${colorize(environment, environment === 'production' ? 'red' : 'yellow')}`,
    'info'
  );

  // Check each environment variable
  for (const [key, definition] of Object.entries(envDefinitions)) {
    const value = process.env[key];
    const isRequired = definition.required || (isProduction && definition.requiredInProduction);

    if (!value) {
      if (isRequired) {
        errors.push({
          key,
          message: `Required environment variable ${colorize(key, 'red')} is not set`,
          description: definition.description,
          example: definition.example,
        });
      } else if (definition.default) {
        log(`Using default value for ${key}: ${definition.default}`, 'info');
      }
    } else {
      // Validate the value
      if (definition.validation && !definition.validation(value)) {
        errors.push({
          key,
          message: `Invalid value for ${colorize(key, 'red')}: ${value}`,
          description: definition.description,
          example: definition.example,
        });
      } else {
        log(`✅ ${key} is set and valid`, 'success');
      }
    }
  }

  // Check for remittance-specific requirements
  if (process.env.REMITANCE_ENABLED === 'true' && !process.env.REMITANCE_TREASURY_ADDRESS) {
    errors.push({
      key: 'REMITANCE_TREASURY_ADDRESS',
      message: 'REMITANCE_TREASURY_ADDRESS is required when REMITANCE_ENABLED=true',
      description: 'Treasury address for remittance platform',
      example: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    });
  }

  // Check for database-specific requirements
  const dbType = process.env.DATABASE_TYPE || 'sqlite';
  if (dbType !== 'sqlite') {
    if (!process.env.DATABASE_HOST) {
      errors.push({
        key: 'DATABASE_HOST',
        message: 'DATABASE_HOST is required for non-SQLite databases',
        description: 'Database host address',
        example: 'localhost',
      });
    }
  }

  // Display results
  console.log('\n' + '='.repeat(80));

  if (errors.length === 0) {
    log('🎉 Environment validation passed!', 'success');
    log('All required environment variables are set and valid.', 'success');
  } else {
    log(`❌ Environment validation failed with ${errors.length} error(s):`, 'error');
    console.log();

    errors.forEach((error, index) => {
      console.log(`${colorize(`${index + 1}.`, 'red')} ${error.message}`);
      console.log(`   ${colorize('Description:', 'cyan')} ${error.description}`);
      if (error.example) {
        console.log(`   ${colorize('Example:', 'yellow')} ${error.example}`);
      }
      console.log();
    });
  }

  if (warnings.length > 0) {
    log(`⚠️  ${warnings.length} warning(s):`, 'warn');
    warnings.forEach((warning, index) => {
      console.log(`${colorize(`${index + 1}.`, 'yellow')} ${warning}`);
    });
  }

  // Generate .env.example file if it doesn't exist
  generateEnvExample();

  // Exit with appropriate code
  if (errors.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

function generateEnvExample() {
  const envExamplePath = path.join(process.cwd(), '.env.example');

  if (!fs.existsSync(envExamplePath)) {
    log('Generating .env.example file...', 'info');

    let content = '# Polkadot SSO Environment Configuration\n';
    content += '# Copy this file to .env and fill in your values\n\n';

    content += `# Environment\n`;
    content += `NODE_ENV=development\n\n`;

    content += `# Core Security (Required in production)\n`;
    content += `JWT_ACCESS_SECRET=your-super-secure-access-secret-key-here-32-chars-min\n`;
    content += `JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-here-32-chars-min\n`;
    content += `SESSION_SECRET=your-super-secure-session-secret-key-here-32-chars-min\n`;
    content += `ENCRYPTION_KEY=your-super-secure-encryption-key-here-32-chars-min\n\n`;

    content += `# Database Configuration\n`;
    content += `DATABASE_TYPE=sqlite\n`;
    content += `DATABASE_PATH=./data/sso.db\n`;
    content += `# For PostgreSQL/MySQL:\n`;
    content += `# DATABASE_HOST=localhost\n`;
    content += `# DATABASE_PORT=5432\n`;
    content += `# DATABASE_NAME=polkadot_sso\n`;
    content += `# DATABASE_USERNAME=postgres\n`;
    content += `# DATABASE_PASSWORD=your-password\n\n`;

    content += `# Server Configuration\n`;
    content += `PORT=3001\n`;
    content += `HOST=0.0.0.0\n\n`;

    content += `# Remittance Platform\n`;
    content += `REMITANCE_ENABLED=false\n`;
    content += `REMITANCE_TREASURY_ADDRESS=\n\n`;

    content += `# Exchange Rates\n`;
    content += `EXCHANGE_RATE_PROVIDER=coingecko\n`;
    content += `# COINGECKO_API_KEY=your-api-key\n\n`;

    content += `# Chain Configuration\n`;
    content += `DEFAULT_CHAIN=kusama\n`;
    content += `KUSAMA_RPC_URL=wss://kusama-rpc.polkadot.io\n`;
    content += `POLKADOT_RPC_URL=wss://rpc.polkadot.io\n\n`;

    content += `# Feature Flags\n`;
    content += `ENABLE_SIGNATURE_VERIFICATION=true\n`;
    content += `ENABLE_RATE_LIMITING=true\n`;
    content += `ENABLE_CORS=true\n`;
    content += `ENABLE_HELMET=true\n`;

    fs.writeFileSync(envExamplePath, content);
    log(`✅ Generated .env.example file at ${envExamplePath}`, 'success');
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment, envDefinitions };
