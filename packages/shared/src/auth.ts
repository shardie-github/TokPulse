import { createHmac } from 'crypto'

export interface AuthContext {
  organizationId: string
  storeId?: string
  userId?: string
  role: string
}

export function createSignedUrl(
  baseUrl: string,
  params: Record<string, string>,
  secret: string
): string {
  const url = new URL(baseUrl)
  
  // Add parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  
  // Add timestamp
  const timestamp = Date.now().toString()
  url.searchParams.set('timestamp', timestamp)
  
  // Create signature
  const signature = createHmac('sha256', secret)
    .update(url.searchParams.toString())
    .digest('hex')
  
  url.searchParams.set('signature', signature)
  
  return url.toString()
}

export function verifySignature(
  params: Record<string, string>,
  signature: string,
  secret: string,
  maxAge: number = 300000 // 5 minutes
): boolean {
  try {
    // Check timestamp
    const timestamp = parseInt(params.timestamp || '0')
    if (Date.now() - timestamp > maxAge) {
      return false
    }
    
    // Verify signature
    const { signature: _, ...paramsToSign } = params
    const urlParams = new URLSearchParams(paramsToSign)
    const expectedSignature = createHmac('sha256', secret)
      .update(urlParams.toString())
      .digest('hex')
    
    return signature === expectedSignature
  } catch {
    return false
  }
}