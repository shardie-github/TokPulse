import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { getRecommendations } from '@tokpulse/api'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { productHandle } = params
  const url = new URL(request.url)
  const shop = url.searchParams.get('shop')
  const experimentId = url.searchParams.get('experimentId')

  if (!shop) {
    throw new Response('Missing shop parameter', { status: 400 })
  }

  try {
    const recommendations = await getRecommendations({
      shop,
      productHandle: productHandle!,
      experimentId: experimentId || undefined,
    })

    return json({
      productHandle,
      shop,
      recommendations,
      experimentId,
    })
  } catch (error) {
    console.error('Failed to load recommendations:', error)
    return json({
      productHandle,
      shop,
      recommendations: [],
      experimentId,
      error: 'Failed to load recommendations',
    })
  }
}

export default function RecommendationsPage() {
  const { productHandle, shop, recommendations, experimentId, error } = useLoaderData<typeof loader>()

  return (
    <div className="tokpulse-recommendations-page">
      <h1>Recommendations for {productHandle}</h1>
      <p>Shop: {shop}</p>
      {experimentId && <p>Experiment: {experimentId}</p>}
      
      {error ? (
        <div className="error">
          <p>{error}</p>
        </div>
      ) : (
        <div className="recommendations-grid">
          {recommendations.map((rec) => (
            <div key={rec.productId} className="recommendation-item">
              {rec.image && (
                <img 
                  src={rec.image} 
                  alt={rec.title}
                  className="recommendation-image"
                />
              )}
              <h3 className="recommendation-title">{rec.title}</h3>
              <p className="recommendation-price">${rec.price}</p>
              {rec.reason && (
                <p className="recommendation-reason">{rec.reason}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}