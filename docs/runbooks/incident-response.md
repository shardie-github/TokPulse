# TokPulse Incident Response Runbook

## Overview
This runbook provides step-by-step procedures for responding to incidents in the TokPulse application.

## Incident Classification

### P1 - Critical (Response: 15 minutes)
- Complete service outage
- Data loss or corruption
- Security breach
- Payment processing failure
- Database unavailable

### P2 - High (Response: 1 hour)
- Partial service degradation
- Performance issues affecting users
- Authentication failures
- Webhook processing failures

### P3 - Medium (Response: 4 hours)
- Non-critical feature failures
- Minor performance issues
- Non-urgent bugs

### P4 - Low (Response: 24 hours)
- Cosmetic issues
- Documentation updates
- Feature requests

## Incident Response Process

### 1. Detection and Initial Response

#### Automated Detection
- Monitor alerts from:
  - Health check endpoints (`/health`, `/ready`, `/live`)
  - Performance monitoring (`/performance/status`)
  - Error tracking (`/errors`)
  - Uptime monitoring (GitHub Actions)

#### Manual Detection
- User reports
- Support tickets
- Social media mentions
- Internal testing

#### Initial Response Steps
1. **Acknowledge the incident** within 15 minutes (P1) or 1 hour (P2)
2. **Create incident ticket** in GitHub Issues with label `incident`
3. **Assess severity** using classification above
4. **Notify stakeholders** via appropriate channels

### 2. Investigation and Diagnosis

#### Health Check Commands
```bash
# Check application health
curl -f https://your-domain.com/health

# Check readiness
curl -f https://your-domain.com/ready

# Check performance status
curl -f https://your-domain.com/performance/status

# Check error logs
curl -f https://your-domain.com/errors?limit=10
```

#### Database Health
```bash
# Check database connection
pnpm db:studio

# Check recent migrations
pnpm db:migrate status

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
```

#### System Resources
```bash
# Check memory usage
free -h

# Check disk space
df -h

# Check CPU usage
top

# Check running processes
ps aux | grep node
```

#### Log Analysis
```bash
# Check application logs
tail -f /var/log/tokpulse/app.log

# Check error logs
tail -f /var/log/tokpulse/error.log

# Check system logs
journalctl -u tokpulse -f
```

### 3. Containment and Mitigation

#### Service Restart
```bash
# Restart application
sudo systemctl restart tokpulse

# Check status
sudo systemctl status tokpulse

# Check logs
sudo journalctl -u tokpulse -f
```

#### Database Issues
```bash
# Restart database
sudo systemctl restart postgresql

# Check database status
sudo systemctl status postgresql

# Check connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Performance Issues
```bash
# Clear caches
redis-cli FLUSHALL

# Restart Redis
sudo systemctl restart redis

# Check Redis status
redis-cli ping
```

#### Security Issues
```bash
# Check for suspicious activity
grep -i "error\|fail\|denied" /var/log/tokpulse/app.log | tail -20

# Check authentication logs
grep -i "auth\|login\|token" /var/log/tokpulse/app.log | tail -20

# Check rate limiting
grep -i "rate.*limit" /var/log/tokpulse/app.log | tail -20
```

### 4. Resolution and Recovery

#### Code Issues
1. **Identify the problem** in code or configuration
2. **Create hotfix branch** from main
3. **Implement fix** with minimal changes
4. **Test fix** in staging environment
5. **Deploy fix** to production
6. **Verify resolution** with health checks

#### Infrastructure Issues
1. **Identify failing component** (database, cache, etc.)
2. **Check resource usage** (CPU, memory, disk)
3. **Scale resources** if needed
4. **Restart services** if necessary
5. **Verify recovery** with monitoring

#### Data Issues
1. **Assess data integrity** with database checks
2. **Restore from backup** if necessary
3. **Verify data consistency**
4. **Update affected users** if needed

### 5. Post-Incident Review

#### Immediate Actions (Within 24 hours)
1. **Document incident** in GitHub Issues
2. **Update stakeholders** on resolution
3. **Monitor for recurrence** for 48 hours
4. **Collect metrics** and logs

#### Root Cause Analysis (Within 72 hours)
1. **Analyze timeline** of events
2. **Identify root cause** using 5 Whys
3. **Document findings** in incident report
4. **Create action items** to prevent recurrence

#### Follow-up Actions (Within 1 week)
1. **Implement preventive measures**
2. **Update monitoring** and alerting
3. **Improve documentation** and runbooks
4. **Conduct team review** meeting

## Common Incident Scenarios

### Database Connection Issues
**Symptoms:** 500 errors, health checks failing
**Quick Fix:**
```bash
# Check database status
sudo systemctl status postgresql

# Restart database
sudo systemctl restart postgresql

# Check connection
psql $DATABASE_URL -c "SELECT 1;"
```

### High Memory Usage
**Symptoms:** Slow performance, out of memory errors
**Quick Fix:**
```bash
# Check memory usage
free -h

