import { prisma } from '@tokpulse/db'
import { telemetry } from '@tokpulse/shared'

export interface ExperimentParams {
  shop: string
  experimentId: string
  userId?: string
}

export async function getExperimentVariant(params: ExperimentParams) {
  try {
    const store = await prisma.store.findUnique({
      where: { shopDomain: params.shop },
    })

    if (!store) {
      throw new Error('Store not found')
    }

    const experiment = await prisma.experiment.findFirst({
      where: {
        id: params.experimentId,
        storeId: store.id,
        status: 'RUNNING',
      },
    })

    if (!experiment) {
      return 'control'
    }

    // Simple hash-based bucketing
    const config = experiment.config as any
    const variants = config.variants || ['control', 'treatment']
    const trafficAllocation = config.trafficAllocation || 0.5

    // Create deterministic hash
    const input = `${params.shop}-${params.experimentId}-${params.userId || 'anonymous'}`
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }

    const bucket = Math.abs(hash) % 100
    const threshold = trafficAllocation * 100

    const variant = bucket < threshold ? variants[1] || 'treatment' : variants[0] || 'control'

    // Track experiment exposure
    telemetry.log({
      event: 'experiment_exposed',
      properties: {
        experimentId: params.experimentId,
        variant,
        bucket,
        threshold,
      },
      timestamp: Date.now(),
      organizationId: store.organizationId,
      storeId: store.id,
    })

    return variant
  } catch (error) {
    telemetry.error(error as Error, {
      shop: params.shop,
      experimentId: params.experimentId,
    })
    return 'control'
  }
}