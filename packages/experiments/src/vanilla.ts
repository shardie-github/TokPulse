import { experimentEngine, AssignmentRequest, ExposureRequest } from './engine'

export interface VanillaExperimentOptions {
  orgId: string
  storeId?: string
  subjectKey: string
  baseUrl?: string
}

export class VanillaExperimentClient {
  private orgId: string
  private storeId?: string
  private subjectKey: string
  private baseUrl: string
  private assignments: Map<string, any> = new Map()

  constructor(options: VanillaExperimentOptions) {
    this.orgId = options.orgId
    this.storeId = options.storeId
    this.subjectKey = options.subjectKey
    this.baseUrl = options.baseUrl || ''
  }

  /**
   * Get assignment for an experiment
   */
  async getAssignment(experimentKey: string): Promise<any> {
    // Check cache first
    if (this.assignments.has(experimentKey)) {
      return this.assignments.get(experimentKey)
    }

    try {
      const assignment = await experimentEngine.getAssignment({
        orgId: this.orgId,
        storeId: this.storeId,
        subjectKey: this.subjectKey,
        experimentKey
      })

      if (assignment) {
        this.assignments.set(experimentKey, assignment)
      }

      return assignment
    } catch (error) {
      console.error('Failed to get experiment assignment:', error)
      return null
    }
  }

  /**
   * Record exposure for an experiment
   */
  async recordExposure(experimentKey: string, surface: string = 'vanilla'): Promise<boolean> {
    try {
      const result = await experimentEngine.recordExposure({
        orgId: this.orgId,
        storeId: this.storeId!,
        subjectKey: this.subjectKey,
        experimentKey,
        surface
      })

      return result?.recorded || false
    } catch (error) {
      console.error('Failed to record experiment exposure:', error)
      return false
    }
  }

  /**
   * Get experiment configuration with automatic exposure recording
   */
  async getExperimentConfig(experimentKey: string, surface: string = 'vanilla'): Promise<any> {
    const assignment = await this.getAssignment(experimentKey)
    
    if (assignment) {
      // Record exposure asynchronously
      this.recordExposure(experimentKey, surface).catch(console.error)
    }

    return assignment?.config || null
  }

  /**
   * Check if subject is in a specific variant
   */
  async isInVariant(experimentKey: string, variantKey: string): Promise<boolean> {
    const assignment = await this.getAssignment(experimentKey)
    return assignment?.variantKey === variantKey
  }

  /**
   * Get all active experiments for the organization
   */
  async getActiveExperiments(): Promise<any[]> {
    return experimentEngine.getActiveExperiments(this.orgId, this.storeId)
  }

  /**
   * Clear local cache
   */
  clearCache() {
    this.assignments.clear()
  }
}

// Global instance for easy access
let globalClient: VanillaExperimentClient | null = null

export function initExperiments(options: VanillaExperimentOptions) {
  globalClient = new VanillaExperimentClient(options)
  return globalClient
}

export function getExperiments(): VanillaExperimentClient {
  if (!globalClient) {
    throw new Error('Experiments not initialized. Call initExperiments() first.')
  }
  return globalClient
}

// Convenience functions for global client
export async function getAssignment(experimentKey: string) {
  return getExperiments().getAssignment(experimentKey)
}

export async function recordExposure(experimentKey: string, surface: string = 'vanilla') {
  return getExperiments().recordExposure(experimentKey, surface)
}

export async function getExperimentConfig(experimentKey: string, surface: string = 'vanilla') {
  return getExperiments().getExperimentConfig(experimentKey, surface)
}

export async function isInVariant(experimentKey: string, variantKey: string) {
  return getExperiments().isInVariant(experimentKey, variantKey)
}

export async function getActiveExperiments() {
  return getExperiments().getActiveExperiments()
}

// Theme Extension bootstrap helper
export function createThemeBootstrapScript(options: VanillaExperimentOptions): string {
  return `
    (function() {
      // Initialize experiments
      window.TokPulseExperiments = {
        orgId: '${options.orgId}',
        storeId: '${options.storeId || ''}',
        subjectKey: '${options.subjectKey}',
        baseUrl: '${options.baseUrl || ''}',
        
        async getAssignment(experimentKey) {
          const response = await fetch('/api/experiments/active', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': crypto.randomUUID()
            },
            body: JSON.stringify({
              experimentKey,
              subjectKey: this.subjectKey
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to get experiment assignment');
          }
          
          return await response.json();
        },
        
        async recordExposure(experimentKey, surface = 'theme') {
          try {
            await fetch('/api/experiments/exposure', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': crypto.randomUUID()
              },
              body: JSON.stringify({
                experimentKey,
                subjectKey: this.subjectKey,
                surface
              })
            });
          } catch (error) {
            console.warn('Failed to record experiment exposure:', error);
          }
        },
        
        async getExperimentConfig(experimentKey, surface = 'theme') {
          const assignment = await this.getAssignment(experimentKey);
          if (assignment) {
            this.recordExposure(experimentKey, surface);
          }
          return assignment?.config || null;
        },
        
        async isInVariant(experimentKey, variantKey) {
          const assignment = await this.getAssignment(experimentKey);
          return assignment?.variantKey === variantKey;
        }
      };
    })();
  `
}