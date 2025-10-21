# DLQ (Dead Letter Queue) Drain Runbook

This runbook provides procedures for handling and draining dead letter queues in TokPulse.

## Overview

Dead Letter Queues (DLQ) contain messages that:
- Failed processing after maximum retries
- Have invalid payloads
- Exceeded processing timeouts
- Caused processing errors

## Prerequisites

- Access to message queue system (Redis/RabbitMQ)
- Access to DLQ monitoring tools
- Understanding of message processing patterns

## Quick Reference

| Issue | Severity | Response Time | Escalation |
|-------|----------|---------------|------------|
| DLQ depth > 1000 | High | 30 minutes | On-call engineer |
| DLQ growth rate > 100/min | Critical | 15 minutes | On-call engineer |
| Processing failures | Medium | 1 hour | Support team |
| Message corruption | Medium | 1 hour | Support team |

## Detection

### Monitoring Alerts

1. **DLQ Depth Alert**
   - Metric: `tokpulse_dlq_depth`
   - Threshold: > 1000 messages
   - Dashboard: Jobs & Queues

2. **DLQ Growth Rate**
   - Metric: `rate(tokpulse_dlq_messages_total[5m])`
   - Threshold: > 100 messages/minute
   - Dashboard: Jobs & Queues

3. **Processing Failures**
   - Metric: `tokpulse_job_attempts_total{status="failed"}`
   - Threshold: > 50 failures/hour
   - Dashboard: Jobs & Queues

### Manual Checks

```bash
# Check DLQ depth
curl -s http://localhost:9090/api/v1/query?query=tokpulse_dlq_depth

# Check DLQ growth rate
curl -s http://localhost:9090/api/v1/query?query=rate(tokpulse_dlq_messages_total[5m])

# Check failed jobs
curl -s http://localhost:9090/api/v1/query?query=tokpulse_job_attempts_total{status="failed"}
```

## Response Procedures

### 1. Initial Assessment (10 minutes)

**Check DLQ status**:
```bash
# Connect to Redis
redis-cli -h localhost -p 6379

# Check DLQ length
LLEN tokpulse:dlq:webhooks
LLEN tokpulse:dlq:jobs
LLEN tokpulse:dlq:experiments

# Check oldest messages
LRANGE tokpulse:dlq:webhooks 0 4
```

**Review error patterns**:
```bash
# Check error logs
grep "DLQ" logs/application.log | tail -20

# Check job failure reasons
grep "Job failed" logs/jobs.log | tail -20
```

**Identify affected message types**:
```bash
# Count messages by type
redis-cli -h localhost -p 6379 --eval "
  local messages = redis.call('LRANGE', 'tokpulse:dlq:webhooks', 0, -1)
  local types = {}
  for i, msg in ipairs(messages) do
    local msgType = cjson.decode(msg).type
    types[msgType] = (types[msgType] or 0) + 1
  end
  return types
"
```

### 2. Root Cause Analysis (20 minutes)

**Check message content**:
```bash
# Get sample messages
redis-cli -h localhost -p 6379 LRANGE tokpulse:dlq:webhooks 0 9

# Check for common issues
grep -E "(Invalid JSON|Schema validation|Timeout)" logs/application.log
```

**Check processing capacity**:
```bash
# Check worker status
ps aux | grep worker

# Check queue processing rate
curl -s http://localhost:9090/api/v1/query?query=rate(tokpulse_job_processed_total[5m])

# Check system resources
top -p $(pgrep -f worker)
```

**Review recent changes**:
```bash
# Check deployment history
git log --oneline --since="1 day ago"

# Check configuration changes
git diff HEAD~1 config/
```

### 3. Immediate Actions (15 minutes)

**If DLQ is growing rapidly**:
1. **Scale workers**:
   ```bash
   # Scale webhook workers
   kubectl scale deployment webhook-workers --replicas=10
   
   # Scale job workers
   kubectl scale deployment job-workers --replicas=5
   ```

2. **Increase processing capacity**:
   ```bash
   # Increase worker concurrency
   curl -X POST http://localhost:3000/internal/workers/config \
     -H "Content-Type: application/json" \
     -d '{"concurrency": 20}'
   ```

**If messages are corrupted**:
1. **Stop processing corrupted messages**:
   ```bash
   # Move corrupted messages to quarantine
   redis-cli -h localhost -p 6379 --eval "
     local corrupted = {}
     local messages = redis.call('LRANGE', 'tokpulse:dlq:webhooks', 0, -1)
     for i, msg in ipairs(messages) do
       if not pcall(cjson.decode, msg) then
         table.insert(corrupted, msg)
         redis.call('LREM', 'tokpulse:dlq:webhooks', 1, msg)
       end
     end
     for i, msg in ipairs(corrupted) do
       redis.call('LPUSH', 'tokpulse:quarantine', msg)
     end
     return #corrupted
   "
   ```

**If processing is failing**:
1. **Check and fix processing errors**:
   ```bash
   # Review error logs
   tail -f logs/workers.log | grep ERROR
   
   # Check database connectivity
   curl -s http://localhost:3000/internal/health
   ```

### 4. DLQ Drain Procedures (30 minutes)

**Gradual drain approach**:
```bash
# Process DLQ in batches
for i in {1..10}; do
  echo "Processing batch $i"
  
  # Process 100 messages at a time
  redis-cli -h localhost -p 6379 --eval "
    local processed = 0
    for i = 1, 100 do
      local msg = redis.call('RPOP', 'tokpulse:dlq:webhooks')
      if not msg then break end
      
      -- Reprocess message
      redis.call('LPUSH', 'tokpulse:webhooks', msg)
      processed = processed + 1
    end
    return processed
  "
  
  # Wait between batches
  sleep 30
done
```

