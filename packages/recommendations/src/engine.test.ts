import { describe, it, expect, beforeEach } from 'vitest';
import { RecommendationEngine, type Product } from './index.js';

describe('RecommendationEngine', () => {
  let engine: RecommendationEngine;
  let sampleProducts: Product[];

  beforeEach(() => {
    engine = new RecommendationEngine();
    sampleProducts = [
      {
        id: '1',
        shopId: 'shop1',
        title: 'Blue Cotton T-Shirt',
        description: 'Comfortable blue cotton t-shirt for everyday wear',
        tags: ['clothing', 't-shirt', 'cotton', 'blue'],
        category: 'Clothing > Tops',
        price: 29.99,
        imageUrl: 'https://example.com/tshirt.jpg',
        url: '/products/blue-cotton-tshirt',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        shopId: 'shop1',
        title: 'Red Cotton T-Shirt',
        description: 'Comfortable red cotton t-shirt for everyday wear',
        tags: ['clothing', 't-shirt', 'cotton', 'red'],
        category: 'Clothing > Tops',
        price: 29.99,
        imageUrl: 'https://example.com/red-tshirt.jpg',
        url: '/products/red-cotton-tshirt',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        shopId: 'shop1',
        title: 'Denim Jeans',
        description: 'Classic blue denim jeans',
        tags: ['clothing', 'jeans', 'denim', 'blue'],
        category: 'Clothing > Bottoms',
        price: 79.99,
        imageUrl: 'https://example.com/jeans.jpg',
        url: '/products/denim-jeans',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '4',
        shopId: 'shop1',
        title: 'Laptop Computer',
        description: 'High-performance laptop for work and gaming',
        tags: ['electronics', 'laptop', 'computer'],
        category: 'Electronics > Computers',
        price: 1299.99,
        imageUrl: 'https://example.com/laptop.jpg',
        url: '/products/laptop',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    engine.addProducts(sampleProducts);
  });

  it('should add products correctly', () => {
    expect(engine.getAllProducts()).toHaveLength(4);
    expect(engine.getProduct('1')).toBeDefined();
    expect(engine.getProduct('nonexistent')).toBeUndefined();
  });

  it('should generate recommendations for a product', () => {
    const recommendations = engine.getRecommendations({
      productId: '1',
      limit: 3
    });

    expect(recommendations.productId).toBe('1');
    expect(recommendations.recommendations).toHaveLength(3);
    expect(recommendations.algorithm).toBe('similarity');
    expect(recommendations.timestamp).toBeInstanceOf(Date);
  });

  it('should return recommendations sorted by score', () => {
    const recommendations = engine.getRecommendations({
      productId: '1',
      limit: 3
    });

    const scores = recommendations.recommendations.map(r => r.score);
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1]);
    expect(scores[1]).toBeGreaterThanOrEqual(scores[2]);
  });

  it('should exclude specified products', () => {
    const recommendations = engine.getRecommendations({
      productId: '1',
      limit: 3,
      exclude: ['2']
    });

    const recommendedIds = recommendations.recommendations.map(r => r.id);
    expect(recommendedIds).not.toContain('2');
  });

  it('should track click events', () => {
    engine.trackClick({
      productId: '1',
      recommendationId: '2',
      sessionId: 'session123',
      timestamp: new Date()
    });

    const analytics = engine.getAnalytics();
    expect(analytics.totalClicks).toBe(1);
  });

  it('should track conversion events', () => {
    engine.trackConversion({
      productId: '1',
      recommendationId: '2',
      orderId: 'order123',
      value: 29.99,
      timestamp: new Date()
    });

    const analytics = engine.getAnalytics();
    expect(analytics.totalConversions).toBe(1);
    expect(analytics.averageOrderValue).toBe(29.99);
  });

  it('should calculate conversion rate correctly', () => {
    // Add some clicks and conversions
    engine.trackClick({
      productId: '1',
      recommendationId: '2',
      sessionId: 'session1',
      timestamp: new Date()
    });
    
    engine.trackClick({
      productId: '1',
      recommendationId: '3',
      sessionId: 'session2',
      timestamp: new Date()
    });
    
    engine.trackConversion({
      productId: '1',
      recommendationId: '2',
      orderId: 'order1',
      value: 29.99,
      timestamp: new Date()
    });

    const analytics = engine.getAnalytics();
    expect(analytics.totalClicks).toBe(2);
    expect(analytics.totalConversions).toBe(1);
    expect(analytics.conversionRate).toBe(0.5);
  });

  it('should clear all data', () => {
    engine.clear();
    expect(engine.getAllProducts()).toHaveLength(0);
    
    const analytics = engine.getAnalytics();
    expect(analytics.totalClicks).toBe(0);
    expect(analytics.totalConversions).toBe(0);
  });

  it('should throw error for nonexistent product', () => {
    expect(() => {
      engine.getRecommendations({
        productId: 'nonexistent'
      });
    }).toThrow('Product nonexistent not found');
  });
});