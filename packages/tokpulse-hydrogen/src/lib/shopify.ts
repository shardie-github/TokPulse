import { createApp } from '@shopify/app-bridge';
import { getSessionToken as getAppBridgeSessionToken } from '@shopify/app-bridge/utilities';

// Initialize Shopify App Bridge
export const app = createApp({
  apiKey: process.env.SHOPIFY_API_KEY || '',
  host: new URLSearchParams(window.location.search).get('host') || '',
});

// Get session token for authenticated requests
export async function getSessionToken(): Promise<string> {
  try {
    const token = await getAppBridgeSessionToken(app);
    return token;
  } catch (error) {
    console.error('Failed to get session token:', error);
    throw error;
  }
}

// Shopify API client for authenticated requests
export class ShopifyAPI {
  private baseURL: string;
  private accessToken: string;

  constructor(shopDomain: string, accessToken: string) {
    this.baseURL = `https://${shopDomain}/admin/api/2024-10`;
    this.accessToken = accessToken;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Products
  async getProducts(params: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    title?: string;
    vendor?: string;
    product_type?: string;
    collection_id?: string;
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
    published_at_min?: string;
    published_at_max?: string;
    published_status?: 'published' | 'unpublished' | 'any';
    status?: 'active' | 'archived' | 'draft';
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/products.json?${searchParams.toString()}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}.json`);
  }

  async createProduct(product: any) {
    return this.request('/products.json', {
      method: 'POST',
      body: JSON.stringify({ product }),
    });
  }

  async updateProduct(id: string, product: any) {
    return this.request(`/products/${id}.json`, {
      method: 'PUT',
      body: JSON.stringify({ product }),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}.json`, {
      method: 'DELETE',
    });
  }

  // Orders
  async getOrders(params: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    status?: 'open' | 'closed' | 'cancelled' | 'any';
    financial_status?: 'authorized' | 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'voided' | 'partially_refunded' | 'any';
    fulfillment_status?: 'fulfilled' | 'null' | 'partial' | 'restocked' | 'any';
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
    processed_at_min?: string;
    processed_at_max?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/orders.json?${searchParams.toString()}`);
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}.json`);
  }

  async updateOrder(id: string, order: any) {
    return this.request(`/orders/${id}.json`, {
      method: 'PUT',
      body: JSON.stringify({ order }),
    });
  }

  async cancelOrder(id: string, reason?: string) {
    return this.request(`/orders/${id}/cancel.json`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Customers
  async getCustomers(params: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/customers.json?${searchParams.toString()}`);
  }

  async getCustomer(id: string) {
    return this.request(`/customers/${id}.json`);
  }

  async createCustomer(customer: any) {
    return this.request('/customers.json', {
      method: 'POST',
      body: JSON.stringify({ customer }),
    });
  }

  async updateCustomer(id: string, customer: any) {
    return this.request(`/customers/${id}.json`, {
      method: 'PUT',
      body: JSON.stringify({ customer }),
    });
  }

  // Analytics
  async getAnalytics(params: {
    start_date?: string;
    end_date?: string;
    granularity?: 'day' | 'hour';
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/reports.json?${searchParams.toString()}`);
  }

  // Webhooks
  async getWebhooks() {
    return this.request('/webhooks.json');
  }

  async createWebhook(webhook: {
    topic: string;
    address: string;
    format?: 'json' | 'xml';
  }) {
    return this.request('/webhooks.json', {
      method: 'POST',
      body: JSON.stringify({ webhook }),
    });
  }

  async deleteWebhook(id: string) {
    return this.request(`/webhooks/${id}.json`, {
      method: 'DELETE',
    });
  }
}

// Utility functions
export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}