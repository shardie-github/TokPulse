import {
  experimentExposureTotal,
  experimentAssignmentTotal,
  experimentGuardrailBreachTotal,
  logger,
} from '@tokpulse/telemetry';
import { createHash } from 'crypto';
import { z } from 'zod';

// Validation schemas
export const ExperimentConfigSchema = z.object({
  id: z.string(),
  key: z.string(),
  status: z.enum(['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED']),
  startAt: z.date().optional(),
  stopAt: z.date().optional(),
  hashSalt: z.string(),
  guardrailMetric: z.string().optional(),
  allocation: z.number().min(0).max(100),
  variants: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      name: z.string(),
      weight: z.number().min(0).max(100),
      configJson: z.string(),
    }),
  ),
});

export const AssignmentRequestSchema = z.object({
  orgId: z.string(),
  storeId: z.string().optional(),
  subjectKey: z.string(),
  experimentKey: z.string(),
});

export const ExposureRequestSchema = z.object({
  orgId: z.string(),
  storeId: z.string(),
  subjectKey: z.string(),
  experimentKey: z.string(),
  surface: z.string(),
});

export type ExperimentConfig = z.infer<typeof ExperimentConfigSchema>;
export type AssignmentRequest = z.infer<typeof AssignmentRequestSchema>;
export type ExposureRequest = z.infer<typeof ExposureRequestSchema>;

export interface AssignmentResult {
  experimentId: string;
  variantId: string;
  variantKey: string;
  config: any;
  isNewAssignment: boolean;
}

export interface ExposureResult {
  experimentId: string;
  variantId: string;
  variantKey: string;
  config: any;
  recorded: boolean;
}

export class ExperimentEngine {
  private experiments: Map<string, ExperimentConfig> = new Map();
  private assignments: Map<string, Map<string, AssignmentResult>> = new Map(); // orgId -> subjectKey -> assignment

  /**
   * Load experiments from database or cache
   */
  async loadExperiments(experiments: ExperimentConfig[]) {
    this.experiments.clear();
    for (const exp of experiments) {
      this.experiments.set(exp.key, exp);
    }
    logger.info(`Loaded ${experiments.length} experiments`);
  }

  /**
   * Get assignment for a subject in an experiment
   */
  async getAssignment(request: AssignmentRequest): Promise<AssignmentResult | null> {
    const validated = AssignmentRequestSchema.parse(request);
    const { orgId, storeId, subjectKey, experimentKey } = validated;

    // Check if experiment exists and is active
    const experiment = this.experiments.get(experimentKey);
    if (!experiment || !this.isExperimentActive(experiment)) {
      return null;
    }

    // Check if store is eligible (if experiment is store-specific)
    if (experiment.storeId && experiment.storeId !== storeId) {
      return null;
    }

    // Check if we already have an assignment for this subject
    const orgAssignments = this.assignments.get(orgId) || new Map();
    const existingAssignment = orgAssignments.get(subjectKey);
    if (existingAssignment && existingAssignment.experimentId === experiment.id) {
      return existingAssignment;
    }

    // Generate new assignment
    const assignment = this.generateAssignment(experiment, subjectKey);
    if (!assignment) {
      return null;
    }

    // Store assignment in memory cache
    if (!this.assignments.has(orgId)) {
      this.assignments.set(orgId, new Map());
    }
    this.assignments.get(orgId)!.set(subjectKey, assignment);

    // Record metrics
    experimentAssignmentTotal.inc({
      experiment: experiment.key,
      variant: assignment.variantKey,
      storeId: storeId || 'unknown',
    });

    logger.experimentAssignment(
      experiment.id,
      assignment.variantId,
      storeId || 'unknown',
      subjectKey,
      { orgId },
    );

    return assignment;
  }

