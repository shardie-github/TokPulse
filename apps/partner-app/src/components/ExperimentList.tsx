import React, { useState, useEffect } from 'react'

interface Experiment {
  id: string
  key: string
  name: string
  description?: string
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED'
  startAt?: string
  stopAt?: string
  allocation: number
  variants: Array<{
    id: string
    key: string
    name: string
    weight: number
    configJson: string
  }>
}

interface ExperimentListProps {
  orgId: string
  storeId?: string
}

export function ExperimentList({ orgId, storeId }: ExperimentListProps) {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadExperiments()
  }, [orgId, storeId])

  const loadExperiments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/experiments', {
        headers: {
          'X-Org-ID': orgId,
          ...(storeId && { 'X-Store-ID': storeId })
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to load experiments')
      }
      
      const result = await response.json()
      setExperiments(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleStartExperiment = async (experimentId: string) => {
    try {
      const response = await fetch(`/api/experiments/${experimentId}/start`, {
        method: 'POST',
        headers: {
          'X-Org-ID': orgId
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to start experiment')
      }
      
      await loadExperiments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start experiment')
    }
  }

  const handlePauseExperiment = async (experimentId: string) => {
    try {
      const response = await fetch(`/api/experiments/${experimentId}/pause`, {
        method: 'POST',
        headers: {
          'X-Org-ID': orgId
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to pause experiment')
      }
      
      await loadExperiments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause experiment')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'text-green-600 bg-green-100'
      case 'PAUSED': return 'text-yellow-600 bg-yellow-100'
      case 'COMPLETED': return 'text-gray-600 bg-gray-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadExperiments}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Experiments</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Create Experiment
        </button>
      </div>

      {experiments.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No experiments</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new experiment.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {experiments.map((experiment) => (
              <li key={experiment.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(experiment.status)}`}>
                        {experiment.status}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{experiment.name}</div>
                      <div className="text-sm text-gray-500">{experiment.key}</div>
                      {experiment.description && (
                        <div className="text-sm text-gray-500 mt-1">{experiment.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-500">
                      {experiment.allocation}% allocation
                    </div>
                    <div className="text-sm text-gray-500">
                      {experiment.variants.length} variants
                    </div>
                    <div className="flex space-x-2">
                      {experiment.status === 'DRAFT' && (
                        <button
                          onClick={() => handleStartExperiment(experiment.id)}
                          className="text-green-600 hover:text-green-900 text-sm font-medium"
                        >
                          Start
                        </button>
                      )}
                      {experiment.status === 'RUNNING' && (
                        <button
                          onClick={() => handlePauseExperiment(experiment.id)}
                          className="text-yellow-600 hover:text-yellow-900 text-sm font-medium"
                        >
                          Pause
                        </button>
                      )}
                      <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}