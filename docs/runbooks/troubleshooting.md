# TokPulse Troubleshooting Guide

## Quick Diagnostics

### Health Check Commands
```bash
# Basic health check
curl -f https://your-domain.com/health

# Detailed health status
curl -s https://your-domain.com/health | jq

# Readiness check
curl -f https://your-domain.com/ready

# Liveness check
curl -f https://your-domain.com/live

# Performance status
curl -s https://your-domain.com/performance/status | jq

# Security status
curl -s https://your-domain.com/security/status | jq
```

### Common Error Codes and Solutions

#### 500 Internal Server Error
**Possible Causes:**
- Database connection issues
- Memory exhaustion
- Unhandled exceptions
- Configuration errors

**Diagnosis:**
```bash
# Check application logs
tail -f /var/log/tokpulse/app.log

# Check error logs
tail -f /var/log/tokpulse/error.log

# Check system resources
free -h
df -h
top
```

**Solutions:**
1. **Database Issues:**
   ```bash
   # Check database status
   sudo systemctl status postgresql
   
   # Test connection
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Restart database
   sudo systemctl restart postgresql
   ```

2. **Memory Issues:**
   ```bash
   # Restart application
   sudo systemctl restart tokpulse
   
   # Check for memory leaks
   ps aux | grep node
   ```

3. **Configuration Issues:**
   ```bash
   # Check environment variables
   env | grep -E "(DATABASE|REDIS|SHOPIFY)"
   
   # Validate configuration
   node -e "console.log(require('./config'))"
   ```

#### 502 Bad Gateway
**Possible Causes:**
- Application not running
- Port conflicts
- Load balancer issues
- Network problems

**Diagnosis:**
```bash
# Check if application is running
sudo systemctl status tokpulse

# Check port usage
netstat -tlnp | grep :3000

# Check process
ps aux | grep node
```

**Solutions:**
1. **Restart Application:**
   ```bash
   sudo systemctl restart tokpulse
   sudo systemctl status tokpulse
   ```

2. **Check Port Conflicts:**
   ```bash
   # Find process using port 3000
   lsof -i :3000
   
   # Kill conflicting process
   sudo kill -9 <PID>
   ```

#### 503 Service Unavailable
**Possible Causes:**
- Health checks failing
- Resource exhaustion
- Maintenance mode
- Load balancer issues

**Diagnosis:**
```bash
# Check health endpoints
curl -v https://your-domain.com/health
curl -v https://your-domain.com/ready

# Check system resources
htop
iostat -x 1
```

**Solutions:**
1. **Resource Issues:**
   ```bash
   # Free up memory
   sudo sync
   echo 3 | sudo tee /proc/sys/vm/drop_caches
   
   # Restart services
   sudo systemctl restart tokpulse
   ```

2. **Health Check Issues:**
   ```bash
   # Check specific health checks
   curl -s https://your-domain.com/health | jq '.checks'
   ```

#### 429 Too Many Requests
**Possible Causes:**
- Rate limiting triggered
- API quota exceeded
- DDoS attack
- Misconfigured rate limits

**Diagnosis:**
```bash
# Check rate limit logs
grep -i "rate.*limit" /var/log/tokpulse/app.log

# Check Redis for rate limit data
redis-cli KEYS "*rate*"
redis-cli GET "rate_limit:user:123"
```

**Solutions:**
1. **Clear Rate Limits:**
   ```bash
   # Clear specific user rate limit
   redis-cli DEL "rate_limit:user:123"
   
   # Clear all rate limits
   redis-cli FLUSHDB
   ```

2. **Adjust Rate Limits:**
   ```bash
   # Update rate limit configuration
   # Edit environment variables or configuration file
   ```

## Performance Issues

### Slow Response Times
**Diagnosis:**
```bash
# Check performance metrics
curl -s https://your-domain.com/performance | jq

# Check database performance
psql $DATABASE_URL -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check memory usage
free -h
ps aux --sort=-%mem | head -10
```

**Solutions:**
1. **Database Optimization:**
   ```bash
   # Analyze slow queries
   psql $DATABASE_URL -c "SELECT query, mean_time, calls FROM pg_stat_statements WHERE mean_time > 1000 ORDER BY mean_time DESC;"
   
   # Check database size
   psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
   
   # Vacuum database
   psql $DATABASE_URL -c "VACUUM ANALYZE;"
   ```

2. **Memory Optimization:**
   ```bash
   # Check for memory leaks
   node --inspect=0.0.0.0:9229 apps/partner-app/dist/server.js
   
   # Monitor garbage collection
   node --trace-gc apps/partner-app/dist/server.js
   ```

