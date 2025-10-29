export interface Product {
  id: string;
  shopId: string;
  title: string;
  description?: string;
  tags: string[];
  category?: string;
  price: number;
  imageUrl?: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Recommendation {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  url: string;
  score: number;
  reason: string;
}

export interface RecommendationRequest {
  productId: string;
  limit?: number;
  algorithm?: string;
  exclude?: string[];
}

export interface RecommendationResponse {
  productId: string;
  recommendations: Recommendation[];
  algorithm: string;
  timestamp: Date;
}

export interface ClickEvent {
  productId: string;
  recommendationId: string;
  sessionId: string;
  timestamp: Date;
}

export interface ConversionEvent {
  productId: string;
  recommendationId: string;
  orderId: string;
  value: number;
  timestamp: Date;
}

export interface Analytics {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    clicks: number;
    conversions: number;
  }>;
}