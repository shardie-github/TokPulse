# TokPulse - Enterprise Social Media Analytics for Shopify

A comprehensive social media analytics platform built with **Shopify Hydrogen**, **Oxygen Edge Functions**, and **GraphQL** to provide real-time insights and optimization for Shopify stores.

## 🚀 Key Features

### **Shopify Hydrogen Integration**
- **Modern React Framework**: Built with Shopify Hydrogen for optimal performance and SEO
- **Server-Side Rendering**: Fast initial page loads and better search engine visibility
- **Edge-Optimized**: Leverages Shopify's global CDN for lightning-fast delivery
- **Polaris Design System**: Native Shopify UI components for consistent user experience

### **Oxygen Edge Functions**
- **Global Edge Deployment**: Functions deployed to Shopify's global edge network
- **Real-time Analytics Processing**: Process social media data at the edge for instant insights
- **Webhook Handling**: Secure webhook processing for real-time data synchronization
- **Authentication**: OAuth and session management at the edge

### **Advanced GraphQL Implementation**
- **Shopify Storefront API**: Full integration with Shopify's GraphQL API
- **Real-time Data Fetching**: Apollo Client with caching and optimistic updates
- **Custom Mutations**: Create, update, and delete operations for products, orders, and customers
- **Type-Safe Queries**: Full TypeScript support with generated types

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Shopify App   │    │  Oxygen Edge     │    │  Social Media   │
│   (Hydrogen)    │◄──►│  Functions       │◄──►│  APIs           │
│                 │    │                  │    │                 │
│ • Dashboard     │    │ • Analytics      │    │ • Instagram     │
│ • Analytics     │    │ • Webhooks       │    │ • TikTok        │
│ • Settings      │    │ • Auth           │    │ • Facebook      │
│ • GraphQL       │    │ • Real-time      │    │ • Twitter       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

### **Frontend (Hydrogen)**
- **React 18** with TypeScript
- **Shopify Hydrogen** for SSR and edge optimization
- **Apollo Client** for GraphQL data management
- **Shopify Polaris** for UI components
- **Tailwind CSS** for styling
- **Framer Motion** for animations

### **Backend (Oxygen)**
- **Edge Functions** for serverless compute
- **GraphQL** for data querying and mutations
- **Webhook Processing** for real-time updates
- **Authentication** with Shopify OAuth

### **Data & Analytics**
- **Shopify Storefront API** for store data
- **Social Media APIs** for external data
- **Real-time Processing** with edge functions
- **Caching** with Apollo Client and Oxygen

## 📊 Analytics Capabilities

### **Real-time Dashboard**
- Live social media performance metrics
- Revenue tracking and conversion analysis
- Customer engagement insights
- Product performance analytics

### **Multi-Platform Integration**
- **Instagram**: Stories, posts, and reels analytics
- **TikTok**: Video performance and engagement
- **Facebook**: Page insights and ad performance
- **Twitter**: Tweet engagement and reach

### **Advanced Reporting**
- Custom date ranges and filters
- Export capabilities (CSV, PDF)
- Automated reports and alerts
- Trend analysis and predictions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Shopify CLI 3.50+
- Shopify Partner account
- Social media API credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tokpulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd packages/tokpulse-hydrogen
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Deployment to Oxygen

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to Oxygen**
   ```bash
   shopify app deploy
   ```

3. **Configure edge functions**
   ```bash
   # Deploy analytics function
   shopify app deploy --function=analytics
   
   # Deploy webhook function
   shopify app deploy --function=webhooks
   
   # Deploy auth function
   shopify app deploy --function=auth
   ```

## 🔧 Configuration

### **Shopify App Configuration**
```toml
# shopify.app.toml
name = "tokpulse"
client_id = "YOUR_CLIENT_ID"
application_url = "https://your-app-url.com"
embedded = true

[access_scopes]
scopes = "read_products,read_orders,read_customers,read_analytics,write_products,write_orders"

[auth]
redirect_urls = [
  "https://your-app-url.com/auth/callback",
  "https://your-app-url.com/auth/shopify/callback"
]

[webhooks]
api_version = "2024-10"
```

### **Oxygen Configuration**
```toml
# oxygen.config.toml
[build]
command = "npm run build"

[functions]
analytics = "src/functions/analytics.ts"
webhooks = "src/functions/webhooks.ts"
auth = "src/functions/auth.ts"

[env]
SHOPIFY_API_KEY = "{{ env.SHOPIFY_API_KEY }}"
SHOPIFY_STOREFRONT_TOKEN = "{{ env.SHOPIFY_STOREFRONT_TOKEN }}"
```

## 📈 GraphQL Schema

### **Core Queries**
```graphql
query GetShopInfo {
  shop {
    id
    name
    email
    domain
    currencyCode
    plan {
      displayName
      shopifyPlus
    }
  }
}

query GetProducts($first: Int!, $query: String) {
  products(first: $first, query: $query) {
    edges {
      node {
        id
        title
        handle
        description
        variants(first: 10) {
          edges {
            node {
              id
              title
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
}
```

### **Analytics Mutations**
```graphql
mutation CreateAnalyticsEvent($input: AnalyticsEventInput!) {
  createAnalyticsEvent(input: $input) {
    success
    eventId
    errors {
      field
      message
    }
  }
}
```

## 🔒 Security Features

- **OAuth 2.0** authentication with Shopify
- **JWT tokens** for secure API communication
- **CORS** configuration for cross-origin requests
- **Rate limiting** on edge functions
- **Input validation** and sanitization
- **Encrypted** sensitive data storage

## 📱 Mobile & PWA Support

- **Responsive design** for all screen sizes
- **Progressive Web App** capabilities
- **Offline support** with service workers
- **Push notifications** for important updates
- **Touch-optimized** interface

## 🧪 Testing

```bash
# Run TypeScript checks
npm run typecheck

# Run linting
npm run lint

# Run tests
npm run test

# Run all quality checks
npm run quality:check
```

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Integration Guide](./docs/INTEGRATIONS.md)
- [Security Guide](./docs/SECURITY.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run quality checks
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/tokpulse/issues)
- **Discord**: [Community Server](https://discord.gg/tokpulse)
- **Email**: support@tokpulse.com

---

**Built with ❤️ using Shopify Hydrogen, Oxygen, and GraphQL**