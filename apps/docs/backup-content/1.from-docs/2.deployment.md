# Deployment Guide

## Overview

This guide covers deploying the Polkadot SSO service in various environments, from development to production. The service is designed to be containerized and can be deployed on any platform that supports Docker.

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **Docker**: 20.x or higher (for containerized deployment)
- **Database**: SQLite (included) or PostgreSQL/MySQL (for production)
- **Memory**: Minimum 512MB RAM
- **Storage**: Minimum 1GB disk space

### Required Environment Variables
```bash
# JWT Configuration (Required)
JWT_ACCESS_SECRET=your-32-character-secret-here
JWT_REFRESH_SECRET=your-32-character-secret-here
JWT_ISSUER=polkadot-sso
JWT_ACCESS_EXPIRY=900
JWT_REFRESH_EXPIRY=604800

# Database Configuration
DATABASE_ENCRYPTION_KEY=your-32-character-encryption-key
DATABASE_PATH=./data/sso.db

# Security Configuration
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
RATE_LIMIT_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=90

# Server Configuration
PORT=3000
NODE_ENV=production
```

## Development Deployment

### 1. Local Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/polkadot-sso.git
cd polkadot-sso

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Build the project
npm run build

# Start the development server
npm run dev
```

### 2. Docker Development

```bash
# Build the development image
docker build -t polkadot-sso:dev .

# Run the development container
docker run -p 3000:3000 \
  -e JWT_ACCESS_SECRET=your-secret-here \
  -e JWT_REFRESH_SECRET=your-secret-here \
  -e DATABASE_ENCRYPTION_KEY=your-encryption-key \
  polkadot-sso:dev
```

## Production Deployment

### 1. Docker Production Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/
COPY public/ ./public/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S polkadot-sso -u 1001

# Change ownership
RUN chown -R polkadot-sso:nodejs /app
USER polkadot-sso

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  polkadot-sso:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - DATABASE_ENCRYPTION_KEY=${DATABASE_ENCRYPTION_KEY}
      - CORS_ORIGINS=${CORS_ORIGINS}
    volumes:
      - sso-data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  sso-data:
```

#### Deployment Commands
```bash
# Build the production image
docker build -t polkadot-sso:latest .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Scale the service
docker-compose up -d --scale polkadot-sso=3
```

### 2. Kubernetes Deployment

#### Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: polkadot-sso
```

#### ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: polkadot-sso-config
  namespace: polkadot-sso
data:
  NODE_ENV: "production"
  PORT: "3000"
  CORS_ORIGINS: "https://yourdomain.com"
  RATE_LIMIT_ENABLED: "true"
  AUDIT_LOG_RETENTION_DAYS: "90"
```

#### Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: polkadot-sso-secrets
  namespace: polkadot-sso
type: Opaque
data:
  JWT_ACCESS_SECRET: <base64-encoded-secret>
  JWT_REFRESH_SECRET: <base64-encoded-secret>
  DATABASE_ENCRYPTION_KEY: <base64-encoded-key>
```

#### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: polkadot-sso
  namespace: polkadot-sso
spec:
  replicas: 3
  selector:
    matchLabels:
      app: polkadot-sso
  template:
    metadata:
      labels:
        app: polkadot-sso
    spec:
      containers:
      - name: polkadot-sso
        image: polkadot-sso:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: polkadot-sso-config
        - secretRef:
            name: polkadot-sso-secrets
        volumeMounts:
        - name: data-volume
          mountPath: /app/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: polkadot-sso-data
```

#### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: polkadot-sso-service
  namespace: polkadot-sso
spec:
  selector:
    app: polkadot-sso
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

#### Ingress
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: polkadot-sso-ingress
  namespace: polkadot-sso
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - sso.yourdomain.com
    secretName: polkadot-sso-tls
  rules:
  - host: sso.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: polkadot-sso-service
            port:
              number: 80
