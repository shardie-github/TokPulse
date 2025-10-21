# TokPulse Deployment Guide

## Overview

This guide covers deploying TokPulse to production environments with high availability, security, and performance considerations.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   CDN/Edge      │    │   Monitoring    │
│   (Cloudflare)  │    │   (Cloudflare)  │    │   (Grafana)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Static Assets │    │   Logs & Metrics│
│   (Kong/AWS)    │    │   (S3/CloudFlare)│   │   (ELK Stack)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Database      │    │   Cache/Queue   │
│   (Docker)      │    │   (PostgreSQL)  │    │   (Redis)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ and pnpm 8+
- PostgreSQL 14+
- Redis 6+
- SSL certificates
- Domain name and DNS configuration

## Environment Setup

### 1. Environment Variables

Create a `.env.production` file:

```bash
# Application
NODE_ENV=production
APP_URL=https://your-domain.com
SESSION_SECRET=your-super-secure-session-secret

# Database
DATABASE_URL=postgresql://username:password@host:5432/tokpulse_prod
PRISMA_CLIENT_ENGINE_TYPE=wasm

# Redis
REDIS_URL=redis://username:password@host:6379

# Shopify
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_customers
SHOPIFY_APP_URL=https://your-domain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_GROWTH=price_...
STRIPE_PRICE_ID_ENTERPRISE=price_...

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-32-byte-encryption-key
CORS_ORIGIN=https://your-domain.com

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
PROMETHEUS_ENDPOINT=http://prometheus:9090

# External Services
GITHUB_TOKEN=your-github-token
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
```

### 2. Database Setup

#### PostgreSQL Configuration

```sql
-- Create database
CREATE DATABASE tokpulse_prod;

-- Create user
CREATE USER tokpulse_user WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE tokpulse_prod TO tokpulse_user;

-- Create extensions
\c tokpulse_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
```

#### Database Migrations

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed
```

### 3. Redis Configuration

```redis
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## Docker Deployment

### 1. Production Dockerfile

```dockerfile
# Dockerfile.prod
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@8.15.0
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 tokpulse

# Copy built application
COPY --from=builder --chown=tokpulse:nodejs /app/apps/partner-app/dist ./apps/partner-app/dist
COPY --from=builder --chown=tokpulse:nodejs /app/packages ./packages
COPY --from=builder --chown=tokpulse:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=tokpulse:nodejs /app/package.json ./package.json

USER tokpulse

EXPOSE 3000

CMD ["node", "apps/partner-app/dist/index.js"]
```

### 2. Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: tokpulse_prod
      POSTGRES_USER: tokpulse_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tokpulse_user -d tokpulse_prod"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 3. Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=web:10m rate=30r/s;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Web routes
        location / {
            limit_req zone=web burst=50 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static assets
        location /static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## Cloud Deployment

### AWS Deployment

#### 1. ECS with Fargate

```yaml
# ecs-task-definition.json
{
  "family": "tokpulse",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "tokpulse-app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/tokpulse:latest",
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
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:tokpulse/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/tokpulse",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 2. RDS PostgreSQL

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier tokpulse-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.2 \
  --master-username tokpulse \
  --master-user-password your-secure-password \
  --allocated-storage 100 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-12345678 \
  --db-subnet-group-name tokpulse-subnet-group \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted
```

#### 3. ElastiCache Redis

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id tokpulse-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --vpc-security-group-ids sg-12345678 \
  --subnet-group-name tokpulse-subnet-group
```

### Google Cloud Platform

#### 1. Cloud Run

```yaml
# cloud-run.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: tokpulse
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containers:
      - image: gcr.io/your-project/tokpulse:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          limits:
            cpu: "2"
            memory: "2Gi"
```

#### 2. Cloud SQL

```bash
# Create Cloud SQL instance
gcloud sql instances create tokpulse-prod \
  --database-version=POSTGRES_15 \
  --tier=db-standard-2 \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=100GB \
  --backup \
  --enable-ip-alias
```

### Kubernetes Deployment

#### 1. Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tokpulse
```

#### 2. ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tokpulse-config
  namespace: tokpulse
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
```

#### 3. Secret

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: tokpulse-secrets
  namespace: tokpulse
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  STRIPE_SECRET_KEY: <base64-encoded-stripe-key>
```

#### 4. Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tokpulse-app
  namespace: tokpulse
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tokpulse
  template:
    metadata:
      labels:
        app: tokpulse
    spec:
      containers:
      - name: tokpulse
        image: tokpulse:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: tokpulse-config
        - secretRef:
            name: tokpulse-secrets
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
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### 5. Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: tokpulse-service
  namespace: tokpulse
spec:
  selector:
    app: tokpulse
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

#### 6. Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tokpulse-ingress
  namespace: tokpulse
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: tokpulse-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: tokpulse-service
            port:
              number: 80
```

## Monitoring and Observability

### 1. Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'tokpulse'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

### 2. Grafana Dashboard

```json
{
  "dashboard": {
    "title": "TokPulse Metrics",
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
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
```

### 3. Alerting Rules

```yaml
# alerts.yml
groups:
- name: tokpulse
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      
  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
```

## Security Considerations

### 1. SSL/TLS Configuration

- Use TLS 1.2 or higher
- Implement HSTS headers
- Use strong cipher suites
- Regular certificate renewal

### 2. Network Security

- Use VPCs and security groups
- Implement WAF rules
- Enable DDoS protection
- Use private subnets for databases

### 3. Application Security

- Regular security updates
- Input validation and sanitization
- Rate limiting and throttling
- Secure session management

### 4. Data Protection

- Encrypt data at rest
- Encrypt data in transit
- Regular backups
- Access logging and auditing

## Backup and Recovery

### 1. Database Backups

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://tokpulse-backups/
```

### 2. Disaster Recovery

- Multi-region deployment
- Automated failover
- Data replication
- Recovery time objectives (RTO) < 1 hour
- Recovery point objectives (RPO) < 15 minutes

## Performance Optimization

### 1. Caching Strategy

- Redis for session storage
- CDN for static assets
- Database query caching
- Application-level caching

### 2. Database Optimization

- Proper indexing
- Query optimization
- Connection pooling
- Read replicas

### 3. Application Optimization

- Code splitting
- Lazy loading
- Image optimization
- Bundle size optimization

## Scaling

### 1. Horizontal Scaling

- Load balancers
- Auto-scaling groups
- Container orchestration
- Microservices architecture

### 2. Vertical Scaling

- CPU and memory upgrades
- Storage optimization
- Network bandwidth
- I/O optimization

## Maintenance

### 1. Regular Updates

- Security patches
- Dependency updates
- OS updates
- Application updates

### 2. Monitoring

- Health checks
- Performance metrics
- Error tracking
- Log analysis

### 3. Backup Verification

- Regular restore tests
- Data integrity checks
- Recovery procedures
- Documentation updates