3. **Caching Issues:**
   ```bash
   # Check Redis status
   redis-cli ping
   
   # Check cache hit rate
   redis-cli info stats | grep keyspace
   
   # Clear caches
   redis-cli FLUSHALL
   ```

### High Memory Usage
**Diagnosis:**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Check Node.js memory
node -e "console.log(process.memoryUsage())"
```

**Solutions:**
1. **Restart Application:**
   ```bash
   sudo systemctl restart tokpulse
   ```

2. **Check for Memory Leaks:**
   ```bash
   # Use heap profiler
   node --inspect=0.0.0.0:9229 apps/partner-app/dist/server.js
   
   # Generate heap snapshot
   curl -X POST http://localhost:9229/json/v8/heapSnapshot
   ```

3. **Optimize Memory Settings:**
   ```bash
   # Increase heap size
   export NODE_OPTIONS="--max-old-space-size=4096"
   
   # Enable garbage collection logging
   export NODE_OPTIONS="--trace-gc --trace-gc-verbose"
   ```

### High CPU Usage
**Diagnosis:**
```bash
# Check CPU usage
top
htop

# Check Node.js CPU usage
node -e "console.log(process.cpuUsage())"
```

**Solutions:**
1. **Identify CPU-intensive operations:**
   ```bash
   # Profile CPU usage
   node --prof apps/partner-app/dist/server.js
   
   # Analyze profile
   node --prof-process isolate-*.log
   ```

2. **Optimize code:**
   - Review database queries
   - Optimize algorithms
   - Add caching
   - Use worker threads for CPU-intensive tasks

## Database Issues

### Connection Problems
**Diagnosis:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check database status
sudo systemctl status postgresql
```

**Solutions:**
1. **Restart Database:**
   ```bash
   sudo systemctl restart postgresql
   ```

2. **Check Connection Limits:**
   ```bash
   # Check max connections
   psql $DATABASE_URL -c "SHOW max_connections;"
   
   # Check current connections
   psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
   ```

3. **Check Database Logs:**
   ```bash
   # Check PostgreSQL logs
   sudo tail -f /var/log/postgresql/postgresql-*.log
   ```

### Query Performance Issues
**Diagnosis:**
```bash
# Check slow queries
psql $DATABASE_URL -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check table sizes
psql $DATABASE_URL -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

**Solutions:**
1. **Add Indexes:**
   ```bash
   # Analyze query performance
   psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';"
   
   # Create indexes
   psql $DATABASE_URL -c "CREATE INDEX CONCURRENTLY idx_users_email ON users(email);"
   ```

2. **Optimize Queries:**
   - Use EXPLAIN ANALYZE to identify bottlenecks
   - Add appropriate indexes
   - Optimize query structure
   - Use connection pooling

### Data Corruption
**Diagnosis:**
```bash
# Check database integrity
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check for errors
psql $DATABASE_URL -c "SELECT * FROM pg_stat_database WHERE datname = current_database();"
```

**Solutions:**
1. **Repair Database:**
   ```bash
   # Reindex database
   psql $DATABASE_URL -c "REINDEX DATABASE tokpulse;"
   
   # Vacuum and analyze
   psql $DATABASE_URL -c "VACUUM FULL ANALYZE;"
   ```

2. **Restore from Backup:**
   ```bash
   # List available backups
   node scripts/backup-system.mjs list
   
   # Restore from backup
   node scripts/backup-system.mjs restore <backup-id>
   ```

## Authentication Issues

### Login Failures
**Diagnosis:**
```bash
# Check authentication logs
grep -i "auth\|login\|token" /var/log/tokpulse/app.log | tail -20

# Check JWT configuration
env | grep JWT
```

**Solutions:**
1. **Check JWT Secret:**
   ```bash
   # Verify JWT secret is set
   echo $JWT_SECRET
   
   # Test JWT generation
   node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({test: true}, process.env.JWT_SECRET));"
   ```

2. **Check Session Configuration:**
   ```bash
   # Verify session secret
   echo $SESSION_SECRET
   
   # Check Redis connection
   redis-cli ping
   ```

### Token Expiration Issues
**Diagnosis:**
```bash
# Check token expiration logs
grep -i "token.*expir\|jwt.*expir" /var/log/tokpulse/app.log | tail -20
```

**Solutions:**
1. **Check Token Configuration:**
   ```bash
   # Verify JWT expiration settings
   grep -i "jwt.*expir" .env
   ```

2. **Refresh Token Logic:**
   - Check refresh token implementation
   - Verify token rotation logic
   - Check token storage

## Webhook Issues

### Webhook Failures
**Diagnosis:**
```bash
# Check webhook logs
grep -i "webhook" /var/log/tokpulse/app.log | tail -20

