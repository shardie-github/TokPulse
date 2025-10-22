import type { PrismaClient } from '@tokpulse/db';

import { GoogleFeedGenerator } from './generators/google';
import { MetaFeedGenerator } from './generators/meta';
import { TikTokFeedGenerator } from './generators/tiktok';
import type {
  FeedConfig,
  CreateFeedConfig,
  UpdateFeedConfig,
  FeedType,
  ProductMapping,
  FeedUrl,
  GoogleFeedConfig,
  MetaFeedConfig,
  TikTokFeedConfig,
} from './types';

export class FeedsService {
  constructor(private db: PrismaClient) {}

  // Feed Configuration Management
  async getFeedConfigs(storeId: string): Promise<FeedConfig[]> {
    return this.db.feedConfig.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFeedConfig(id: string): Promise<FeedConfig | null> {
    return this.db.feedConfig.findUnique({
      where: { id },
    });
  }

  async createFeedConfig(data: CreateFeedConfig): Promise<FeedConfig> {
    return this.db.feedConfig.create({
      data: {
        ...data,
        config: JSON.stringify(data.config),
        status: 'ACTIVE',
      },
    });
  }

  async updateFeedConfig(id: string, data: UpdateFeedConfig): Promise<FeedConfig> {
    const updateData: any = { ...data };

    if (data.config) {
      updateData.config = JSON.stringify(data.config);
    }

    return this.db.feedConfig.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteFeedConfig(id: string): Promise<void> {
    await this.db.feedConfig.delete({
      where: { id },
    });
  }

  // Feed Generation
  async generateFeed(
    storeId: string,
    feedType: FeedType,
    forceRegenerate: boolean = false,
  ): Promise<FeedUrl> {
    const feedConfig = await this.db.feedConfig.findFirst({
      where: {
        storeId,
        type: feedType,
        status: 'ACTIVE',
      },
    });

    if (!feedConfig) {
      throw new Error(`No active ${feedType} feed configuration found for store`);
    }

    // Check if regeneration is needed
    if (!forceRegenerate && feedConfig.lastGenerated) {
      const lastGenerated = new Date(feedConfig.lastGenerated);
      const now = new Date();
      const hoursSinceLastGeneration = (now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastGeneration < 1) {
        // Don't regenerate if less than 1 hour old
        return this.getFeedUrl(storeId, feedType);
      }
    }

    // Get store and products
    const store = await this.db.store.findUnique({
      where: { id: storeId },
      include: {
        catalogItems: true,
      },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    // Convert catalog items to product mappings
    const productMappings: ProductMapping[] = store.catalogItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      title: item.title,
      description: item.title, // Use title as description if no description field
      handle: item.handle,
      vendor: item.vendor,
      productType: item.productType,
      tags: item.tags ? item.tags.split(',').map((tag) => tag.trim()) : [],
      images: item.images ? item.images.split(',').map((img) => img.trim()) : [],
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      inventory: item.inventory,
      availability: item.inventory > 0 ? 'in_stock' : 'out_of_stock',
      condition: 'new',
      brand: item.vendor,
      customAttributes: {},
    }));

    // Generate feed based on type
    let feedContent: string;
    let mimeType: string;

    switch (feedType) {
      case 'GOOGLE':
        const googleGenerator = new GoogleFeedGenerator();
        const googleConfig = JSON.parse(feedConfig.config) as GoogleFeedConfig;
        feedContent = await googleGenerator.generate(productMappings, googleConfig);
        mimeType = 'application/xml';
        break;

      case 'META':
        const metaGenerator = new MetaFeedGenerator();
        const metaConfig = JSON.parse(feedConfig.config) as MetaFeedConfig;
        feedContent = await metaGenerator.generate(productMappings, metaConfig);
        mimeType = 'text/csv';
        break;

      case 'TIKTOK':
        const tiktokGenerator = new TikTokFeedGenerator();
        const tiktokConfig = JSON.parse(feedConfig.config) as TikTokFeedConfig;
        feedContent = await tiktokGenerator.generate(productMappings, tiktokConfig);
        mimeType = 'text/csv';
        break;

      default:
        throw new Error(`Unsupported feed type: ${feedType}`);
    }

    // Save feed to file system or cloud storage
    const feedUrl = await this.saveFeed(storeId, feedType, feedContent, mimeType);

    // Update feed config with generation info
    await this.db.feedConfig.update({
      where: { id: feedConfig.id },
      data: {
        lastGenerated: new Date(),
        nextGeneration: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next generation in 24 hours
      },
    });

    return feedUrl;
  }

  async getFeedUrl(storeId: string, feedType: FeedType): Promise<FeedUrl> {
    // In a real implementation, this would check if the feed exists and is still valid
    // For now, we'll generate a signed URL
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const feedPath = `/feeds/${storeId}/${feedType.toLowerCase()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return {
      url: `${baseUrl}${feedPath}`,
      expiresAt,
      feedType,
      storeId,
    };
  }

  private async saveFeed(
    storeId: string,
    feedType: FeedType,
    content: string,
    mimeType: string,
  ): Promise<FeedUrl> {
    // In a real implementation, this would save to cloud storage (S3, GCS, etc.)
    // For now, we'll save to the local file system
    const fs = await import('fs');
    const path = await import('path');

    const feedsDir = path.join(process.cwd(), 'feeds', storeId);
    const fileName = `${feedType.toLowerCase()}.${mimeType.includes('xml') ? 'xml' : 'csv'}`;
    const filePath = path.join(feedsDir, fileName);

    // Ensure directory exists
    fs.mkdirSync(feedsDir, { recursive: true });

    // Write file
    fs.writeFileSync(filePath, content);

    // Return signed URL
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const feedPath = `/feeds/${storeId}/${feedType.toLowerCase()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return {
      url: `${baseUrl}${feedPath}`,
      expiresAt,
      feedType,
      storeId,
    };
  }

  // Scheduled Feed Generation
  async scheduleFeedGeneration(): Promise<void> {
    console.log('Scheduling feed generation...');

    // Find all active feed configs that need regeneration
    const now = new Date();
    const feedConfigs = await this.db.feedConfig.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ nextGeneration: { lte: now } }, { lastGenerated: null }],
      },
      include: {
        store: true,
      },
    });

    console.log(`Found ${feedConfigs.length} feeds to generate`);

    for (const feedConfig of feedConfigs) {
      try {
        console.log(`Generating ${feedConfig.type} feed for store ${feedConfig.storeId}`);
        await this.generateFeed(feedConfig.storeId, feedConfig.type as FeedType, false);
        console.log(`✅ Generated ${feedConfig.type} feed for store ${feedConfig.storeId}`);
      } catch (error) {
        console.error(
          `❌ Failed to generate ${feedConfig.type} feed for store ${feedConfig.storeId}:`,
          error,
        );

        // Update status to error
        await this.db.feedConfig.update({
          where: { id: feedConfig.id },
          data: { status: 'ERROR' },
        });
      }
    }
  }

  // Feed Validation
  async validateFeed(
    storeId: string,
    feedType: FeedType,
  ): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const feedConfig = await this.db.feedConfig.findFirst({
        where: {
          storeId,
          type: feedType,
          status: 'ACTIVE',
        },
      });

      if (!feedConfig) {
        return { valid: false, errors: [`No ${feedType} feed configuration found`] };
      }

      // Get products to validate
      const store = await this.db.store.findUnique({
        where: { id: storeId },
        include: {
          catalogItems: true,
        },
      });

      if (!store) {
        return { valid: false, errors: ['Store not found'] };
      }

      const errors: string[] = [];

      // Validate required fields based on feed type
      for (const item of store.catalogItems) {
        if (!item.title) {
          errors.push(`Product ${item.productId} is missing title`);
        }
        if (!item.price || item.price <= 0) {
          errors.push(`Product ${item.productId} has invalid price`);
        }
        if (!item.handle) {
          errors.push(`Product ${item.productId} is missing handle`);
        }
        if (feedType === 'GOOGLE' && !item.images) {
          errors.push(`Product ${item.productId} is missing images (required for Google)`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  // Feed Statistics
  async getFeedStats(storeId: string): Promise<{
    totalFeeds: number;
    activeFeeds: number;
    lastGenerated: Date | null;
    nextGeneration: Date | null;
  }> {
    const feeds = await this.db.feedConfig.findMany({
      where: { storeId },
    });

    const activeFeeds = feeds.filter((feed) => feed.status === 'ACTIVE');
    const lastGenerated =
      activeFeeds.length > 0
        ? new Date(Math.max(...activeFeeds.map((feed) => feed.lastGenerated?.getTime() || 0)))
        : null;
    const nextGeneration =
      activeFeeds.length > 0
        ? new Date(
            Math.min(...activeFeeds.map((feed) => feed.nextGeneration?.getTime() || Infinity)),
          )
        : null;

    return {
      totalFeeds: feeds.length,
      activeFeeds: activeFeeds.length,
      lastGenerated,
      nextGeneration,
    };
  }
}
