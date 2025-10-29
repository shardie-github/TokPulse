export * from './types.js';
export * from './engine.js';
export * from './similarity.js';

// Re-export main classes and functions for easy importing
export { RecommendationEngine } from './engine.js';
export { 
  calculateSimilarity, 
  calculateTextSimilarity,
  calculateCategorySimilarity,
  calculateTagSimilarity,
  calculatePriceSimilarity,
  generateReason
} from './similarity.js';