import { prisma } from '@tokpulse/db'
import { widgetRequestSchema, recommendationResponseSchema } from '@tokpulse/shared'
import { telemetry } from '@tokpulse/shared'

export interface RecommendationParams {
  shop: string
  productHandle?: string
  productId?: string
  variantId?: string
  experimentId?: string
}

export async function getRecommendations(params: RecommendationParams) {
  try {
    // Validate input
    const validated = widgetRequestSchema.parse({
      store: params.shop,
      productId: params.productId,
      variantId: params.variantId,
      experimentId: params.experimentId,
    })

    // Find store
    const store = await prisma.store.findUnique({
      where: { shopDomain: validated.store },
    })

    if (!store) {
      throw new Error('Store not found')
    }

    // Get current product
    let currentProduct = null
    if (params.productHandle) {
      currentProduct = await prisma.catalogItem.findFirst({
        where: {
          storeId: store.id,
          handle: params.productHandle,
        },
      })
    } else if (params.productId) {
      currentProduct = await prisma.catalogItem.findFirst({
        where: {
          storeId: store.id,
          productId: params.productId,
          variantId: params.variantId || undefined,
        },
      })
    }

    if (!currentProduct) {
      throw new Error('Product not found')
    }

    // Simple recommendation logic (in production, this would be more sophisticated)
    const recommendations = await prisma.catalogItem.findMany({
      where: {
        storeId: store.id,
        productId: { not: currentProduct.productId },
        productType: currentProduct.productType,
        inventory: { gt: 0 },
      },
      take: 4,
      orderBy: { createdAt: 'desc' },
    })

    // Format recommendations
    const formattedRecommendations = recommendations.map((item) => ({
      productId: item.productId,
      title: item.title,
      handle: item.handle,
      price: item.price.toNumber(),
      image: item.images[0] || null,
      reason: `Similar ${item.productType || 'product'}`,
    }))

    // Track recommendation request
    telemetry.log({
      event: 'recommendations_requested',
      properties: {
        productId: currentProduct.productId,
        variantId: currentProduct.variantId,
        experimentId: params.experimentId,
        recommendationsCount: formattedRecommendations.length,
      },
      timestamp: Date.now(),
      organizationId: store.organizationId,
      storeId: store.id,
    })

    return formattedRecommendations
  } catch (error) {
    telemetry.error(error as Error, {
      shop: params.shop,
      productHandle: params.productHandle,
      productId: params.productId,
    })
    throw error
  }
}