import { Layout } from '../../components/Layout'

export default function CreatingExperiments() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Creating Experiments</h1>
        <p className="mt-4 text-lg text-gray-600">
          Learn how to create and manage A/B tests and feature flags with TokPulse.
        </p>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-900">Overview</h2>
          <p className="mt-4 text-gray-600">
            Experiments in TokPulse allow you to:
          </p>
          <ul className="mt-4 list-disc list-inside text-gray-600 space-y-2">
            <li>Run A/B tests on your store</li>
            <li>Implement feature flags</li>
            <li>Test different configurations</li>
            <li>Measure impact on key metrics</li>
          </ul>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-900">Experiment Types</h2>
          
          <div className="mt-6">
            <h3 className="text-xl font-medium text-gray-900">A/B Tests</h3>
            <p className="mt-2 text-gray-600">
              Traditional A/B tests compare two or more variants to determine which performs better.
            </p>
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <p className="font-medium text-gray-900">Example: Testing different button colors</p>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>• Control: Blue button</li>
                <li>• Treatment: Green button</li>
                <li>• Metric: Click-through rate</li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-xl font-medium text-gray-900">Feature Flags</h3>
            <p className="mt-2 text-gray-600">
              Feature flags allow you to enable/disable features for different user segments.
            </p>
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <p className="font-medium text-gray-900">Example: New checkout flow</p>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>• Control: Current checkout</li>
                <li>• Treatment: New checkout flow</li>
                <li>• Rollout: Gradual (10% → 50% → 100%)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-900">Creating an Experiment</h2>
          
          <div className="mt-6">
            <h3 className="text-xl font-medium text-gray-900">1. Basic Setup</h3>
            <div className="mt-4 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
{`curl -X POST http://localhost:3001/api/experiments \\
  -H "Content-Type: application/json" \\
  -H "X-Org-ID: your-org-id" \\
  -d '{
    "key": "checkout_flow_test",
    "name": "Checkout Flow Test",
    "description": "Test new checkout flow vs current",
    "allocation": 100,
    "variants": [
      {
        "key": "control",
        "name": "Current Flow",
        "weight": 50,
        "configJson": "{\\"flow\\": \\"current\\"}"
      },
      {
        "key": "treatment",
        "name": "New Flow",
        "weight": 50,
        "configJson": "{\\"flow\\": \\"new\\", \\"steps\\": 3}"
      }
    ]
  }'`}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-900">Best Practices</h2>
          
          <div className="mt-6">
            <h3 className="text-xl font-medium text-gray-900">Experiment Design</h3>
            <ol className="mt-4 list-decimal list-inside text-gray-600 space-y-2">
              <li><strong>Clear Hypothesis</strong>: Define what you're testing and why</li>
              <li><strong>Single Variable</strong>: Test one change at a time</li>
              <li><strong>Statistical Significance</strong>: Ensure adequate sample size</li>
              <li><strong>Duration</strong>: Run for at least one business cycle</li>
            </ol>
          </div>

          <div className="mt-6">
            <h3 className="text-xl font-medium text-gray-900">Configuration</h3>
            <ol className="mt-4 list-decimal list-inside text-gray-600 space-y-2">
              <li><strong>Fallbacks</strong>: Always provide fallback behavior</li>
              <li><strong>Validation</strong>: Validate configuration JSON</li>
              <li><strong>Testing</strong>: Test variants before launching</li>
              <li><strong>Monitoring</strong>: Set up alerts and guardrails</li>
            </ol>
          </div>
        </div>
      </div>
    </Layout>
  )
}