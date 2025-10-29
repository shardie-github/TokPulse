import type { Product } from './types.js';

/**
 * Calculate text similarity using simple word overlap
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate category similarity
 */
export function calculateCategorySimilarity(cat1?: string, cat2?: string): number {
  if (!cat1 || !cat2) return 0;
  if (cat1 === cat2) return 1;
  
  // Simple parent category matching
  const parts1 = cat1.split(' > ');
  const parts2 = cat2.split(' > ');
  
  const minLength = Math.min(parts1.length, parts2.length);
  let matches = 0;
  
  for (let i = 0; i < minLength; i++) {
    if (parts1[i] === parts2[i]) {
      matches++;
    } else {
      break;
    }
  }
  
  return matches / Math.max(parts1.length, parts2.length);
}

/**
 * Calculate tag overlap using Jaccard similarity
 */
export function calculateTagSimilarity(tags1: string[], tags2: string[]): number {
  if (tags1.length === 0 && tags2.length === 0) return 1;
  if (tags1.length === 0 || tags2.length === 0) return 0;
  
  const set1 = new Set(tags1.map(t => t.toLowerCase()));
  const set2 = new Set(tags2.map(t => t.toLowerCase()));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate price proximity (closer prices = higher score)
 */
export function calculatePriceSimilarity(price1: number, price2: number): number {
  if (price1 === 0 && price2 === 0) return 1;
  if (price1 === 0 || price2 === 0) return 0;
  
  const ratio = Math.min(price1, price2) / Math.max(price1, price2);
  return Math.pow(ratio, 0.5); // Square root to make it less harsh
}

/**
 * Calculate overall similarity score between two products
 */
export function calculateSimilarity(product1: Product, product2: Product): number {
  const text1 = `${product1.title} ${product1.description || ''}`;
  const text2 = `${product2.title} ${product2.description || ''}`;
  
  const textSimilarity = calculateTextSimilarity(text1, text2);
  const categorySimilarity = calculateCategorySimilarity(product1.category, product2.category);
  const tagSimilarity = calculateTagSimilarity(product1.tags, product2.tags);
  const priceSimilarity = calculatePriceSimilarity(product1.price, product2.price);
  
  // Weighted combination
  const score = (
    textSimilarity * 0.4 +
    categorySimilarity * 0.3 +
    tagSimilarity * 0.2 +
    priceSimilarity * 0.1
  );
  
  return Math.min(score, 1); // Cap at 1
}

/**
 * Generate reason for recommendation
 */
export function generateReason(product1: Product, product2: Product, score: number): string {
  const reasons = [];
  
  if (product1.category === product2.category) {
    reasons.push('Same category');
  }
  
  const commonTags = product1.tags.filter(tag => 
    product2.tags.some(t => t.toLowerCase() === tag.toLowerCase())
  );
  
  if (commonTags.length > 0) {
    reasons.push(`Similar tags: ${commonTags.slice(0, 2).join(', ')}`);
  }
  
  const priceDiff = Math.abs(product1.price - product2.price) / Math.max(product1.price, product2.price);
  if (priceDiff < 0.2) {
    reasons.push('Similar price range');
  }
  
  if (reasons.length === 0) {
    return 'Similar product characteristics';
  }
  
  return reasons.join(', ');
}