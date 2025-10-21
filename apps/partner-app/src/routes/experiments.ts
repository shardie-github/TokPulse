import { Request, Response } from 'express'
import { z } from 'zod'
import {
  getActiveExperiments,
  getAssignment,
  recordExposure,
  createExperiment,
  updateExperiment,
  deleteExperiment,
  startExperiment,
  pauseExperiment,
  GetActiveExperimentsSchema,
  GetAssignmentSchema,
  RecordExposureSchema,
  CreateExperimentSchema,
  UpdateExperimentSchema,
  DeleteExperimentSchema
} from '@tokpulse/api'
import { logger } from '@tokpulse/telemetry'

// Middleware to extract user context
function extractUserContext(req: Request) {
  // In a real implementation, this would extract from JWT or session
  return {
    orgId: req.headers['x-org-id'] as string || 'org_123',
    storeId: req.headers['x-store-id'] as string,
    userId: req.headers['x-user-id'] as string || 'user_123'
  }
}

// GET /api/experiments - Get active experiments
export async function getExperiments(req: Request, res: Response) {
  try {
    const { orgId, storeId } = extractUserContext(req)
    
    const result = await getActiveExperiments({ orgId, storeId })
    
    if (!result.success) {
      return res.status(500).json(result)
    }
    
    res.json(result)
  } catch (error) {
    logger.error('Failed to get experiments', error as Error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// POST /api/experiments/assign - Get experiment assignment
export async function assignExperiment(req: Request, res: Response) {
  try {
    const { orgId, storeId } = extractUserContext(req)
    const body = GetAssignmentSchema.parse({
      ...req.body,
      orgId,
      storeId
    })
    
    const result = await getAssignment(body)
    
    if (!result.success) {
      return res.status(500).json(result)
    }
    
    res.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      })
    }
    
    logger.error('Failed to assign experiment', error as Error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// POST /api/experiments/exposure - Record experiment exposure
export async function recordExperimentExposure(req: Request, res: Response) {
  try {
    const { orgId, storeId } = extractUserContext(req)
    const body = RecordExposureSchema.parse({
      ...req.body,
      orgId,
      storeId
    })
    
    const result = await recordExposure(body)
    
    if (!result.success) {
      return res.status(500).json(result)
    }
    
    res.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      })
    }
    
    logger.error('Failed to record experiment exposure', error as Error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// POST /api/experiments - Create new experiment
export async function createExperimentHandler(req: Request, res: Response) {
  try {
    const { orgId, storeId } = extractUserContext(req)
    const body = CreateExperimentSchema.parse({
      ...req.body,
      orgId,
      storeId
    })
    
    const result = await createExperiment(body)
    
    if (!result.success) {
      return res.status(500).json(result)
    }
    
    res.status(201).json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      })
    }
    
    logger.error('Failed to create experiment', error as Error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// PUT /api/experiments/:id - Update experiment
export async function updateExperimentHandler(req: Request, res: Response) {
  try {
    const { orgId } = extractUserContext(req)
    const { id } = req.params
    
    const body = UpdateExperimentSchema.parse({
      ...req.body,
      id,
      orgId
    })
    
    const result = await updateExperiment(body)
    
    if (!result.success) {
      return res.status(500).json(result)
    }
    
    res.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      })
    }
    
    logger.error('Failed to update experiment', error as Error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// DELETE /api/experiments/:id - Delete experiment
export async function deleteExperimentHandler(req: Request, res: Response) {
  try {
    const { orgId } = extractUserContext(req)
    const { id } = req.params
    
    const body = DeleteExperimentSchema.parse({ id, orgId })
    
    const result = await deleteExperiment(body)
    
    if (!result.success) {
      return res.status(500).json(result)
    }
    
    res.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      })
    }
    
    logger.error('Failed to delete experiment', error as Error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// POST /api/experiments/:id/start - Start experiment
export async function startExperimentHandler(req: Request, res: Response) {
  try {
    const { orgId } = extractUserContext(req)
    const { id } = req.params
    
    const result = await startExperiment(id, orgId)
    
    if (!result.success) {
      return res.status(500).json(result)
    }
    
    res.json(result)
  } catch (error) {
    logger.error('Failed to start experiment', error as Error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// POST /api/experiments/:id/pause - Pause experiment
export async function pauseExperimentHandler(req: Request, res: Response) {
  try {
    const { orgId } = extractUserContext(req)
    const { id } = req.params
    
    const result = await pauseExperiment(id, orgId)
    
    if (!result.success) {
      return res.status(500).json(result)
    }
    
    res.json(result)
  } catch (error) {
    logger.error('Failed to pause experiment', error as Error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}