  /**
   * Record exposure for a subject in an experiment
   */
  async recordExposure(request: ExposureRequest): Promise<ExposureResult | null> {
    const validated = ExposureRequestSchema.parse(request);
    const { orgId, storeId, subjectKey, experimentKey, surface } = validated;

    // Get assignment first
    const assignment = await this.getAssignment({
      orgId,
      storeId,
      subjectKey,
      experimentKey,
    });

    if (!assignment) {
      return null;
    }

    // Check if we've already recorded this exposure (dedupe)
    const exposureKey = `${experimentKey}:${subjectKey}:${surface}`;
    // In a real implementation, you'd check against the database

    // Record metrics
    experimentExposureTotal.inc({
      experiment: experimentKey,
      variant: assignment.variantKey,
      surface,
      storeId,
    });

    logger.experimentExposure(assignment.experimentId, assignment.variantId, surface, storeId, {
      orgId,
    });

    return {
      experimentId: assignment.experimentId,
      variantId: assignment.variantId,
      variantKey: assignment.variantKey,
      config: assignment.config,
      recorded: true,
    };
  }

  /**
   * Generate deterministic assignment based on hash
   */
  private generateAssignment(
    experiment: ExperimentConfig,
    subjectKey: string,
  ): AssignmentResult | null {
    // Check allocation
    const allocationHash = this.hash(`${subjectKey}:${experiment.hashSalt}`);
    const allocationBucket = allocationHash % 100;
    if (allocationBucket >= experiment.allocation) {
      return null;
    }

    // Find variant based on weight
    const variantHash = this.hash(`${subjectKey}:${experiment.key}:${experiment.hashSalt}`);
    const variantBucket = variantHash % 100;

    let cumulativeWeight = 0;
    for (const variant of experiment.variants) {
      cumulativeWeight += variant.weight;
      if (variantBucket < cumulativeWeight) {
        return {
          experimentId: experiment.id,
          variantId: variant.id,
          variantKey: variant.key,
          config: JSON.parse(variant.configJson),
          isNewAssignment: true,
        };
      }
    }

    // Fallback to first variant if weights don't add up to 100
    const firstVariant = experiment.variants[0];
    if (firstVariant) {
      return {
        experimentId: experiment.id,
        variantId: firstVariant.id,
        variantKey: firstVariant.key,
        config: JSON.parse(firstVariant.configJson),
        isNewAssignment: true,
      };
    }

    return null;
  }

  /**
   * Check if experiment is currently active
   */
  private isExperimentActive(experiment: ExperimentConfig): boolean {
    if (experiment.status !== 'RUNNING') {
      return false;
    }

    const now = new Date();

    if (experiment.startAt && now < experiment.startAt) {
      return false;
    }

    if (experiment.stopAt && now > experiment.stopAt) {
      return false;
    }

    return true;
  }

  /**
   * Generate deterministic hash for consistent bucketing
   */
  private hash(input: string): number {
    const hash = createHash('sha256').update(input).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  /**
   * Check guardrails for an experiment
   */
  async checkGuardrails(
    experimentKey: string,
    metric: string,
    value: number,
    threshold: number,
  ): Promise<boolean> {
    const experiment = this.experiments.get(experimentKey);
    if (!experiment || experiment.guardrailMetric !== metric) {
      return true;
    }

    const breach = value > threshold;
    if (breach) {
      experimentGuardrailBreachTotal.inc({
        experiment: experimentKey,
        metric,
        threshold: threshold.toString(),
      });

      logger.warn(`Guardrail breach detected`, {
        experimentId: experiment.id,
        experimentKey,
        metric,
        value,
        threshold,
      });
    }

    return !breach;
  }

  /**
   * Get all active experiments for an organization
   */
  getActiveExperiments(orgId: string, storeId?: string): ExperimentConfig[] {
    return Array.from(this.experiments.values()).filter((exp) => {
      if (exp.storeId && exp.storeId !== storeId) {
        return false;
      }
      return this.isExperimentActive(exp);
    });
  }

  /**
   * Clear assignments cache (useful for testing)
   */
  clearCache() {
    this.assignments.clear();
  }
}

// Default engine instance
export const experimentEngine = new ExperimentEngine();