```

### 3. AWS ECS Deployment

#### Task Definition
```json
{
  "family": "polkadot-sso",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "polkadot-sso",
      "image": "your-account.dkr.ecr.region.amazonaws.com/polkadot-sso:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "JWT_ACCESS_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:polkadot-sso/jwt-access-secret"
        },
        {
          "name": "JWT_REFRESH_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:polkadot-sso/jwt-refresh-secret"
        },
        {
          "name": "DATABASE_ENCRYPTION_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:polkadot-sso/database-encryption-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/polkadot-sso",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### Service Configuration
```json
{
  "serviceName": "polkadot-sso-service",
  "cluster": "polkadot-sso-cluster",
  "taskDefinition": "polkadot-sso",
  "desiredCount": 3,
  "launchType": "FARGATE",
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["subnet-12345", "subnet-67890"],
      "securityGroups": ["sg-12345"],
      "assignPublicIp": "ENABLED"
    }
  },
  "loadBalancers": [
    {
      "targetGroupArn": "arn:aws:elasticloadbalancing:region:account:targetgroup/polkadot-sso-tg/12345",
      "containerName": "polkadot-sso",
      "containerPort": 3000
    }
  ]
}
```

### 4. Google Cloud Run Deployment

#### Cloud Run Service
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: polkadot-sso
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/ingress-status: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        autoscaling.knative.dev/minScale: "1"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 100
      containers:
      - image: gcr.io/your-project/polkadot-sso:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: JWT_ACCESS_SECRET
          valueFrom:
            secretKeyRef:
              name: polkadot-sso-secrets
              key: jwt-access-secret
        - name: JWT_REFRESH_SECRET
          valueFrom:
            secretKeyRef:
              name: polkadot-sso-secrets
              key: jwt-refresh-secret
        - name: DATABASE_ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: polkadot-sso-secrets
              key: database-encryption-key
        resources:
          limits:
            cpu: "1"
            memory: "1Gi"
          requests:
            cpu: "0.5"
            memory: "512Mi"
```

#### Deployment Commands
```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/your-project/polkadot-sso .

# Deploy to Cloud Run
gcloud run deploy polkadot-sso \
  --image gcr.io/your-project/polkadot-sso:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 1
```

## Database Setup

### 1. SQLite (Default)
```bash
# Database is automatically created
# No additional setup required
```

### 2. PostgreSQL (Production)
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE polkadot_sso;
CREATE USER polkadot_sso_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE polkadot_sso TO polkadot_sso_user;
\q

# Update environment variables
DATABASE_URL=postgresql://polkadot_sso_user:secure_password@localhost:5432/polkadot_sso
```

### 3. MySQL (Production)
```bash
# Install MySQL
sudo apt-get install mysql-server

# Create database and user
mysql -u root -p
CREATE DATABASE polkadot_sso;
CREATE USER 'polkadot_sso_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON polkadot_sso.* TO 'polkadot_sso_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Update environment variables
DATABASE_URL=mysql://polkadot_sso_user:secure_password@localhost:3306/polkadot_sso
```

## Load Balancer Configuration

### 1. Nginx Configuration
```nginx
upstream polkadot_sso {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name sso.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sso.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://polkadot_sso;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    location /health {
        proxy_pass http://polkadot_sso;
        access_log off;
    }
}
```

### 2. HAProxy Configuration
```
global
    daemon
    maxconn 4096

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend polkadot_sso_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/yourdomain.com.pem
    redirect scheme https if !{ ssl_fc }
    default_backend polkadot_sso_backend

backend polkadot_sso_backend
    balance roundrobin
    option httpchk GET /health
    server sso1 127.0.0.1:3000 check
    server sso2 127.0.0.1:3001 check
    server sso3 127.0.0.1:3002 check
```

## Monitoring & Logging

### 1. Prometheus Metrics
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'polkadot-sso'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

### 2. Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Polkadot SSO Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          }
        ]
      }
    ]
  }
}
```

### 3. ELK Stack
```yaml
# docker-compose.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.15.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:7.15.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"

  kibana:
    image: docker.elastic.co/kibana/kibana:7.15.0
    ports:
      - "5601:5601"