# Restart application
sudo systemctl restart tokpulse

# Check for memory leaks
ps aux | grep node
```

### Rate Limiting Issues
**Symptoms:** 429 errors, API calls failing
**Quick Fix:**
```bash
# Check rate limit logs
grep -i "rate.*limit" /var/log/tokpulse/app.log

# Clear rate limit cache
redis-cli FLUSHDB

# Restart application
sudo systemctl restart tokpulse
```

### Webhook Failures
**Symptoms:** Webhooks not processing, 500 errors
**Quick Fix:**
```bash
# Check webhook logs
grep -i "webhook" /var/log/tokpulse/app.log

# Check webhook queue
redis-cli LLEN webhook_queue

# Process failed webhooks
node scripts/process-failed-webhooks.mjs
```

## Communication Templates

### Initial Incident Notification
```
🚨 INCIDENT ALERT
Severity: P1/P2/P3/P4
Service: TokPulse
Status: Investigating
Impact: [Description of impact]
Started: [Timestamp]
Incident ID: [GitHub Issue #]
```

### Status Update
```
📊 INCIDENT UPDATE
Incident ID: [GitHub Issue #]
Status: [Investigating/Mitigating/Resolved]
Current Actions: [What we're doing]
ETA: [Expected resolution time]
Next Update: [When next update will be provided]
```

### Resolution Notification
```
✅ INCIDENT RESOLVED
Incident ID: [GitHub Issue #]
Duration: [Total time]
Root Cause: [Brief description]
Actions Taken: [What was done]
Prevention: [Steps to prevent recurrence]
```

## Escalation Procedures

### P1 Incidents
1. **Immediate notification** to on-call engineer
2. **Page engineering manager** within 15 minutes
3. **Notify CTO** if not resolved within 1 hour
4. **Update stakeholders** every 30 minutes

### P2 Incidents
1. **Notify on-call engineer** within 1 hour
2. **Page engineering manager** if not resolved within 4 hours
3. **Update stakeholders** every 2 hours

### P3/P4 Incidents
1. **Create ticket** and assign to appropriate team
2. **Update stakeholders** daily
3. **Escalate to manager** if not resolved within SLA

## Monitoring and Alerting

### Key Metrics to Monitor
- **Health checks:** `/health`, `/ready`, `/live`
- **Performance:** Response times, error rates
- **Database:** Connection count, query performance
- **Memory:** Usage, garbage collection
- **CPU:** Usage, load average
- **Disk:** Space, I/O operations

### Alert Thresholds
- **Health check failure:** Immediate alert
- **Error rate > 5%:** P2 alert
- **Response time > 2s:** P3 alert
- **Memory usage > 80%:** P2 alert
- **CPU usage > 90%:** P2 alert
- **Disk space < 20%:** P3 alert

### Notification Channels
- **P1/P2:** Slack #incidents, SMS, Phone
- **P3/P4:** Slack #alerts, Email
- **All:** GitHub Issues, Status page

## Recovery Procedures

### Complete Service Outage
1. **Check infrastructure** (servers, network, DNS)
2. **Verify database** connectivity and integrity
3. **Restart services** in correct order
4. **Verify functionality** with health checks
5. **Monitor for stability** for 1 hour

### Data Corruption
1. **Stop all writes** to database
2. **Assess damage** scope
3. **Restore from backup** if necessary
4. **Verify data integrity**
5. **Resume normal operations**

### Security Breach
1. **Isolate affected systems**
2. **Preserve evidence** (logs, snapshots)
3. **Assess damage** scope
4. **Implement containment** measures
5. **Notify security team** and stakeholders
6. **Follow security incident** procedures

## Prevention Measures

### Regular Maintenance
- **Weekly:** Review logs and metrics
- **Monthly:** Update dependencies
- **Quarterly:** Security audit
- **Annually:** Disaster recovery test

### Monitoring Improvements
- **Add new metrics** based on incidents
- **Tune alert thresholds** based on experience
- **Improve dashboards** for better visibility
- **Automate responses** where possible

### Documentation Updates
- **Update runbooks** after each incident
- **Add new scenarios** as they occur
- **Improve procedures** based on lessons learned
- **Share knowledge** with team

## Emergency Contacts

### Primary On-Call
- **Name:** [Primary Engineer]
- **Phone:** [Phone Number]
- **Email:** [Email]
- **Slack:** @[username]

### Secondary On-Call
- **Name:** [Secondary Engineer]
- **Phone:** [Phone Number]
- **Email:** [Email]
- **Slack:** @[username]

### Management Escalation
- **Engineering Manager:** [Name] - [Phone] - [Email]
- **CTO:** [Name] - [Phone] - [Email]
- **CEO:** [Name] - [Phone] - [Email]

### External Contacts
- **Hosting Provider:** [Support Contact]
- **Database Provider:** [Support Contact]
- **CDN Provider:** [Support Contact]
- **Security Team:** [Contact Information]