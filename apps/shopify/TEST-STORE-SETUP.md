# TokPulse Shopify Test Store Setup

## Test Store Information
- **Store URL**: https://shopify.com/store/jb4izh-tz
- **Store Domain**: jb4izh-tz.myshopify.com
- **App Name**: TokPulse
- **Version**: 0.1.0

## Quick Setup

1. **Run the setup script**:
   ```bash
   cd apps/shopify
   ./setup-test-store.sh
   ```

2. **Create a Shopify App**:
   - Go to [Shopify Partner Dashboard](https://partners.shopify.com/)
   - Create a new app
   - Set the app URL to your deployed app domain
   - Configure the following URLs:
     - **App URL**: `https://your-app-domain.com`
     - **Allowed redirection URLs**: `https://your-app-domain.com/api/shopify/callback`

3. **Update Environment Variables**:
   Edit `apps/shopify/.env` with your app credentials:
   ```env
   SHOPIFY_API_KEY=your_api_key_here
   SHOPIFY_API_SECRET=your_api_secret_here
   SHOPIFY_APP_URL=https://your-app-domain.com
   ```

4. **Configure Webhooks**:
   Set up the following webhook endpoints in your Shopify app:
   - **Orders**: `https://your-app-domain.com/api/shopify/webhook`
   - **Products**: `https://your-app-domain.com/api/shopify/webhook`

## App Scopes
The app requests the following permissions:
- `read_products` - Read product information
- `read_orders` - Read order information
- `read_customers` - Read customer information
- `read_analytics` - Read analytics data
- `write_products` - Modify product information
- `write_orders` - Modify order information

## API Endpoints
- **Install**: `GET /api/shopify/install?shop=jb4izh-tz.myshopify.com`
- **Callback**: `GET /api/shopify/callback`
- **Webhook**: `POST /api/shopify/webhook`
- **Health**: `GET /healthz`

## Testing the Connection

1. **Start the server**:
   ```bash
   cd apps/shopify
   npm start
   ```

2. **Test the install flow**:
   Visit: `http://localhost:3004/api/shopify/install?shop=jb4izh-tz.myshopify.com`

3. **Check health**:
   Visit: `http://localhost:3004/healthz`

## Store Access
To access the test store:
- **Store URL**: https://shopify.com/store/jb4izh-tz
- **Admin URL**: https://jb4izh-tz.myshopify.com/admin

## Troubleshooting

### Common Issues
1. **HMAC verification failed**: Check that your API secret is correct
2. **Invalid state**: Ensure cookies are enabled and the state parameter matches
3. **Webhook not received**: Verify the webhook URL is accessible and returns 200

### Logs
Check the logs in:
- `var/shopify/webhook-ids.json` - Webhook replay protection
- `private/shops.json.enc` - Encrypted store tokens

## Security Notes
- All store tokens are encrypted using the KMS key
- Webhook replay protection prevents duplicate processing
- HMAC verification ensures webhook authenticity
- CORS is configured for the test store domain