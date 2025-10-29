import type { 
  Product, 
  Recommendation, 
  RecommendationRequest, 
  RecommendationResponse,
  ClickEvent,
  ConversionEvent,
  Analytics
} from './types.js';
import { calculateSimilarity, generateReason } from './similarity.js';

export class RecommendationEngine {
  private products: Map<string, Product> = new Map();
  private events: ClickEvent[] = [];
  private conversions: ConversionEvent[] = [];

  /**
   * Add or update a product
   */
  addProduct(product: Product): void {
    this.products.set(product.id, product);
  }

  /**
   * Add multiple products
   */
  addProducts(products: Product[]): void {
    products.forEach(product => this.addProduct(product));
  }

  /**
   * Get recommendations for a product
   */
  getRecommendations(request: RecommendationRequest): RecommendationResponse {
    const { productId, limit = 6, algorithm = 'similarity', exclude = [] } = request;
    
    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const recommendations: Recommendation[] = [];
    const excludeSet = new Set(exclude);
    
    // Calculate similarities with all other products
    for (const [id, candidate] of this.products) {
      if (id === productId || excludeSet.has(id)) {
        continue;
      }
      
      const score = calculateSimilarity(product, candidate);
      const reason = generateReason(product, candidate, score);
      
      recommendations.push({
        id: candidate.id,
        title: candidate.title,
        price: candidate.price,
        imageUrl: candidate.imageUrl,
        url: candidate.url,
        score,
        reason
      });
    }
    
    // Sort by score (highest first) and limit results
    const sortedRecommendations = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return {
      productId,
      recommendations: sortedRecommendations,
      algorithm,
      timestamp: new Date()
    };
  }

  /**
   * Track a click event
   */
  trackClick(event: ClickEvent): void {
    this.events.push(event);
  }

  /**
   * Track a conversion event
   */
  trackConversion(event: ConversionEvent): void {
    this.conversions.push(event);
  }

  /**
   * Get analytics data
   */
  getAnalytics(): Analytics {
    const totalClicks = this.events.length;
    const totalConversions = this.conversions.length;
    const conversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0;
    
    const totalValue = this.conversions.reduce((sum, conv) => sum + conv.value, 0);
    const averageOrderValue = totalConversions > 0 ? totalValue / totalConversions : 0;
    
    // Calculate top products by clicks
    const productClicks = new Map<string, number>();
    const productConversions = new Map<string, number>();
    
    this.events.forEach(event => {
      const current = productClicks.get(event.productId) || 0;
      productClicks.set(event.productId, current + 1);
    });
    
    this.conversions.forEach(conv => {
      const current = productConversions.get(conv.productId) || 0;
      productConversions.set(conv.productId, current + 1);
    });
    
    const topProducts = Array.from(productClicks.entries())
      .map(([productId, clicks]) => ({
        productId,
        clicks,
        conversions: productConversions.get(productId) || 0
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
    
    return {
      totalClicks,
      totalConversions,
      conversionRate,
      averageOrderValue,
      topProducts
    };
  }

  /**
   * Get product by ID
   */
  getProduct(id: string): Product | undefined {
    return this.products.get(id);
  }

  /**
   * Get all products
   */
  getAllProducts(): Product[] {
    return Array.from(this.products.values());
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.products.clear();
    this.events.length = 0;
    this.conversions.length = 0;
  }
}