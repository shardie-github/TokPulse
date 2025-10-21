# Webhook Redelivery Runbook

This runbook provides step-by-step procedures for handling webhook redelivery issues in TokPulse.

## Overview

Webhook redelivery occurs when:
- Initial webhook processing fails
- Webhook endpoint is temporarily unavailable
- Processing timeout is exceeded
- Invalid webhook payload

## Prerequisites

- Access to TokPulse monitoring dashboard
- Access to webhook processing logs
- Understanding of webhook retry policies

## Quick Reference

| Issue | Severity | Response Time | Escalation |
|-------|----------|---------------|------------|
| High redelivery rate | High | 15 minutes | On-call engineer |
| Webhook endpoint down | Critical | 5 minutes | On-call engineer |
| Invalid payloads | Medium | 30 minutes | Support team |
| Processing delays | Medium | 30 minutes | Support team |

## Detection

### Monitoring Alerts

1. **High Redelivery Rate**
   - Alert: `tokpulse_webhook_redelivery_rate > 0.1`
   - Dashboard: Webhooks Health
   - Threshold: 10% redelivery rate

2. **Webhook Processing Failures**
   - Alert: `tokpulse_webhook_processed_total{status="error"} > 0`
   - Dashboard: Webhooks Health
   - Threshold: Any failures

3. **Queue Depth Increase**
   - Alert: `tokpulse_webhook_queue_depth > 1000`
   - Dashboard: Webhooks Health
   - Threshold: 1000 pending webhooks

### Manual Checks

```bash
# Check webhook processing metrics
curl -s http://localhost:9090/api/v1/query?query=tokpulse_webhook_processed_total

# Check redelivery rate
curl -s http://localhost:9090/api/v1/query?query=tokpulse_webhook_redelivery_rate

# Check queue depth
curl -s http://localhost:9090/api/v1/query?query=tokpulse_webhook_queue_depth
```

## Response Procedures

### 1. Initial Assessment (5 minutes)

**Check webhook endpoint status**:
```bash
# Test webhook endpoint
curl -I https://api.tokpulse.com/webhooks/shopify

# Check response time
curl -w "@curl-format.txt" -o /dev/null -s https://api.tokpulse.com/webhooks/shopify
```

**Review recent webhook logs**:
```bash
# Check for errors in last hour
grep "ERROR" logs/webhook.log | tail -20

# Check processing times
grep "webhook.*duration" logs/webhook.log | tail -20
```

**Identify affected stores**:
```bash
# Find stores with high error rates
curl -s "http://localhost:9090/api/v1/query?query=topk(10,rate(tokpulse_webhook_processed_total{status=\"error\"}[5m]))"
```

### 2. Root Cause Analysis (10 minutes)

**Check system resources**:
```bash
# CPU usage
top -p $(pgrep -f webhook)

# Memory usage
ps aux | grep webhook

# Disk space
df -h /var/log/tokpulse
```

**Check database connectivity**:
```bash
# Test database connection
curl -s http://localhost:3000/internal/health | jq .database

# Check connection pool
curl -s http://localhost:3000/internal/metrics | grep "db_connections"
```

**Review webhook payloads**:
```bash
# Check for malformed payloads
grep "Invalid payload" logs/webhook.log | tail -10

# Check payload size
grep "Payload size" logs/webhook.log | tail -10
```

### 3. Immediate Actions (5 minutes)

**If webhook endpoint is down**:
1. Check service status: `systemctl status tokpulse-webhook`
2. Restart service: `systemctl restart tokpulse-webhook`
3. Verify health: `curl http://localhost:3000/internal/health`

**If processing is slow**:
1. Check queue processing: `ps aux | grep queue`
2. Scale workers: `kubectl scale deployment webhook-workers --replicas=5`
3. Monitor queue depth: `watch -n 5 'curl -s http://localhost:9090/api/v1/query?query=tokpulse_webhook_queue_depth'`

**If database issues**:
1. Check database status: `systemctl status postgresql`
2. Check connection limits: `SELECT * FROM pg_stat_activity;`
3. Restart database if needed: `systemctl restart postgresql`

### 4. Recovery Actions (15 minutes)

**Process failed webhooks**:
```bash
# Retry failed webhooks
curl -X POST http://localhost:3000/internal/webhooks/retry \
  -H "Content-Type: application/json" \
  -d '{"storeId": "store_123", "hours": 1}'

# Check retry status
curl -s http://localhost:3000/internal/webhooks/retry/status
```

