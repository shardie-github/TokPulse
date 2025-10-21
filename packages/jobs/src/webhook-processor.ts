import { prisma } from '@tokpulse/db'
import { telemetry } from '@tokpulse/shared'

export interface WebhookJob {
  id: string
  topic: string
  payload: any
  storeId: string
}

export async function processWebhook(job: WebhookJob) {
  try {
    telemetry.log({
      event: 'webhook_processing_started',
      properties: {
        jobId: job.id,
        topic: job.topic,
        storeId: job.storeId,
      },
      timestamp: Date.now(),
      organizationId: 'system',
      storeId: job.storeId,
    })

    // Process based on topic
    switch (job.topic) {
      case 'orders/create':
        await processOrderCreated(job.payload, job.storeId)
        break
      case 'products/create':
      case 'products/update':
        await processProductUpdated(job.payload, job.storeId)
        break
      case 'products/delete':
        await processProductDeleted(job.payload, job.storeId)
        break
      case 'app/uninstalled':
        await processAppUninstalled(job.payload, job.storeId)
        break
      default:
        telemetry.log({
          event: 'webhook_unknown_topic',
          properties: { topic: job.topic },
          timestamp: Date.now(),
          organizationId: 'system',
          storeId: job.storeId,
        })
    }

    // Mark as processed
    await prisma.webhookEvent.update({
      where: { id: job.id },
      data: { processed: true },
    })

    telemetry.log({
      event: 'webhook_processing_completed',
      properties: {
        jobId: job.id,
        topic: job.topic,
        storeId: job.storeId,
      },
      timestamp: Date.now(),
      organizationId: 'system',
      storeId: job.storeId,
    })
  } catch (error) {
    telemetry.error(error as Error, {
      jobId: job.id,
      topic: job.topic,
      storeId: job.storeId,
    })

    // Update job with error
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        attempts: { increment: 1 },
      },
    })
  }
}

async function processOrderCreated(payload: any, storeId: string) {
  // Create attribution record
  if (payload.customer?.id) {
    await prisma.attribution.create({
      data: {
        orderId: payload.id.toString(),
        revenue: parseFloat(payload.total_price),
        storeId,
      },
    })
  }
}

async function processProductUpdated(payload: any, storeId: string) {
  // Sync product to catalog
  for (const variant of payload.variants || []) {
    await prisma.catalogItem.upsert({
      where: {
        storeId_productId_variantId: {
          storeId,
          productId: payload.id.toString(),
          variantId: variant.id.toString(),
        },
      },
      update: {
        title: payload.title,
        handle: payload.handle,
        vendor: payload.vendor,
        productType: payload.product_type,
        tags: payload.tags ? payload.tags.split(',').map((t: string) => t.trim()) : [],
        images: payload.images?.map((img: any) => img.src) || [],
        price: parseFloat(variant.price),
        compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
        inventory: variant.inventory_quantity || 0,
      },
      create: {
        productId: payload.id.toString(),
        variantId: variant.id.toString(),
        title: payload.title,
        handle: payload.handle,
        vendor: payload.vendor,
        productType: payload.product_type,
        tags: payload.tags ? payload.tags.split(',').map((t: string) => t.trim()) : [],
        images: payload.images?.map((img: any) => img.src) || [],
        price: parseFloat(variant.price),
        compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
        inventory: variant.inventory_quantity || 0,
        storeId,
      },
    })
  }
}

async function processProductDeleted(payload: any, storeId: string) {
  // Remove from catalog
  await prisma.catalogItem.deleteMany({
    where: {
      storeId,
      productId: payload.id.toString(),
    },
  })
}

async function processAppUninstalled(payload: any, storeId: string) {
  // Mark store as uninstalled
  await prisma.store.update({
    where: { id: storeId },
    data: { status: 'UNINSTALLED' },
  })

  // Clean up personal data (GDPR compliance)
  await prisma.pixelEvent.deleteMany({
    where: { storeId },
  })

  await prisma.attribution.deleteMany({
    where: { storeId },
  })
}