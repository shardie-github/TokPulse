import { defineConfig } from '@shopify/hydrogen/config';

export default defineConfig({
  shopify: {
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN || 'your-store.myshopify.com',
    storefrontToken: process.env.SHOPIFY_STOREFRONT_TOKEN || '',
    storefrontApiVersion: '2024-10',
  },
  logger: {
    level: 'debug',
  },
  serverErrorPage: '/src/error.tsx',
  routes: {
    prefix: '/app',
  },
});