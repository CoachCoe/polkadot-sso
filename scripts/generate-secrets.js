#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateSecureKey(length = 64) {
  return crypto.randomBytes(length).toString('base64');
}

function validateSecret(secret, minLength = 32) {
  if (!secret || secret.length < minLength) {
    return false;
  }

  const uniqueChars = new Set(secret).size;
  return uniqueChars >= minLength / 2;
}

const REQUIRED_SECRETS = [
  {
    name: 'SESSION_SECRET',
    minLength: 32,
    description: 'Secret for session encryption',
  },
  {
    name: 'JWT_SECRET',
    minLength: 32,
    description: 'Secret for JWT token signing',
  },
  {
    name: 'DATABASE_ENCRYPTION_KEY',
    minLength: 32,
    description: 'Key for database field encryption',
  },
];

const OPTIONAL_SECRETS = [
  {
    name: 'ADMIN_SECRET',
    minLength: 16,
    description: 'Secret for admin operations',
  },
];

function generateSecrets() {
  console.log('🔐 Generating secure secrets for Polkadot SSO...\n');

  const secrets = {};

  for (const config of REQUIRED_SECRETS) {
    secrets[config.name] = generateSecureKey(config.minLength);
    console.log(`✅ Generated ${config.name}: ${secrets[config.name].slice(0, 20)}...`);
  }

  for (const config of OPTIONAL_SECRETS) {
    secrets[config.name] = generateSecureKey(config.minLength);
    console.log(`✅ Generated ${config.name}: ${secrets[config.name].slice(0, 20)}...`);
  }

  return secrets;
}

function createEnvFile(secrets) {
  const envContent = `# Polkadot SSO Environment Configuration
# Generated on ${new Date().toISOString()}
#
# WARNING: Keep this file secure and never commit it to version control
# Consider using a secrets management service in production

# Required Secrets
${Object.entries(secrets)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n')}

# Application Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database Configuration
DATABASE_PATH=./data/sso.db

# CORS Configuration
CLIENT_WHITELIST=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3001

# Cookie Configuration
COOKIE_DOMAIN=localhost

# Redis Configuration (for production)
# REDIS_URL=redis://localhost:6379

# Security Notes:
# - All secrets are cryptographically secure random values
# - Rotate secrets regularly in production
# - Use environment-specific .env files (.env.production, .env.staging)
# - Consider using a secrets management service (AWS Secrets Manager, HashiCorp Vault, etc.)
`;

  const envPath = path.join(process.cwd(), '.env');

  try {
    fs.writeFileSync(envPath, envContent);
    console.log(`\n📝 Created .env file at: ${envPath}`);
    console.log('🔒 Make sure to add .env to your .gitignore file!');
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
    process.exit(1);
  }
}

function main() {
  try {
    const secrets = generateSecrets();
    createEnvFile(secrets);

    console.log('\n🎉 Secret generation complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Review the generated .env file');
    console.log('2. Ensure .env is in your .gitignore');
    console.log('3. Start your application with: npm run dev');
    console.log('\n⚠️  Security reminders:');
    console.log('- Never commit secrets to version control');
    console.log('- Rotate secrets regularly in production');
    console.log('- Use different secrets for each environment');
    console.log('- Consider using a secrets management service');
  } catch (error) {
    console.error('❌ Error generating secrets:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateSecrets, createEnvFile };