# Check webhook queue
redis-cli LLEN webhook_queue

# Check failed webhooks
redis-cli LRANGE webhook_failed 0 -1
```

**Solutions:**
1. **Process Failed Webhooks:**
   ```bash
   # Retry failed webhooks
   node scripts/process-failed-webhooks.mjs
   
   # Clear failed webhook queue
   redis-cli DEL webhook_failed
   ```

2. **Check Webhook Configuration:**
   ```bash
   # Verify webhook URLs
   grep -i "webhook.*url" .env
   
   # Check webhook secrets
   grep -i "webhook.*secret" .env
   ```

### Webhook Signature Verification
**Diagnosis:**
```bash
# Check signature verification logs
grep -i "signature.*verif\|webhook.*sign" /var/log/tokpulse/app.log | tail -20
```

**Solutions:**
1. **Verify Webhook Secrets:**
   ```bash
   # Check webhook secret configuration
   echo $SHOPIFY_WEBHOOK_SECRET
   echo $STRIPE_WEBHOOK_SECRET
   ```

2. **Test Webhook Signatures:**
   ```bash
   # Test webhook signature verification
   node scripts/test-webhook-signature.mjs
   ```

## Monitoring and Alerting Issues

### Health Check Failures
**Diagnosis:**
```bash
# Check health check logs
curl -v https://your-domain.com/health

# Check individual health checks
curl -s https://your-domain.com/health | jq '.checks'
```

**Solutions:**
1. **Fix Failing Checks:**
   - Database connectivity issues
   - External service dependencies
   - Resource constraints

2. **Update Health Check Configuration:**
   - Adjust thresholds
   - Add new checks
   - Remove obsolete checks

### Alert Configuration
**Diagnosis:**
```bash
# Check alert configuration
grep -i "alert\|notification" /etc/tokpulse/monitoring.conf
```

**Solutions:**
1. **Update Alert Rules:**
   - Adjust thresholds
   - Add new alerts
   - Configure notification channels

2. **Test Alert System:**
   ```bash
   # Test alert configuration
   node scripts/test-alerts.mjs
   ```

## Log Analysis

### Common Log Patterns
```bash
# Error patterns
grep -i "error\|exception\|fail" /var/log/tokpulse/app.log | tail -20

# Performance patterns
grep -i "slow\|timeout\|latency" /var/log/tokpulse/app.log | tail -20

# Security patterns
grep -i "auth\|security\|attack" /var/log/tokpulse/app.log | tail -20
```

### Log Rotation
```bash
# Check log rotation configuration
cat /etc/logrotate.d/tokpulse

# Manual log rotation
sudo logrotate -f /etc/logrotate.d/tokpulse

# Check log file sizes
ls -lh /var/log/tokpulse/
```

## Recovery Procedures

### Complete Service Recovery
1. **Stop all services:**
   ```bash
   sudo systemctl stop tokpulse
   sudo systemctl stop postgresql
   sudo systemctl stop redis
   ```

2. **Check system resources:**
   ```bash
   free -h
   df -h
   ```

3. **Start services in order:**
   ```bash
   sudo systemctl start postgresql
   sudo systemctl start redis
   sudo systemctl start tokpulse
   ```

4. **Verify functionality:**
   ```bash
   curl -f https://your-domain.com/health
   ```

### Data Recovery
1. **Stop application:**
   ```bash
   sudo systemctl stop tokpulse
   ```

2. **Restore from backup:**
   ```bash
   node scripts/backup-system.mjs restore <backup-id>
   ```

3. **Verify data integrity:**
   ```bash
   psql $DATABASE_URL -c "SELECT count(*) FROM users;"
   ```

4. **Restart application:**
   ```bash
   sudo systemctl start tokpulse
   ```

## Prevention Measures

### Regular Maintenance
- **Daily:** Check logs and metrics
- **Weekly:** Review performance and errors
- **Monthly:** Update dependencies and security patches
- **Quarterly:** Full system audit

### Monitoring Improvements
- Add new metrics based on issues
- Tune alert thresholds
- Improve dashboards
- Automate responses

### Documentation Updates
- Update runbooks after incidents
- Add new troubleshooting scenarios
- Improve procedures based on experience
- Share knowledge with team