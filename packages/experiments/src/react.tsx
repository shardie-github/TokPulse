import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AssignmentResult, ExposureResult } from './engine';
import { experimentEngine } from './engine';

export interface ExperimentContextValue {
  assignments: Map<string, AssignmentResult>;
  recordExposure: (request: {
    orgId: string;
    storeId: string;
    subjectKey: string;
    experimentKey: string;
    surface: string;
  }) => Promise<ExposureResult | null>;
  getAssignment: (request: {
    orgId: string;
    storeId?: string;
    subjectKey: string;
    experimentKey: string;
  }) => Promise<AssignmentResult | null>;
}

const ExperimentContext = createContext<ExperimentContextValue | null>(null);

export interface ExperimentProviderProps {
  children: React.ReactNode;
  orgId: string;
  storeId?: string;
  subjectKey: string;
}

export function ExperimentProvider({
  children,
  orgId,
  storeId,
  subjectKey,
}: ExperimentProviderProps) {
  const [assignments, setAssignments] = useState<Map<string, AssignmentResult>>(new Map());

  const getAssignment = useCallback(
    async (request: {
      orgId: string;
      storeId?: string;
      subjectKey: string;
      experimentKey: string;
    }) => {
      const assignment = await experimentEngine.getAssignment(request);
      if (assignment) {
        setAssignments((prev) => new Map(prev).set(request.experimentKey, assignment));
      }
      return assignment;
    },
    [],
  );

  const recordExposure = useCallback(
    async (request: {
      orgId: string;
      storeId: string;
      subjectKey: string;
      experimentKey: string;
      surface: string;
    }) => {
      return await experimentEngine.recordExposure(request);
    },
    [],
  );

  const value: ExperimentContextValue = {
    assignments,
    recordExposure,
    getAssignment,
  };

  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
}

export function useExperiments() {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error('useExperiments must be used within an ExperimentProvider');
  }
  return context;
}

export interface UseExperimentOptions {
  experimentKey: string;
  fallback?: any;
  autoExposure?: boolean;
  surface?: string;
}

export function useExperiment<T = any>({
  experimentKey,
  fallback,
  autoExposure = true,
  surface = 'react',
}: UseExperimentOptions): {
  variant: T | null;
  isAssigned: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  const { assignments, getAssignment, recordExposure } = useExperiments();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const assignment = assignments.get(experimentKey);

  useEffect(() => {
    if (!assignment) {
      setIsLoading(true);
      setError(null);

      getAssignment({
        experimentKey,
        // These would come from the provider context
        orgId: '', // This should be passed down from provider
        subjectKey: '', // This should be passed down from provider
      })
        .then(() => {
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err);
          setIsLoading(false);
        });
    }
  }, [experimentKey, assignment, getAssignment]);

  useEffect(() => {
    if (assignment && autoExposure && surface) {
      recordExposure({
        experimentKey,
        surface,
        // These would come from the provider context
        orgId: '', // This should be passed down from provider
        storeId: '', // This should be passed down from provider
        subjectKey: '', // This should be passed down from provider
      }).catch((err) => {
        console.error('Failed to record exposure:', err);
      });
    }
  }, [assignment, autoExposure, surface, experimentKey, recordExposure]);

  return {
    variant: assignment?.config || fallback || null,
    isAssigned: !!assignment,
    isLoading,
    error,
  };
}

export interface ExperimentComponentProps {
  experimentKey: string;
  variantA: React.ReactNode;
  variantB: React.ReactNode;
  fallback?: React.ReactNode;
  surface?: string;
}

export function ExperimentComponent({
  experimentKey,
  variantA,
  variantB,
  fallback,
  surface = 'react',
}: ExperimentComponentProps) {
  const { variant, isAssigned, isLoading } = useExperiment({
    experimentKey,
    autoExposure: true,
    surface,
  });

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isAssigned) {
    return <>{fallback || variantA}</>;
  }

  // Simple A/B test logic - in practice you'd have more sophisticated variant selection
  if (variant?.variantKey === 'A' || variant?.variantKey === 'control') {
    return <>{variantA}</>;
  } else if (variant?.variantKey === 'B' || variant?.variantKey === 'treatment') {
    return <>{variantB}</>;
  }

  return <>{fallback || variantA}</>;
}

// Hook for getting experiment configuration
export function useExperimentConfig(experimentKey: string) {
  const { assignments } = useExperiments();
  const assignment = assignments.get(experimentKey);

  return {
    config: assignment?.config || null,
    variantKey: assignment?.variantKey || null,
    isAssigned: !!assignment,
  };
}
