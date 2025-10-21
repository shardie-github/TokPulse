// Types - using string literals instead of enums for SQLite compatibility
export type UserRole = 'OWNER' | 'ADMIN' | 'ANALYST' | 'VIEWER'
export type StoreStatus = 'ACTIVE' | 'SUSPENDED' | 'UNINSTALLED'
export type ExperimentStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED'
export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

// Validation schemas
export * from './validation'

// Feature flags
export * from './feature-flags'

// Auth utilities
export * from './auth'

// Telemetry
export * from './telemetry'