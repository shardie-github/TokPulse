import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { RecommendationEngine, type Product, type RecommendationRequest } from './index.js';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize recommendation engine
const engine = new RecommendationEngine();

// Validation schemas
const ProductSchema = z.object({
  id: z.string(),
  shopId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()),
  category: z.string().optional(),
  price: z.number(),
  imageUrl: z.string().optional(),
  url: z.string(),
  createdAt: z.string().transform(str => new Date(str)),
  updatedAt: z.string().transform(str => new Date(str))
});

const RecommendationRequestSchema = z.object({
  productId: z.string(),
  limit: z.number().min(1).max(20).optional(),
  algorithm: z.string().optional(),
  exclude: z.array(z.string()).optional()
});

// Routes

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

/**
 * Add a product
 */
app.post('/products', async (req, res) => {
  try {
    const product = ProductSchema.parse(req.body);
    engine.addProduct(product);
    res.json({ success: true, productId: product.id });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid product data' 
    });
  }
});

/**
 * Add multiple products
 */
app.post('/products/batch', async (req, res) => {
  try {
    const products = z.array(ProductSchema).parse(req.body);
    engine.addProducts(products);
    res.json({ success: true, count: products.length });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid products data' 
    });
  }
});

/**
 * Get recommendations for a product
 */
app.get('/recommendations/:productId', (req, res) => {
  try {
    const request = RecommendationRequestSchema.parse({
      productId: req.params.productId,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      algorithm: req.query.algorithm as string,
      exclude: req.query.exclude ? (req.query.exclude as string).split(',') : undefined
    });
    
    const recommendations = engine.getRecommendations(request);
    res.json(recommendations);
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid request' 
    });
  }
});

/**
 * Track a click event
 */
app.post('/track/click', (req, res) => {
  try {
    const { productId, recommendationId, sessionId } = req.body;
    
    if (!productId || !recommendationId || !sessionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: productId, recommendationId, sessionId' 
      });
    }
    
    engine.trackClick({
      productId,
      recommendationId,
      sessionId,
      timestamp: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid click data' 
    });
  }
});

/**
 * Track a conversion event
 */
app.post('/track/conversion', (req, res) => {
  try {
    const { productId, recommendationId, orderId, value } = req.body;
    
    if (!productId || !recommendationId || !orderId || value === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: productId, recommendationId, orderId, value' 
      });
    }
    
    engine.trackConversion({
      productId,
      recommendationId,
      orderId,
      value: parseFloat(value),
      timestamp: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid conversion data' 
    });
  }
});

/**
 * Get analytics data
 */
app.get('/analytics', (req, res) => {
  try {
    const analytics = engine.getAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get analytics' 
    });
  }
});

/**
 * Get all products
 */
app.get('/products', (req, res) => {
  try {
    const products = engine.getAllProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get products' 
    });
  }
});

/**
 * Get a specific product
 */
app.get('/products/:id', (req, res) => {
  try {
    const product = engine.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get product' 
    });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Start server
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(port, () => {
    console.log(`Recommendation engine server running on port ${port}`);
  });
}

export default app;