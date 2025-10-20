// Authentication function for Shopify Oxygen
import { Request, Response } from '@shopify/oxygen';
import crypto from 'crypto';

export default async function auth(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const action = url.searchParams.get('action');

    switch (action) {
      case 'install':
        return handleInstall(request, corsHeaders);
      case 'callback':
        return handleCallback(request, corsHeaders);
      case 'verify':
        return handleVerify(request, corsHeaders);
      default:
        return new Response('Invalid action', {
          status: 400,
          headers: corsHeaders,
        });
    }
  } catch (error) {
    console.error('Auth function error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}

async function handleInstall(request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');

  if (!shop) {
    return new Response('Shop parameter is required', {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Validate shop domain
  if (!shop.includes('.myshopify.com')) {
    return new Response('Invalid shop domain', {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Generate state parameter for security
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store state in session/cache for verification
  // In production, use a proper session store
  console.log(`Storing state for shop ${shop}: ${state}`);

  // Build OAuth URL
  const apiKey = process.env.SHOPIFY_API_KEY;
  const scopes = process.env.SHOPIFY_SCOPES || 'read_products,read_orders';
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/auth/callback`;
  
  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set('client_id', apiKey || '');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  return new Response(JSON.stringify({ 
    authUrl: authUrl.toString(),
    state 
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

async function handleCallback(request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const shop = url.searchParams.get('shop');
  const hmac = url.searchParams.get('hmac');

  if (!code || !state || !shop || !hmac) {
    return new Response('Missing required parameters', {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Verify HMAC
  const queryString = url.search;
  const params = new URLSearchParams(queryString);
  params.delete('hmac');
  const message = params.toString();
  
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    throw new Error('API secret not configured');
  }

  const calculatedHmac = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  if (calculatedHmac !== hmac) {
    return new Response('Invalid HMAC', {
      status: 401,
      headers: corsHeaders,
    });
  }

  // Verify state parameter
  // In production, retrieve from session store
  console.log(`Verifying state for shop ${shop}: ${state}`);

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    
    // Store access token securely
    // In production, store in database with encryption
    console.log(`Access token obtained for shop ${shop}`);

    return new Response(JSON.stringify({ 
      success: true,
      accessToken: tokenData.access_token,
      scope: tokenData.scope,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Token exchange failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}

async function handleVerify(request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Missing or invalid authorization header', {
      status: 401,
      headers: corsHeaders,
    });
  }

  const token = authHeader.substring(7);
  
  // Verify token (in production, use proper JWT verification)
  // For now, just check if it exists
  if (!token) {
    return new Response('Invalid token', {
      status: 401,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ 
    valid: true,
    message: 'Token is valid'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}