**Selective drain by message type**:
```bash
# Process only specific message types
redis-cli -h localhost -p 6379 --eval "
  local targetType = 'webhook'
  local processed = 0
  local messages = redis.call('LRANGE', 'tokpulse:dlq:webhooks', 0, -1)
  
  for i, msg in ipairs(messages) do
    local decoded = cjson.decode(msg)
    if decoded.type == targetType then
      redis.call('LREM', 'tokpulse:dlq:webhooks', 1, msg)
      redis.call('LPUSH', 'tokpulse:webhooks', msg)
      processed = processed + 1
    end
  end
  
  return processed
"
```

**Manual message inspection**:
```bash
# Inspect individual messages
redis-cli -h localhost -p 6379 LRANGE tokpulse:dlq:webhooks 0 0 | jq .

# Fix and reprocess specific message
redis-cli -h localhost -p 6379 --eval "
  local msg = redis.call('RPOP', 'tokpulse:dlq:webhooks')
  if msg then
    -- Fix message if needed
    local decoded = cjson.decode(msg)
    decoded.retryCount = 0
    local fixed = cjson.encode(decoded)
    
    -- Reprocess
    redis.call('LPUSH', 'tokpulse:webhooks', fixed)
    return 'Reprocessed: ' .. msg
  end
  return 'No messages'
"
```

### 5. Verification (15 minutes)

**Monitor drain progress**:
```bash
# Watch DLQ depth decrease
watch -n 10 'redis-cli -h localhost -p 6379 LLEN tokpulse:dlq:webhooks'

# Check processing success rate
watch -n 30 'curl -s "http://localhost:9090/api/v1/query?query=rate(tokpulse_job_processed_total{status=\"success\"}[5m])"'
```

**Verify message processing**:
```bash
# Check that messages are being processed
grep "Message processed successfully" logs/workers.log | tail -10

# Check for new errors
grep "ERROR" logs/workers.log | tail -10
```

## Escalation Procedures

### Level 1: Support Team
- **When**: DLQ depth > 1000 messages
- **Actions**:
  - Follow drain procedures
  - Monitor progress
  - Document findings

### Level 2: On-Call Engineer
- **When**: DLQ growth rate > 100/min
- **Actions**:
  - Immediate drain procedures
  - Scale processing capacity
  - Investigate root cause

### Level 3: Engineering Manager
- **When**: DLQ depth > 10000 messages
- **Actions**:
  - Emergency procedures
  - Consider service restart
  - Prepare incident report

## Prevention

### Monitoring Setup

1. **DLQ Depth Monitoring**:
   ```yaml
   # Prometheus alert rules
   - alert: HighDLQDepth
     expr: tokpulse_dlq_depth > 1000
     for: 5m
     labels:
       severity: warning
     annotations:
       summary: "High DLQ depth detected"
   ```

2. **Processing Rate Monitoring**:
   ```yaml
   - alert: LowProcessingRate
     expr: rate(tokpulse_job_processed_total[5m]) < 10
     for: 10m
     labels:
       severity: critical
     annotations:
       summary: "Low job processing rate"
   ```

### Regular Maintenance

1. **Daily checks**:
   - Monitor DLQ depth
   - Check processing rates
   - Review error logs
   - Verify worker health

2. **Weekly reviews**:
   - Analyze DLQ patterns
   - Review message types
   - Check processing performance
   - Update monitoring thresholds

## Rollback Procedures

### If drain causes issues:

1. **Stop drain process**:
   ```bash
   # Stop all workers
   kubectl scale deployment webhook-workers --replicas=0
   kubectl scale deployment job-workers --replicas=0
   ```

2. **Restore DLQ state**:
   ```bash
   # Move processed messages back to DLQ
   redis-cli -h localhost -p 6379 --eval "
     local count = 0
     while true do
       local msg = redis.call('RPOP', 'tokpulse:webhooks')
       if not msg then break end
       redis.call('LPUSH', 'tokpulse:dlq:webhooks', msg)
       count = count + 1
     end
     return count
   "
   ```

3. **Restart workers**:
   ```bash
   # Restart with original configuration
   kubectl scale deployment webhook-workers --replicas=3
   kubectl scale deployment job-workers --replicas=2
   ```

## Post-Incident

### Immediate Actions (1 hour)

1. **Document incident**:
   - Root cause analysis
   - Messages processed
   - Actions taken
   - Resolution time

2. **Update monitoring**:
   - Adjust alert thresholds
   - Add DLQ monitoring
   - Update dashboards

3. **Communicate status**:
   - Update status page
   - Notify affected customers
   - Send incident summary

### Follow-up Actions (1 week)

1. **Process remaining DLQ**:
   ```bash
   # Continue processing remaining messages
   while [ $(redis-cli -h localhost -p 6379 LLEN tokpulse:dlq:webhooks) -gt 0 ]; do
     echo "Processing remaining messages..."
     # Run drain procedure
     sleep 60
   done
   ```

2. **Review and improve**:
   - Update drain procedures
   - Improve error handling
   - Enhance monitoring
   - Conduct post-mortem

## Contact Information

- **On-call engineer**: +1-555-0123
- **Support team**: support@tokpulse.com
- **Engineering manager**: eng-manager@tokpulse.com
- **Status page**: https://status.tokpulse.com

## Related Documentation

- [Message Queue Architecture](/docs/architecture/queues)
- [Job Processing](/docs/operations/jobs)
- [Monitoring Setup](/docs/observability/monitoring)
- [Redis Operations](/docs/operations/redis)