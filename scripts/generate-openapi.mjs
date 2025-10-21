#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

// OpenAPI specification
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'TokPulse API',
    description: 'E-commerce analytics and optimization platform API',
    version: '1.0.0',
    contact: {
      name: 'TokPulse Support',
      email: 'support@tokpulse.com',
      url: 'https://tokpulse.com/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'https://api.tokpulse.com',
      description: 'Production server'
    },
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    }
  ],
  security: [
    {
      ApiKeyAuth: []
    },
    {
      BearerAuth: []
    }
  ],
  paths: {
    '/internal/metrics': {
      get: {
        summary: 'Prometheus metrics endpoint',
        description: 'Returns Prometheus-formatted metrics for monitoring',
        tags: ['Monitoring'],
        responses: {
          '200': {
            description: 'Prometheus metrics',
            content: {
              'text/plain': {
                schema: {
                  type: 'string',
                  example: '# HELP tokpulse_api_requests_total Total API requests\n# TYPE tokpulse_api_requests_total counter\ntokpulse_api_requests_total{route="/api/experiments",method="GET",code="200",storeId="store_123"} 42'
                }
              }
            }
          }
        }
      }
    },
    '/api/experiments': {
      get: {
        summary: 'Get active experiments',
        description: 'Retrieve all active experiments for an organization',
        tags: ['Experiments'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'X-Org-ID',
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Organization ID'
          },
          {
            name: 'X-Store-ID',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'Store ID (optional)'
          }
        ],
        responses: {
          '200': {
            description: 'List of active experiments',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Experiment'
                      }
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create experiment',
        description: 'Create a new experiment',
        tags: ['Experiments'],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateExperimentRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Experiment created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      $ref: '#/components/schemas/Experiment'
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationError'
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    '/api/experiments/assign': {
      post: {
        summary: 'Get experiment assignment',
        description: 'Get assignment for a subject in an experiment',
        tags: ['Experiments'],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AssignmentRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Assignment result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      oneOf: [
                        { $ref: '#/components/schemas/Assignment' },
                        { type: 'null' }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/experiments/exposure': {
      post: {
        summary: 'Record experiment exposure',
        description: 'Record that a subject was exposed to an experiment',
        tags: ['Experiments'],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ExposureRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Exposure recorded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      $ref: '#/components/schemas/Exposure'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/experiments/{id}': {
      put: {
        summary: 'Update experiment',
        description: 'Update an existing experiment',
        tags: ['Experiments'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Experiment ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateExperimentRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Experiment updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      $ref: '#/components/schemas/Experiment'
                    }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        summary: 'Delete experiment',
        description: 'Delete an experiment',
        tags: ['Experiments'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Experiment ID'
          }
        ],
        responses: {
          '200': {
            description: 'Experiment deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        deleted: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/experiments/{id}/start': {
      post: {
        summary: 'Start experiment',
        description: 'Start a draft experiment',
        tags: ['Experiments'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Experiment ID'
          }
        ],
        responses: {
          '200': {
            description: 'Experiment started successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        status: { type: 'string', enum: ['RUNNING'] }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/experiments/{id}/pause': {
      post: {
        summary: 'Pause experiment',
        description: 'Pause a running experiment',
        tags: ['Experiments'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Experiment ID'
          }
        ],
        responses: {
          '200': {
            description: 'Experiment paused successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        status: { type: 'string', enum: ['PAUSED'] }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for authentication'
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for authentication'
      }
    },
    schemas: {
      Experiment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          key: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          status: { 
            type: 'string', 
            enum: ['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED'] 
          },
          startAt: { type: 'string', format: 'date-time' },
          stopAt: { type: 'string', format: 'date-time' },
          allocation: { type: 'number', minimum: 0, maximum: 100 },
          guardrailMetric: { type: 'string' },
          variants: {
            type: 'array',
            items: { $ref: '#/components/schemas/Variant' }
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Variant: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          key: { type: 'string' },
          name: { type: 'string' },
          weight: { type: 'number', minimum: 0, maximum: 100 },
          configJson: { type: 'string' }
        }
      },
      Assignment: {
        type: 'object',
        properties: {
          experimentId: { type: 'string' },
          variantId: { type: 'string' },
          variantKey: { type: 'string' },
          config: { type: 'object' },
          isNewAssignment: { type: 'boolean' }
        }
      },
      Exposure: {
        type: 'object',
        properties: {
          experimentId: { type: 'string' },
          variantId: { type: 'string' },
          variantKey: { type: 'string' },
          config: { type: 'object' },
          recorded: { type: 'boolean' }
        }
      },
      CreateExperimentRequest: {
        type: 'object',
        required: ['key', 'name', 'variants'],
        properties: {
          key: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          startAt: { type: 'string', format: 'date-time' },
          stopAt: { type: 'string', format: 'date-time' },
          allocation: { type: 'number', minimum: 0, maximum: 100, default: 100 },
          guardrailMetric: { type: 'string' },
          variants: {
            type: 'array',
            items: { $ref: '#/components/schemas/Variant' }
          }
        }
      },
      UpdateExperimentRequest: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          startAt: { type: 'string', format: 'date-time' },
          stopAt: { type: 'string', format: 'date-time' },
          allocation: { type: 'number', minimum: 0, maximum: 100 },
          guardrailMetric: { type: 'string' },
          variants: {
            type: 'array',
            items: { $ref: '#/components/schemas/Variant' }
          }
        }
      },
      AssignmentRequest: {
        type: 'object',
        required: ['orgId', 'subjectKey', 'experimentKey'],
        properties: {
          orgId: { type: 'string' },
          storeId: { type: 'string' },
          subjectKey: { type: 'string' },
          experimentKey: { type: 'string' }
        }
      },
      ExposureRequest: {
        type: 'object',
        required: ['orgId', 'storeId', 'subjectKey', 'experimentKey', 'surface'],
        properties: {
          orgId: { type: 'string' },
          storeId: { type: 'string' },
          subjectKey: { type: 'string' },
          experimentKey: { type: 'string' },
          surface: { type: 'string' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' }
        }
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Experiments',
      description: 'A/B testing and feature flag management'
    },
    {
      name: 'Monitoring',
      description: 'Metrics and observability endpoints'
    }
  ]
}

// Write OpenAPI spec to file
const outputPath = path.join(rootDir, 'docs', 'openapi.json')
fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2))

console.log(`✅ OpenAPI specification generated: ${outputPath}`)

// Also write to docs site
const docsPath = path.join(rootDir, 'apps', 'docs', 'public', 'openapi.json')
fs.writeFileSync(docsPath, JSON.stringify(openApiSpec, null, 2))

console.log(`✅ OpenAPI specification copied to docs site: ${docsPath}`)