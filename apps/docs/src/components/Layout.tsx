import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface LayoutProps {
  children: React.ReactNode
}

const navigation = [
  {
    name: 'Getting Started',
    children: [
      { name: 'Installation', href: '/getting-started/installation' },
      { name: 'Quick Start', href: '/getting-started/quick-start' },
      { name: 'Configuration', href: '/getting-started/configuration' },
    ]
  },
  {
    name: 'API Reference',
    children: [
      { name: 'Authentication', href: '/api/authentication' },
      { name: 'Webhooks', href: '/api/webhooks' },
      { name: 'Experiments', href: '/api/experiments' },
      { name: 'Analytics', href: '/api/analytics' },
    ]
  },
  {
    name: 'Integrations',
    children: [
      { name: 'Shopify', href: '/integrations/shopify' },
      { name: 'Hydrogen', href: '/integrations/hydrogen' },
      { name: 'Theme Extension', href: '/integrations/theme-extension' },
    ]
  },
  {
    name: 'Experiments',
    children: [
      { name: 'Creating Experiments', href: '/experiments/creating' },
      { name: 'A/B Testing', href: '/experiments/ab-testing' },
      { name: 'Feature Flags', href: '/experiments/feature-flags' },
      { name: 'Guardrails', href: '/experiments/guardrails' },
    ]
  },
  {
    name: 'Observability',
    children: [
      { name: 'Telemetry', href: '/observability/telemetry' },
      { name: 'Metrics', href: '/observability/metrics' },
      { name: 'Logging', href: '/observability/logging' },
      { name: 'Tracing', href: '/observability/tracing' },
    ]
  },
  {
    name: 'Runbooks',
    children: [
      { name: 'Webhook Redelivery', href: '/runbooks/webhook-redelivery' },
      { name: 'DLQ Drain', href: '/runbooks/dlq-drain' },
      { name: 'High Error Rate', href: '/runbooks/high-error-rate' },
      { name: 'Data Retention', href: '/runbooks/data-retention' },
    ]
  },
  {
    name: 'Operations',
    children: [
      { name: 'Deployment', href: '/operations/deployment' },
      { name: 'Monitoring', href: '/operations/monitoring' },
      { name: 'Scaling', href: '/operations/scaling' },
      { name: 'Security', href: '/operations/security' },
    ]
  }
]

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <h1 className="text-xl font-bold text-gray-900">TokPulse Docs</h1>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((section) => (
                <div key={section.name}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                    {section.name}
                  </div>
                  {section.children.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        router.pathname === item.href
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white border-r border-gray-200">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold text-gray-900">TokPulse Docs</h1>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((section) => (
                <div key={section.name}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                    {section.name}
                  </div>
                  {section.children.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        router.pathname === item.href
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}