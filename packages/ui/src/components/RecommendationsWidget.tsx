import React, { useState, useEffect } from 'react'

export interface Recommendation {
  productId: string
  title: string
  handle: string
  price: number
  image?: string
  reason?: string
}

export interface RecommendationsWidgetProps {
  productId: string
  variantId?: string
  shop: string
  experimentId?: string
  maxItems?: number
  className?: string
}

export function RecommendationsWidget({
  productId,
  variantId,
  shop,
  experimentId,
  maxItems = 4,
  className = '',
}: RecommendationsWidgetProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setLoading(true)
        setError(null)

        // In a real implementation, this would call the API
        // For now, we'll simulate with mock data
        const mockRecommendations: Recommendation[] = [
          {
            productId: 'mock-1',
            title: 'Mock Product 1',
            handle: 'mock-product-1',
            price: 29.99,
            image: 'https://via.placeholder.com/200x200',
            reason: 'Similar product type',
          },
          {
            productId: 'mock-2',
            title: 'Mock Product 2',
            handle: 'mock-product-2',
            price: 39.99,
            image: 'https://via.placeholder.com/200x200',
            reason: 'Popular choice',
          },
        ]

        setRecommendations(mockRecommendations.slice(0, maxItems))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recommendations')
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [productId, variantId, shop, experimentId, maxItems])

  if (loading) {
    return (
      <div className={`tokpulse-recommendations-widget ${className}`}>
        <div className="loading">Loading recommendations...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`tokpulse-recommendations-widget ${className}`}>
        <div className="error">Unable to load recommendations: {error}</div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className={`tokpulse-recommendations-widget ${className}`}>
        <div className="empty">No recommendations available</div>
      </div>
    )
  }

  return (
    <div className={`tokpulse-recommendations-widget ${className}`}>
      <h3 className="title">You might also like</h3>
      <div className="recommendations-grid">
        {recommendations.map((rec) => (
          <div key={rec.productId} className="recommendation-item">
            {rec.image && (
              <img
                src={rec.image}
                alt={rec.title}
                className="image"
                loading="lazy"
              />
            )}
            <div className="content">
              <h4 className="title">{rec.title}</h4>
              <p className="price">${rec.price.toFixed(2)}</p>
              {rec.reason && (
                <p className="reason">{rec.reason}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}