**Clear stuck webhooks**:
```bash
# Find stuck webhooks (processing > 5 minutes)
curl -X POST http://localhost:3000/internal/webhooks/clear-stuck \
  -H "Content-Type: application/json" \
  -d '{"timeout": 300}'
```

**Reprocess specific webhooks**:
```bash
# Reprocess webhooks for specific store
curl -X POST http://localhost:3000/internal/webhooks/reprocess \
  -H "Content-Type: application/json" \
  -d '{"storeId": "store_123", "topic": "orders/create"}'
```

### 5. Verification (10 minutes)

**Check metrics improvement**:
```bash
# Monitor redelivery rate
watch -n 30 'curl -s "http://localhost:9090/api/v1/query?query=tokpulse_webhook_redelivery_rate"'

# Check processing success rate
watch -n 30 'curl -s "http://localhost:9090/api/v1/query?query=rate(tokpulse_webhook_processed_total{status=\"success\"}[5m])"'
```

**Test webhook processing**:
```bash
# Send test webhook
curl -X POST https://api.tokpulse.com/webhooks/shopify \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: orders/create" \
  -d '{"test": true}'

# Verify processing
grep "Test webhook processed" logs/webhook.log
```

## Escalation Procedures

### Level 1: Support Team
- **When**: Redelivery rate > 5% for 15 minutes
- **Actions**: 
  - Follow response procedures
  - Document findings
  - Update status page

### Level 2: On-Call Engineer
- **When**: Redelivery rate > 10% for 10 minutes
- **Actions**:
  - Immediate response procedures
  - Coordinate with support team
  - Consider service restart

### Level 3: Engineering Manager
- **When**: Redelivery rate > 20% for 5 minutes
- **Actions**:
  - Escalate to engineering manager
  - Consider emergency procedures
  - Prepare incident report

## Prevention

### Monitoring Setup

1. **Set up alerts**:
   ```yaml
   # Prometheus alert rules
   - alert: HighWebhookRedeliveryRate
     expr: tokpulse_webhook_redelivery_rate > 0.1
     for: 5m
     labels:
       severity: warning
     annotations:
       summary: "High webhook redelivery rate detected"
   ```

2. **Configure dashboards**:
   - Webhook processing rate
   - Redelivery rate by store
   - Processing duration percentiles
   - Error rate by topic

### Regular Maintenance

1. **Weekly checks**:
   - Review webhook processing logs
   - Check queue depth trends
   - Verify retry policies
   - Update monitoring thresholds

2. **Monthly reviews**:
   - Analyze redelivery patterns
   - Review webhook payload sizes
   - Check processing performance
   - Update runbook procedures

## Rollback Procedures

### If webhook processing fails completely:

1. **Disable webhook processing**:
   ```bash
   # Set maintenance mode
   curl -X POST http://localhost:3000/internal/maintenance \
     -H "Content-Type: application/json" \
     -d '{"webhooks": true}'
   ```

2. **Queue webhooks for later processing**:
   ```bash
   # Enable queue-only mode
   curl -X POST http://localhost:3000/internal/webhooks/queue-only \
     -H "Content-Type: application/json" \
     -d '{"enabled": true}'
   ```

3. **Resume processing when fixed**:
   ```bash
   # Disable maintenance mode
   curl -X POST http://localhost:3000/internal/maintenance \
     -H "Content-Type: application/json" \
     -d '{"webhooks": false}'
   ```

## Post-Incident

### Immediate Actions (1 hour)

1. **Document incident**:
   - Root cause analysis
   - Timeline of events
   - Actions taken
   - Resolution time

2. **Update monitoring**:
   - Adjust alert thresholds
   - Add new monitoring points
   - Update dashboards

3. **Communicate status**:
   - Update status page
   - Notify affected customers
   - Send incident summary

### Follow-up Actions (1 week)

1. **Process queued webhooks**:
   ```bash
   # Process all queued webhooks
   curl -X POST http://localhost:3000/internal/webhooks/process-queue
   ```

2. **Review and improve**:
   - Update runbook procedures
   - Improve monitoring
   - Enhance error handling
   - Conduct post-mortem

## Contact Information

- **On-call engineer**: +1-555-0123
- **Support team**: support@tokpulse.com
- **Engineering manager**: eng-manager@tokpulse.com
- **Status page**: https://status.tokpulse.com

## Related Documentation

- [Webhook Processing Architecture](/docs/architecture/webhooks)
- [Monitoring Setup](/docs/observability/monitoring)
- [Database Operations](/docs/operations/database)
- [Incident Response](/docs/operations/incident-response)