export interface FeatureFlags {
  enableRecommendations: boolean
  enableExperiments: boolean
  enableAnalytics: boolean
  enableCreativeGeneration: boolean
  enableWebhooks: boolean
}

export const defaultFeatureFlags: FeatureFlags = {
  enableRecommendations: false,
  enableExperiments: false,
  enableAnalytics: false,
  enableCreativeGeneration: false,
  enableWebhooks: false,
}

export function getFeatureFlags(env: Record<string, string | undefined>): FeatureFlags {
  return {
    enableRecommendations: env.FEATURE_RECOMMENDATIONS === 'true',
    enableExperiments: env.FEATURE_EXPERIMENTS === 'true',
    enableAnalytics: env.FEATURE_ANALYTICS === 'true',
    enableCreativeGeneration: env.FEATURE_CREATIVE_GENERATION === 'true',
    enableWebhooks: env.FEATURE_WEBHOOKS === 'true',
  }
}