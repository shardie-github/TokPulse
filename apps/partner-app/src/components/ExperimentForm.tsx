import React, { useState } from 'react'

interface Variant {
  key: string
  name: string
  weight: number
  configJson: string
}

interface ExperimentFormProps {
  orgId: string
  storeId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ExperimentForm({ orgId, storeId, onSuccess, onCancel }: ExperimentFormProps) {
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    startAt: '',
    stopAt: '',
    guardrailMetric: '',
    allocation: 100
  })
  
  const [variants, setVariants] = useState<Variant[]>([
    { key: 'control', name: 'Control', weight: 50, configJson: '{}' },
    { key: 'treatment', name: 'Treatment', weight: 50, configJson: '{}' }
  ])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleVariantChange = (index: number, field: keyof Variant, value: string | number) => {
    setVariants(prev => prev.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    ))
  }

  const addVariant = () => {
    setVariants(prev => [...prev, {
      key: `variant_${prev.length + 1}`,
      name: `Variant ${prev.length + 1}`,
      weight: 0,
      configJson: '{}'
    }])
  }

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(prev => prev.filter((_, i) => i !== index))
    }
  }

  const validateForm = () => {
    if (!formData.key || !formData.name) {
      setError('Key and name are required')
      return false
    }
    
    if (variants.length < 2) {
      setError('At least 2 variants are required')
      return false
    }
    
    const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0)
    if (totalWeight !== 100) {
      setError('Variant weights must sum to 100%')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/experiments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-ID': orgId,
          ...(storeId && { 'X-Store-ID': storeId })
        },
        body: JSON.stringify({
          ...formData,
          startAt: formData.startAt ? new Date(formData.startAt).toISOString() : undefined,
          stopAt: formData.stopAt ? new Date(formData.stopAt).toISOString() : undefined,
          variants
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create experiment')
      }
      
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create experiment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Experiment Details</h3>
              <p className="mt-1 text-sm text-gray-500">
                Basic information about your experiment.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Experiment Key *
                  </label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => handleInputChange('key', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="my_experiment"
                  />
                </div>
                
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="My Experiment"
                  />
                </div>
                
                <div className="col-span-6">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Describe what this experiment tests..."
                  />
                </div>
                
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startAt}
                    onChange={(e) => handleInputChange('startAt', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.stopAt}
                    onChange={(e) => handleInputChange('stopAt', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Allocation (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.allocation}
                    onChange={(e) => handleInputChange('allocation', parseInt(e.target.value))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Guardrail Metric
                  </label>
                  <input
                    type="text"
                    value={formData.guardrailMetric}
                    onChange={(e) => handleInputChange('guardrailMetric', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="error_rate"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Variants</h3>
              <p className="mt-1 text-sm text-gray-500">
                Define the different variants for your experiment.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <div className="space-y-4">
                {variants.map((variant, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-6 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Key
                        </label>
                        <input
                          type="text"
                          value={variant.key}
                          onChange={(e) => handleVariantChange(index, 'key', e.target.value)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Name
                        </label>
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Weight (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={variant.weight}
                          onChange={(e) => handleVariantChange(index, 'weight', parseInt(e.target.value) || 0)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div className="col-span-1 flex items-end">
                        {variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Configuration (JSON)
                      </label>
                      <textarea
                        value={variant.configJson}
                        onChange={(e) => handleVariantChange(index, 'configJson', e.target.value)}
                        rows={3}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                        placeholder='{"title": "New Button", "color": "blue"}'
                      />
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addVariant}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400"
                >
                  <span className="text-sm font-medium text-gray-600">+ Add Variant</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Experiment'}
          </button>
        </div>
      </form>
    </div>
  )
}