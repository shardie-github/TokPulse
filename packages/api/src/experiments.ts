import { experimentEngine } from '@tokpulse/experiments';
import { logger } from '@tokpulse/telemetry';
import { z } from 'zod';

// Validation schemas
export const GetActiveExperimentsSchema = z.object({
  orgId: z.string(),
  storeId: z.string().optional(),
});

export const GetAssignmentSchema = z.object({
  orgId: z.string(),
  storeId: z.string().optional(),
  subjectKey: z.string(),
  experimentKey: z.string(),
});

export const RecordExposureSchema = z.object({
  orgId: z.string(),
  storeId: z.string(),
  subjectKey: z.string(),
  experimentKey: z.string(),
  surface: z.string(),
});

export const CreateExperimentSchema = z.object({
  orgId: z.string(),
  storeId: z.string().optional(),
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  startAt: z.string().datetime().optional(),
  stopAt: z.string().datetime().optional(),
  guardrailMetric: z.string().optional(),
  allocation: z.number().min(0).max(100).default(100),
  variants: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      weight: z.number().min(0).max(100),
      configJson: z.string(),
    }),
  ),
});

export const UpdateExperimentSchema = CreateExperimentSchema.partial().extend({
  id: z.string(),
});

export const DeleteExperimentSchema = z.object({
  id: z.string(),
  orgId: z.string(),
});

// API handlers
export async function getActiveExperiments(request: GetActiveExperimentsSchema) {
  try {
    const experiments = experimentEngine.getActiveExperiments(request.orgId, request.storeId);

    logger.info('Retrieved active experiments', {
      orgId: request.orgId,
      storeId: request.storeId,
      count: experiments.length,
    });

    return {
      success: true,
      data: experiments,
    };
  } catch (error) {
    logger.error('Failed to get active experiments', error as Error, {
      orgId: request.orgId,
      storeId: request.storeId,
    });

    return {
      success: false,
      error: 'Failed to retrieve experiments',
    };
  }
}

export async function getAssignment(request: GetAssignmentSchema) {
  try {
    const assignment = await experimentEngine.getAssignment(request);

    if (!assignment) {
      return {
        success: true,
        data: null,
      };
    }

    logger.info('Retrieved experiment assignment', {
      orgId: request.orgId,
      storeId: request.storeId,
      experimentKey: request.experimentKey,
      variantKey: assignment.variantKey,
    });

    return {
      success: true,
      data: assignment,
    };
  } catch (error) {
    logger.error('Failed to get experiment assignment', error as Error, {
      orgId: request.orgId,
      storeId: request.storeId,
      experimentKey: request.experimentKey,
    });

    return {
      success: false,
      error: 'Failed to get assignment',
    };
  }
}

export async function recordExposure(request: RecordExposureSchema) {
  try {
    const result = await experimentEngine.recordExposure(request);

    if (!result) {
      return {
        success: true,
        data: { recorded: false },
      };
    }

    logger.info('Recorded experiment exposure', {
      orgId: request.orgId,
      storeId: request.storeId,
      experimentKey: request.experimentKey,
      surface: request.surface,
      variantKey: result.variantKey,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logger.error('Failed to record experiment exposure', error as Error, {
      orgId: request.orgId,
      storeId: request.storeId,
      experimentKey: request.experimentKey,
      surface: request.surface,
    });

    return {
      success: false,
      error: 'Failed to record exposure',
    };
  }
}

// Database operations (these would use Prisma in a real implementation)
export async function createExperiment(request: CreateExperimentSchema) {
  try {
    // In a real implementation, this would:
    // 1. Validate the request
    // 2. Create the experiment in the database
    // 3. Load it into the experiment engine
    // 4. Return the created experiment

    const experiment = {
      id: `exp_${Date.now()}`,
      ...request,
      status: 'DRAFT' as const,
      hashSalt: `salt_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Load into engine
    await experimentEngine.loadExperiments([experiment]);

    logger.info('Created experiment', {
      orgId: request.orgId,
      storeId: request.storeId,
      experimentKey: request.key,
      experimentId: experiment.id,
    });

    return {
      success: true,
      data: experiment,
    };
  } catch (error) {
    logger.error('Failed to create experiment', error as Error, {
      orgId: request.orgId,
      storeId: request.storeId,
      experimentKey: request.key,
    });

    return {
      success: false,
      error: 'Failed to create experiment',
    };
  }
}

export async function updateExperiment(request: UpdateExperimentSchema) {
  try {
    // In a real implementation, this would:
    // 1. Validate the request
    // 2. Update the experiment in the database
    // 3. Reload it into the experiment engine
    // 4. Return the updated experiment

    logger.info('Updated experiment', {
      orgId: request.orgId,
      experimentId: request.id,
    });

    return {
      success: true,
      data: { id: request.id, updated: true },
    };
  } catch (error) {
    logger.error('Failed to update experiment', error as Error, {
      orgId: request.orgId,
      experimentId: request.id,
    });

    return {
      success: false,
      error: 'Failed to update experiment',
    };
  }
}

export async function deleteExperiment(request: DeleteExperimentSchema) {
  try {
    // In a real implementation, this would:
    // 1. Validate the request
    // 2. Soft delete the experiment in the database
    // 3. Remove it from the experiment engine
    // 4. Return success

    logger.info('Deleted experiment', {
      orgId: request.orgId,
      experimentId: request.id,
    });

    return {
      success: true,
      data: { id: request.id, deleted: true },
    };
  } catch (error) {
    logger.error('Failed to delete experiment', error as Error, {
      orgId: request.orgId,
      experimentId: request.id,
    });

    return {
      success: false,
      error: 'Failed to delete experiment',
    };
  }
}

export async function startExperiment(experimentId: string, orgId: string) {
  try {
    // In a real implementation, this would:
    // 1. Update experiment status to RUNNING
    // 2. Reload into experiment engine
    // 3. Return success

    logger.info('Started experiment', {
      orgId,
      experimentId,
    });

    return {
      success: true,
      data: { id: experimentId, status: 'RUNNING' },
    };
  } catch (error) {
    logger.error('Failed to start experiment', error as Error, {
      orgId,
      experimentId,
    });

    return {
      success: false,
      error: 'Failed to start experiment',
    };
  }
}

export async function pauseExperiment(experimentId: string, orgId: string) {
  try {
    // In a real implementation, this would:
    // 1. Update experiment status to PAUSED
    // 2. Reload into experiment engine
    // 3. Return success

    logger.info('Paused experiment', {
      orgId,
      experimentId,
    });

    return {
      success: true,
      data: { id: experimentId, status: 'PAUSED' },
    };
  } catch (error) {
    logger.error('Failed to pause experiment', error as Error, {
      orgId,
      experimentId,
    });

    return {
      success: false,
      error: 'Failed to pause experiment',
    };
  }
}
