// Webhook processing function for Shopify Oxygen
import { Request, Response } from '@shopify/oxygen';
import crypto from 'crypto';

export default async function webhooks(request: Request): Promise<Response> {
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Hmac-Sha256, X-Shopify-Topic, X-Shopify-Shop-Domain',
  };

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Get webhook headers
    const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256');
    const topicHeader = request.headers.get('X-Shopify-Topic');
    const shopHeader = request.headers.get('X-Shopify-Shop-Domain');
    const webhookId = request.headers.get('X-Shopify-Webhook-Id');

    if (!hmacHeader || !topicHeader || !shopHeader) {
      return new Response('Missing required headers', {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Verify webhook authenticity
    const body = await request.text();
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET;
    
    if (!secret) {
      throw new Error('Webhook secret not configured');
    }

    const hmac = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');

    if (hmac !== hmacHeader) {
      return new Response('Invalid HMAC', {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Parse webhook data
    const webhookData = JSON.parse(body);

    // Process webhook based on topic
    await processWebhook(topicHeader, webhookData, shopHeader, webhookId);

    return new Response('OK', {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Webhook processing failed',
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

async function processWebhook(
  topic: string,
  data: any,
  shop: string,
  webhookId: string | null
): Promise<void> {
  console.log(`Processing webhook: ${topic} for shop: ${shop}`);

  switch (topic) {
    case 'orders/create':
      await handleOrderCreate(data, shop);
      break;
    case 'orders/updated':
      await handleOrderUpdate(data, shop);
      break;
    case 'orders/paid':
      await handleOrderPaid(data, shop);
      break;
    case 'orders/cancelled':
      await handleOrderCancelled(data, shop);
      break;
    case 'products/create':
      await handleProductCreate(data, shop);
      break;
    case 'products/update':
      await handleProductUpdate(data, shop);
      break;
    case 'products/delete':
      await handleProductDelete(data, shop);
      break;
    case 'customers/create':
      await handleCustomerCreate(data, shop);
      break;
    case 'customers/update':
      await handleCustomerUpdate(data, shop);
      break;
    default:
      console.log(`Unhandled webhook topic: ${topic}`);
  }

  // Log webhook processing
  console.log(`Webhook ${webhookId} processed successfully for topic: ${topic}`);
}

async function handleOrderCreate(order: any, shop: string): Promise<void> {
  console.log(`New order created: ${order.id} for shop: ${shop}`);
  // Process order creation analytics
  // Update revenue metrics
  // Trigger notifications
}

async function handleOrderUpdate(order: any, shop: string): Promise<void> {
  console.log(`Order updated: ${order.id} for shop: ${shop}`);
  // Process order update analytics
  // Update order status metrics
}

async function handleOrderPaid(order: any, shop: string): Promise<void> {
  console.log(`Order paid: ${order.id} for shop: ${shop}`);
  // Process payment analytics
  // Update revenue metrics
  // Trigger success notifications
}

async function handleOrderCancelled(order: any, shop: string): Promise<void> {
  console.log(`Order cancelled: ${order.id} for shop: ${shop}`);
  // Process cancellation analytics
  // Update order metrics
}

async function handleProductCreate(product: any, shop: string): Promise<void> {
  console.log(`Product created: ${product.id} for shop: ${shop}`);
  // Process product creation analytics
  // Update product metrics
}

async function handleProductUpdate(product: any, shop: string): Promise<void> {
  console.log(`Product updated: ${product.id} for shop: ${shop}`);
  // Process product update analytics
  // Update product metrics
}

async function handleProductDelete(product: any, shop: string): Promise<void> {
  console.log(`Product deleted: ${product.id} for shop: ${shop}`);
  // Process product deletion analytics
  // Update product metrics
}

async function handleCustomerCreate(customer: any, shop: string): Promise<void> {
  console.log(`Customer created: ${customer.id} for shop: ${shop}`);
  // Process customer creation analytics
  // Update customer metrics
}

async function handleCustomerUpdate(customer: any, shop: string): Promise<void> {
  console.log(`Customer updated: ${customer.id} for shop: ${shop}`);
  // Process customer update analytics
  // Update customer metrics
}