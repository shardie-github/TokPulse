import { experimentEngine } from '@tokpulse/experiments'
import { logger } from '@tokpulse/telemetry'

export interface EdgeWorkerRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}

export interface EdgeWorkerResponse {
  status: number
  headers: Record<string, string>
  body?: string
}

export interface ExperimentContext {
  orgId: string
  storeId?: string
  subjectKey: string
  experiments: string[]
}

/**
 * Extract subject key from request (customerId || sessionId || anonId)
 */
function extractSubjectKey(request: EdgeWorkerRequest): string {
  // Try to get from headers first
  const customerId = request.headers['x-customer-id']
  const sessionId = request.headers['x-session-id']
  const anonId = request.headers['x-anon-id']
  
  if (customerId) return customerId
  if (sessionId) return sessionId
  if (anonId) return anonId
  
  // Fallback to generating a session-based ID
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Extract organization and store context from request
 */
function extractContext(request: EdgeWorkerRequest): { orgId: string; storeId?: string } {
  const orgId = request.headers['x-org-id'] || 'unknown'
  const storeId = request.headers['x-store-id']
  
  return { orgId, storeId }
}

/**
 * Parse experiment assignments from cookies
 */
function parseExperimentCookies(cookieHeader: string): Map<string, string> {
  const assignments = new Map<string, string>()
  
  if (!cookieHeader) return assignments
  
  const cookies = cookieHeader.split(';').map(c => c.trim())
  
  for (const cookie of cookies) {
    if (cookie.startsWith('tp_xp_')) {
      const [key, value] = cookie.split('=', 2)
      const experimentKey = key.replace('tp_xp_', '')
      assignments.set(experimentKey, value)
    }
  }
  
  return assignments
}

/**
 * Generate experiment cookies
 */
function generateExperimentCookies(assignments: Map<string, { variantKey: string; maxAge: number }>): string[] {
  const cookies: string[] = []
  
  for (const [experimentKey, assignment] of assignments) {
    cookies.push(
      `tp_xp_${experimentKey}=${assignment.variantKey}; Max-Age=${assignment.maxAge}; SameSite=Lax; Path=/`
    )
  }
  
  return cookies
}

/**
 * Generate experiment headers for propagation
 */
function generateExperimentHeaders(assignments: Map<string, string>): Record<string, string> {
  const headers: Record<string, string> = {}
  
  if (assignments.size > 0) {
    const experimentData = Array.from(assignments.entries())
      .map(([key, variant]) => `${key}=${variant}`)
      .join(',')
    
    headers['X-TokPulse-XP'] = experimentData
  }
  
  return headers
}

/**
 * Main edge worker function
 */
export async function handleRequest(
  request: EdgeWorkerRequest,
  experiments: string[] = []
): Promise<EdgeWorkerResponse> {
  try {
    const { orgId, storeId } = extractContext(request)
    const subjectKey = extractSubjectKey(request)
    
    // Parse existing experiment assignments from cookies
    const existingAssignments = parseExperimentCookies(request.headers.cookie || '')
    
    // Get new assignments for requested experiments
    const newAssignments = new Map<string, { variantKey: string; maxAge: number }>()
    const assignmentHeaders = new Map<string, string>()
    
    for (const experimentKey of experiments) {
      // Skip if we already have an assignment for this experiment
      if (existingAssignments.has(experimentKey)) {
        assignmentHeaders.set(experimentKey, existingAssignments.get(experimentKey)!)
        continue
      }
      
      try {
        const assignment = await experimentEngine.getAssignment({
          orgId,
          storeId,
          subjectKey,
          experimentKey
        })
        
        if (assignment) {
          // Set cookie for 30 days
          newAssignments.set(experimentKey, {
            variantKey: assignment.variantKey,
            maxAge: 30 * 24 * 60 * 60 // 30 days
          })
          
          assignmentHeaders.set(experimentKey, assignment.variantKey)
          
          logger.info(`Edge worker assigned experiment`, {
            experimentKey,
            variantKey: assignment.variantKey,
            orgId,
            storeId,
            subjectKey
          })
        }
      } catch (error) {
        logger.error(`Failed to get assignment for experiment ${experimentKey}`, error as Error, {
          orgId,
          storeId,
          subjectKey
        })
      }
    }
    
    // Generate response headers
    const responseHeaders: Record<string, string> = {
      ...request.headers,
      ...generateExperimentHeaders(assignmentHeaders)
    }
    
    // Add new experiment cookies
    const newCookies = generateExperimentCookies(newAssignments)
    if (newCookies.length > 0) {
      responseHeaders['Set-Cookie'] = newCookies.join(', ')
    }
    
    return {
      status: 200,
      headers: responseHeaders,
      body: JSON.stringify({
        assignments: Object.fromEntries(assignmentHeaders),
        newAssignments: Object.fromEntries(newAssignments)
      })
    }
    
  } catch (error) {
    logger.error('Edge worker failed', error as Error, {
      url: request.url,
      method: request.method
    })
    
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Internal server error'
      })
    }
  }
}

/**
 * Cloudflare Workers handler
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    
    // Only handle experiment assignment requests
    if (url.pathname !== '/api/experiments/assign') {
      return new Response('Not found', { status: 404 })
    }
    
    const body = await request.text()
    const experimentRequest = JSON.parse(body)
    
    const edgeRequest: EdgeWorkerRequest = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body
    }
    
    const response = await handleRequest(edgeRequest, experimentRequest.experiments || [])
    
    return new Response(response.body, {
      status: response.status,
      headers: response.headers
    })
  }
}

/**
 * Vercel Edge Functions handler
 */
export async function vercelHandler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  
  if (url.pathname !== '/api/experiments/assign') {
    return new Response('Not found', { status: 404 })
  }
  
  const body = await request.text()
  const experimentRequest = JSON.parse(body)
  
  const edgeRequest: EdgeWorkerRequest = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body
  }
  
  const response = await handleRequest(edgeRequest, experimentRequest.experiments || [])
  
  return new Response(response.body, {
    status: response.status,
    headers: response.headers
  })
}