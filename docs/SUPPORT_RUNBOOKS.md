# TokPulse Support Runbooks

## Overview

This document contains comprehensive runbooks for supporting TokPulse in production. These runbooks are designed for one-person operations and provide step-by-step procedures for common issues and maintenance tasks.

## Table of Contents

1. [Emergency Response](#emergency-response)
2. [Health Monitoring](#health-monitoring)
3. [Performance Issues](#performance-issues)
4. [Database Issues](#database-issues)
5. [Authentication Issues](#authentication-issues)
6. [Billing Issues](#billing-issues)
7. [Deployment Issues](#deployment-issues)
8. [Backup & Recovery](#backup--recovery)
9. [Security Incidents](#security-incidents)
10. [Customer Support](#customer-support)

---

## Emergency Response

### P0 - Service Down
**Response Time: 5 minutes**

1. **Check Service Status**
   ```bash
   # Check all services
   curl -f https://api.tokpulse.com/health
   curl -f https://app.tokpulse.com/health
   curl -f https://dashboard.tokpulse.com/health
   ```

2. **Check Infrastructure**
   ```bash
   # Check Railway status
   railway status
   
   # Check Vercel status
   vercel ls
   ```

3. **Check Logs**
   ```bash
   # Check application logs
   railway logs --service tokpulse-partner-app
   
   # Check error logs
   curl -s https://api.tokpulse.com/metrics | grep error
   ```

4. **Restart Services**
   ```bash
   # Restart partner app
   railway service restart tokpulse-partner-app
   
   # Restart hydrogen app
   vercel --prod --force
   ```

5. **Escalate if Needed**
   - Post in #incidents Slack channel
   - Update status page
   - Notify customers via email

### P1 - Critical Feature Down
**Response Time: 15 minutes**

1. **Identify Affected Feature**
   ```bash
   # Check specific endpoints
   curl -f https://api.tokpulse.com/api/recommendations
   curl -f https://api.tokpulse.com/api/analytics
   ```

2. **Check Feature Flags**
   ```bash
   # Check feature flag status
   curl -s https://api.tokpulse.com/api/flags
   ```

3. **Rollback if Necessary**
   ```bash
   # Rollback to previous version
   railway service rollback tokpulse-partner-app
   ```

---

## Health Monitoring

### Check System Health

1. **Overall Health**
   ```bash
   curl -s https://api.tokpulse.com/health | jq
   ```

2. **Individual Components**
   ```bash
   # Database health
   curl -s https://api.tokpulse.com/health | jq '.checks[] | select(.name == "database")'
   
   # Memory health
   curl -s https://api.tokpulse.com/health | jq '.checks[] | select(.name == "memory")'
   
   # External dependencies
   curl -s https://api.tokpulse.com/health | jq '.checks[] | select(.name == "external_deps")'
   ```

3. **Performance Metrics**
   ```bash
   curl -s https://api.tokpulse.com/performance/status | jq
   ```

### Fix Common Health Issues

#### Database Connection Issues
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Restart database connection pool
railway service restart tokpulse-partner-app
```

#### Memory Issues
```bash
# Check memory usage
curl -s https://api.tokpulse.com/health | jq '.checks[] | select(.name == "memory")'

# Restart service if memory usage > 90%
if [ $(curl -s https://api.tokpulse.com/health | jq -r '.checks[] | select(.name == "memory") | .details.usagePercent') -gt 90 ]; then
  railway service restart tokpulse-partner-app
fi
```

#### External Dependency Issues
```bash
# Check Shopify API
curl -f https://api.shopify.com

# Check Stripe API
curl -f https://api.stripe.com

# Check if it's a temporary issue
sleep 60
curl -s https://api.tokpulse.com/health | jq '.checks[] | select(.name == "external_deps")'
```

---

## Performance Issues

### Identify Performance Problems

1. **Check Performance Status**
   ```bash
   curl -s https://api.tokpulse.com/performance/status | jq
   ```

2. **Get Detailed Report**
   ```bash
   curl -s https://api.tokpulse.com/performance | jq '.violations[]'
   ```

### Fix Performance Issues

#### High API Response Time
```bash
# Check API metrics
curl -s https://api.tokpulse.com/metrics | grep api_response_time

# Check database query performance
curl -s https://api.tokpulse.com/metrics | grep db_query_time

# Restart service to clear caches
railway service restart tokpulse-partner-app
```

#### High Memory Usage
```bash
# Check memory metrics
curl -s https://api.tokpulse.com/metrics | grep memory_usage

# Check for memory leaks
railway logs --service tokpulse-partner-app | grep -i "memory\|leak"

# Restart service
railway service restart tokpulse-partner-app
```

#### Bundle Size Issues
```bash
# Check bundle size
curl -s https://api.tokpulse.com/performance | jq '.metrics[] | select(.name == "bundle_size")'

# Rebuild with optimizations
pnpm build --analyze
```

---

## Database Issues

### Database Connection Problems

1. **Test Connection**
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Check Connection Pool**
   ```bash
   # Check active connections
   psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
   ```

3. **Restart Connection Pool**
   ```bash
   railway service restart tokpulse-partner-app
   ```

### Database Performance Issues

1. **Check Slow Queries**
   ```bash
   psql $DATABASE_URL -c "
   SELECT query, mean_time, calls, total_time 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;"
   ```

2. **Check Database Size**
   ```bash
   psql $DATABASE_URL -c "
   SELECT pg_size_pretty(pg_database_size(current_database()));"
   ```

3. **Check Index Usage**
   ```bash
   psql $DATABASE_URL -c "
   SELECT schemaname, tablename, attname, n_distinct, correlation 
   FROM pg_stats 
   WHERE schemaname = 'public' 
   ORDER BY n_distinct DESC;"
   ```

### Database Migration Issues

1. **Check Migration Status**
   ```bash
   pnpm db:migrate status
   ```

2. **Run Pending Migrations**
   ```bash
   pnpm db:migrate
   ```

3. **Rollback Migration**
   ```bash
   pnpm db:migrate rollback
   ```

---

## Authentication Issues

### User Login Problems

1. **Check Authentication Service**
   ```bash
   curl -f https://api.tokpulse.com/auth/health
   ```

2. **Check JWT Secret**
   ```bash
   # Verify JWT secret is set
   echo $JWT_SECRET | wc -c
   ```

3. **Check Session Storage**
   ```bash
   # Check Redis connection
   redis-cli -u $REDIS_URL ping
   ```

### Shopify OAuth Issues

1. **Check Shopify App Configuration**
   ```bash
   # Verify API keys are set
   echo $SHOPIFY_API_KEY
   echo $SHOPIFY_API_SECRET
   ```

2. **Test OAuth Flow**
   ```bash
   # Test OAuth endpoint
   curl -f https://api.tokpulse.com/auth/oauth
   ```

3. **Check Webhook Verification**
   ```bash
   # Test webhook endpoint
   curl -f https://api.tokpulse.com/webhooks/orders/create
   ```

---

## Billing Issues

### Stripe Integration Problems

1. **Check Stripe Connection**
   ```bash
   curl -f https://api.tokpulse.com/billing/health
   ```

2. **Test Stripe Webhooks**
   ```bash
   # Check webhook endpoint
   curl -f https://api.tokpulse.com/webhooks/stripe
   ```

3. **Check Stripe Configuration**
   ```bash
   # Verify Stripe keys are set
   echo $STRIPE_SECRET_KEY | cut -c1-10
   echo $STRIPE_WEBHOOK_SECRET | cut -c1-10
   ```

### Subscription Issues

1. **Check Subscription Status**
   ```bash
   # Query database for subscription issues
   psql $DATABASE_URL -c "
   SELECT id, status, plan_key, created_at 
   FROM subscriptions 
   WHERE status != 'ACTIVE' 
   ORDER BY created_at DESC 
   LIMIT 10;"
   ```

2. **Fix Subscription Status**
   ```bash
   # Update subscription status
   psql $DATABASE_URL -c "
   UPDATE subscriptions 
   SET status = 'ACTIVE' 
   WHERE id = 'subscription_id';"
   ```

---

## Deployment Issues

### Failed Deployments

1. **Check Deployment Status**
   ```bash
   railway service logs tokpulse-partner-app
   vercel logs
   ```

2. **Rollback Deployment**
   ```bash
   # Rollback Railway service
   railway service rollback tokpulse-partner-app
   
   # Rollback Vercel deployment
   vercel rollback
   ```

3. **Redeploy**
   ```bash
   # Trigger new deployment
   git commit --allow-empty -m "Trigger deployment"
   git push origin main
   ```

### Environment Variable Issues

1. **Check Environment Variables**
   ```bash
   railway variables
   vercel env ls
   ```

2. **Update Environment Variables**
   ```bash
   # Update Railway variables
   railway variables set KEY=value
   
   # Update Vercel variables
   vercel env add KEY
   ```

---

## Backup & Recovery

### Create Backup

1. **Full System Backup**
   ```bash
   node scripts/backup-system.mjs full
   ```

2. **Database Backup**
   ```bash
   node scripts/backup-system.mjs database
   ```

3. **Configuration Backup**
   ```bash
   node scripts/backup-system.mjs config
   ```

### Restore from Backup

1. **List Available Backups**
   ```bash
   node scripts/backup-system.mjs list
   ```

2. **Restore Backup**
   ```bash
   node scripts/backup-system.mjs restore backup-id
   ```

3. **Verify Restoration**
   ```bash
   curl -f https://api.tokpulse.com/health
   ```

---

## Security Incidents

### Suspected Security Breach

1. **Immediate Response**
   ```bash
   # Rotate all secrets
   railway variables set JWT_SECRET=$(openssl rand -hex 32)
   railway variables set SESSION_SECRET=$(openssl rand -hex 32)
   railway variables set ENCRYPTION_KEY=$(openssl rand -hex 32)
   ```

2. **Check Access Logs**
   ```bash
   # Check for suspicious activity
   railway logs --service tokpulse-partner-app | grep -i "unauthorized\|forbidden\|error"
   ```

3. **Revoke Compromised Tokens**
   ```bash
   # Clear all sessions
   redis-cli -u $REDIS_URL FLUSHDB
   ```

### Rate Limiting Issues

1. **Check Rate Limit Status**
   ```bash
   curl -s https://api.tokpulse.com/metrics | grep rate_limit
   ```

2. **Adjust Rate Limits**
   ```bash
   # Update rate limit configuration
   railway variables set RATE_LIMIT_MAX=200
   ```

---

## Customer Support

### Common Customer Issues

#### App Not Loading
1. Check if customer's store is connected
2. Verify Shopify app installation
3. Check theme compatibility
4. Clear browser cache

#### Recommendations Not Showing
1. Check if products are properly configured
2. Verify recommendation engine is working
3. Check theme integration
4. Test with different products

#### Billing Issues
1. Check subscription status
2. Verify payment method
3. Check usage limits
4. Process refund if needed

### Support Escalation

1. **Level 1: Basic Support**
   - Check documentation
   - Verify configuration
   - Clear cache/restart

2. **Level 2: Technical Support**
   - Check logs
   - Test integrations
   - Debug configuration

3. **Level 3: Engineering Support**
   - Code investigation
   - Database queries
   - System debugging

### Support Tools

1. **Customer Lookup**
   ```bash
   # Find customer by email
   psql $DATABASE_URL -c "
   SELECT * FROM users 
   WHERE email = 'customer@example.com';"
   ```

2. **Store Information**
   ```bash
   # Get store details
   psql $DATABASE_URL -c "
   SELECT * FROM stores 
   WHERE domain = 'store.myshopify.com';"
   ```

3. **Subscription Details**
   ```bash
   # Get subscription info
   psql $DATABASE_URL -c "
   SELECT s.*, u.email 
   FROM subscriptions s 
   JOIN users u ON s.user_id = u.id 
   WHERE u.email = 'customer@example.com';"
   ```

---

## Monitoring & Alerting

### Set Up Monitoring

1. **Health Check Monitoring**
   ```bash
   # Set up uptime monitoring
   curl -X POST "https://api.uptimerobot.com/v2/newMonitor" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "api_key=$UPTIMEROBOT_API_KEY&friendly_name=TokPulse API&url=https://api.tokpulse.com/health&type=1"
   ```

2. **Performance Monitoring**
   ```bash
   # Set up performance alerts
   curl -X POST "https://api.datadoghq.com/api/v1/monitor" \
     -H "Content-Type: application/json" \
     -H "DD-API-KEY: $DATADOG_API_KEY" \
     -d '{
       "name": "TokPulse Performance",
       "type": "metric alert",
       "query": "avg(last_5m):avg:tokpulse.api_response_time{*} > 500",
       "message": "API response time is high",
       "options": {
         "thresholds": {
           "critical": 500,
           "warning": 200
         }
       }
     }'
   ```

### Alert Response

1. **Critical Alerts (P0)**
   - Respond within 5 minutes
   - Check service status
   - Restart if necessary
   - Escalate if unresolved

2. **Warning Alerts (P1)**
   - Respond within 15 minutes
   - Investigate cause
   - Monitor for escalation
   - Document findings

3. **Info Alerts (P2)**
   - Respond within 1 hour
   - Review metrics
   - Update documentation
   - Plan improvements

---

## Maintenance Tasks

### Daily Tasks

1. **Check System Health**
   ```bash
   curl -s https://api.tokpulse.com/health | jq '.status'
   ```

2. **Review Error Logs**
   ```bash
   railway logs --service tokpulse-partner-app | grep -i error | tail -20
   ```

3. **Check Performance Metrics**
   ```bash
   curl -s https://api.tokpulse.com/performance/status | jq '.score'
   ```

### Weekly Tasks

1. **Review Security Logs**
   ```bash
   railway logs --service tokpulse-partner-app | grep -i "security\|auth\|unauthorized" | tail -50
   ```

2. **Check Database Performance**
   ```bash
   psql $DATABASE_URL -c "
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;"
   ```

3. **Update Dependencies**
   ```bash
   pnpm update
   pnpm audit
   ```

### Monthly Tasks

1. **Security Audit**
   ```bash
   pnpm audit --audit-level moderate
   npm audit fix
   ```

2. **Performance Review**
   ```bash
   curl -s https://api.tokpulse.com/performance | jq '.recommendations'
   ```

3. **Backup Verification**
   ```bash
   node scripts/backup-system.mjs list
   # Test restore from latest backup
   ```

---

## Emergency Contacts

- **Primary Support**: support@tokpulse.com
- **Emergency**: +1-555-TOKPULSE
- **Slack**: #incidents channel
- **Status Page**: https://status.tokpulse.com

---

## Quick Reference

### Common Commands
```bash
# Health check
curl -f https://api.tokpulse.com/health

# Restart service
railway service restart tokpulse-partner-app

# Check logs
railway logs --service tokpulse-partner-app

# Database query
psql $DATABASE_URL -c "SELECT 1"

# Create backup
node scripts/backup-system.mjs full

# Check performance
curl -s https://api.tokpulse.com/performance/status
```

### Important URLs
- **API Health**: https://api.tokpulse.com/health
- **Dashboard**: https://dashboard.tokpulse.com
- **Metrics**: https://api.tokpulse.com/metrics
- **Performance**: https://api.tokpulse.com/performance
- **Status Page**: https://status.tokpulse.com

---

*Last Updated: January 2025*
*Version: 1.0*