```

## Security Hardening

### 1. Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# iptables
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -j DROP
```

### 2. SSL/TLS Configuration
```bash
# Let's Encrypt with Certbot
sudo apt-get install certbot
sudo certbot --nginx -d sso.yourdomain.com

# Manual SSL certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### 3. System Hardening
```bash
# Disable unnecessary services
sudo systemctl disable apache2
sudo systemctl disable mysql

# Set up fail2ban
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure automatic updates
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

## Backup & Recovery

### 1. Database Backup
```bash
# SQLite backup
cp /app/data/sso.db /backup/sso-$(date +%Y%m%d).db

# PostgreSQL backup
pg_dump polkadot_sso > /backup/polkadot_sso-$(date +%Y%m%d).sql

# MySQL backup
mysqldump polkadot_sso > /backup/polkadot_sso-$(date +%Y%m%d).sql
```

### 2. Automated Backup Script
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup"
DB_PATH="/app/data/sso.db"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp $DB_PATH $BACKUP_DIR/sso-$DATE.db

# Compress backup
gzip $BACKUP_DIR/sso-$DATE.db

# Remove old backups (keep 30 days)
find $BACKUP_DIR -name "sso-*.db.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/sso-$DATE.db.gz s3://your-backup-bucket/
```

### 3. Recovery Procedure
```bash
# Stop the service
sudo systemctl stop polkadot-sso

# Restore database
gunzip /backup/sso-20231201.db.gz
cp /backup/sso-20231201.db /app/data/sso.db

# Start the service
sudo systemctl start polkadot-sso
```

## Troubleshooting

### 1. Common Issues

#### Service Won't Start
```bash
# Check logs
sudo journalctl -u polkadot-sso -f

# Check environment variables
sudo systemctl show polkadot-sso --property=Environment

# Check port availability
sudo netstat -tlnp | grep :3000
```

#### Database Connection Issues
```bash
# Check database file permissions
ls -la /app/data/sso.db

# Check database integrity
sqlite3 /app/data/sso.db "PRAGMA integrity_check;"

# Check disk space
df -h
```

#### Memory Issues
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check for memory leaks
node --inspect dist/index.js
```

### 2. Performance Tuning

#### Node.js Optimization
```bash
# Increase max memory
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable clustering
export CLUSTER_MODE=true
export CLUSTER_WORKERS=4
```

#### Database Optimization
```sql
-- SQLite optimization
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=10000;
PRAGMA temp_store=MEMORY;
```

## Maintenance

### 1. Regular Maintenance Tasks
```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade

# Update Node.js dependencies
npm audit fix
npm update

# Clean up old logs
find /var/log -name "*.log" -mtime +30 -delete

# Clean up old backups
find /backup -name "*.db.gz" -mtime +90 -delete
```

### 2. Health Checks
```bash
# Service health
curl -f http://localhost:3000/health

# Database health
sqlite3 /app/data/sso.db "SELECT COUNT(*) FROM challenges;"

# Disk space
df -h | grep -E "(Filesystem|/app)"

# Memory usage
free -h
```

### 3. Log Rotation
```bash
# /etc/logrotate.d/polkadot-sso
/var/log/polkadot-sso/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 polkadot-sso polkadot-sso
    postrotate
        systemctl reload polkadot-sso
    endscript
}
```

## Support

For deployment support and troubleshooting:

- **Documentation**: [GitHub Wiki](https://github.com/your-org/polkadot-sso/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-org/polkadot-sso/issues)
- **Discord**: [Community Discord](https://discord.gg/polkadot-sso)
- **Email**: support@polkadot-sso.com
