# Security Guide for Polkadot SSO

This document outlines security best practices for deploying the Polkadot SSO service in production environments.

## Secret Management

### Development Environment
For development, use the provided secret generation script:
```bash
npm run generate-secrets
```

### Production Environment

#### Option 1: Environment Variables (Basic)
Set environment variables directly on your production server:
```bash
export SESSION_SECRET="your-64-char-secret"
export JWT_SECRET="your-64-char-secret"
export DATABASE_ENCRYPTION_KEY="your-64-char-secret"
```

#### Option 2: Secrets Management Services (Recommended)

**AWS Secrets Manager:**
```bash
# Store secrets
aws secretsmanager create-secret \
  --name "polkadot-sso/prod" \
  --description "Polkadot SSO Production Secrets" \
  --secret-string '{
    "SESSION_SECRET": "your-secret",
    "JWT_SECRET": "your-secret",
    "DATABASE_ENCRYPTION_KEY": "your-secret"
  }'

# Retrieve secrets in your application
aws secretsmanager get-secret-value --secret-id "polkadot-sso/prod"
```

**HashiCorp Vault:**
```bash
# Enable key-value secrets engine
vault secrets enable -path=polkadot-sso kv-v2

# Store secrets
vault kv put polkadot-sso/prod \
  SESSION_SECRET="your-secret" \
  JWT_SECRET="your-secret" \
  DATABASE_ENCRYPTION_KEY="your-secret"
```

**Docker Secrets:**
```bash
# Create secrets
echo "your-secret" | docker secret create session_secret -
echo "your-secret" | docker secret create jwt_secret -
echo "your-secret" | docker secret create db_encryption_key -

# Use in docker-compose.yml
version: '3.8'
services:
  polkadot-sso:
    image: polkadot-sso:latest
    secrets:
      - session_secret
      - jwt_secret
      - db_encryption_key
    environment:
      - SESSION_SECRET_FILE=/run/secrets/session_secret
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - DATABASE_ENCRYPTION_KEY_FILE=/run/secrets/db_encryption_key
```

## Secret Rotation

### Automated Rotation
Implement automated secret rotation using your secrets management service:

**AWS Secrets Manager with Lambda:**
```javascript
// Lambda function for automatic rotation
exports.handler = async (event) => {
  const { SecretId } = event;
  
  // Generate new secrets
  const newSecrets = {
    SESSION_SECRET: crypto.randomBytes(64).toString('base64'),
    JWT_SECRET: crypto.randomBytes(64).toString('base64'),
    DATABASE_ENCRYPTION_KEY: crypto.randomBytes(64).toString('base64')
  };
  
  // Update secret
  await secretsManager.updateSecret({
    SecretId,
    SecretString: JSON.stringify(newSecrets)
  });
  
  return { statusCode: 200 };
};
```

### Manual Rotation
For manual rotation, follow these steps:

1. **Generate new secrets:**
   ```bash
   npm run generate-secrets
   ```

2. **Update your secrets management system**

3. **Restart the application** (secrets are validated on startup)

4. **Monitor for any issues** with existing sessions/tokens

## Database Security

### Encryption at Rest
- Use encrypted storage volumes (AWS EBS encryption, Azure Disk Encryption)
- Enable database-level encryption if available
- Encrypt sensitive fields using the built-in encryption utilities

### Access Control
- Use least-privilege database users
- Implement connection pooling with authentication
- Use SSL/TLS for database connections

### Backup Security
- Encrypt database backups
- Store backups in secure, access-controlled locations
- Test backup restoration procedures regularly

## Network Security

### TLS/SSL Configuration
```javascript
// Example HTTPS configuration
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
  ca: fs.readFileSync('/path/to/ca-bundle.pem')
};

https.createServer(options, app).listen(443);
```

### Firewall Configuration
- Restrict access to necessary ports only (443, 80)
- Use security groups/network ACLs
- Implement IP whitelisting for admin access

### CORS Configuration
```javascript
// Production CORS configuration
const corsOptions = {
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
};
```

## Application Security

### Rate Limiting
The application includes built-in rate limiting. Configure appropriately for production:

```javascript
// Production rate limiting
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many API requests',
});
```

### Security Headers
The application uses Helmet.js for security headers. Additional configuration:

```javascript
// Additional security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-${nonce}'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss://rpc.polkadot.io"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Session Security
```javascript
// Production session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  name: 'sso.sid',
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    domain: process.env.COOKIE_DOMAIN
  },
  resave: false,
  saveUninitialized: false,
  rolling: true
};
```

## Monitoring and Logging

### Security Event Logging
The application includes comprehensive audit logging. Configure log aggregation:

```javascript
// Winston configuration for production
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Send to external logging service
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Http({
    host: 'your-logging-service.com',
    port: 443,
    ssl: true
  }));
}
```

### Security Monitoring
- Monitor for failed authentication attempts
- Track rate limit violations
- Monitor for unusual API usage patterns
- Set up alerts for security events

## Compliance

### GDPR Compliance
- Implement data retention policies
- Provide data export/deletion capabilities
- Document data processing activities
- Ensure user consent mechanisms

### SOC 2 Compliance
- Implement access controls
- Maintain audit trails
- Regular security assessments
- Incident response procedures

## Incident Response

### Security Incident Procedures
1. **Detection**: Monitor logs and alerts
2. **Assessment**: Evaluate scope and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat and vulnerabilities
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Document and improve

### Contact Information
- Security Team: security@yourdomain.com
- Emergency Contact: +1-XXX-XXX-XXXX
- Incident Response Playbook: [Link to internal documentation]

## Regular Security Tasks

### Monthly
- Review access logs
- Update dependencies
- Rotate secrets
- Review security configurations

### Quarterly
- Security assessments
- Penetration testing
- Update security policies
- Review compliance status

### Annually
- Comprehensive security audit
- Update incident response procedures
- Review disaster recovery plans
- Security training for team members

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practices-security.html)
- [Polkadot Security Guidelines](https://wiki.polkadot.network/docs/learn-security) 