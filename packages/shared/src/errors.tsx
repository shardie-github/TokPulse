import type { z } from 'zod';

// Error types
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource Management
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Business Logic
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  TRIAL_EXPIRED = 'TRIAL_EXPIRED',

  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SHOPIFY_API_ERROR = 'SHOPIFY_API_ERROR',
  STRIPE_API_ERROR = 'STRIPE_API_ERROR',

  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Base error class
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: ErrorCode,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>,
  ) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.VALIDATION_ERROR, ErrorSeverity.LOW, 400, true, context);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', context?: Record<string, any>) {
    super(message, ErrorCode.UNAUTHORIZED, ErrorSeverity.MEDIUM, 401, true, context);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', context?: Record<string, any>) {
    super(message, ErrorCode.FORBIDDEN, ErrorSeverity.MEDIUM, 403, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, any>) {
    super(`${resource} not found`, ErrorCode.NOT_FOUND, ErrorSeverity.LOW, 404, true, context);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.CONFLICT, ErrorSeverity.MEDIUM, 409, true, context);
  }
}

export class QuotaExceededError extends AppError {
  constructor(resource: string, limit: number, current: number, context?: Record<string, any>) {
    super(
      `${resource} quota exceeded. Limit: ${limit}, Current: ${current}`,
      ErrorCode.QUOTA_EXCEEDED,
      ErrorSeverity.HIGH,
      429,
      true,
      { resource, limit, current, ...context },
    );
  }
}

export class SubscriptionRequiredError extends AppError {
  constructor(feature: string, context?: Record<string, any>) {
    super(
      `Subscription required for ${feature}`,
      ErrorCode.SUBSCRIPTION_REQUIRED,
      ErrorSeverity.MEDIUM,
      402,
      true,
      { feature, ...context },
    );
  }
}

export class TrialExpiredError extends AppError {
  constructor(context?: Record<string, any>) {
    super(
      'Trial period has expired',
      ErrorCode.TRIAL_EXPIRED,
      ErrorSeverity.HIGH,
      402,
      true,
      context,
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(
      `${service} service error: ${message}`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      ErrorSeverity.HIGH,
      502,
      true,
      { service, ...context },
    );
  }
}

export class ShopifyApiError extends ExternalServiceError {
  constructor(message: string, context?: Record<string, any>) {
    super('Shopify', message, context);
    Object.defineProperty(this, 'code', { value: ErrorCode.SHOPIFY_API_ERROR, writable: false });
  }
}

export class StripeApiError extends ExternalServiceError {
  constructor(message: string, context?: Record<string, any>) {
    super('Stripe', message, context);
    Object.defineProperty(this, 'code', { value: ErrorCode.STRIPE_API_ERROR, writable: false });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.DATABASE_ERROR, ErrorSeverity.HIGH, 500, true, context);
  }
}

export class InternalError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.INTERNAL_ERROR, ErrorSeverity.CRITICAL, 500, false, context);
  }
}

// Error handler utility
export class ErrorHandler {
  static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  static getErrorCode(error: Error): ErrorCode {
    if (error instanceof AppError) {
      return error.code;
    }
    return ErrorCode.INTERNAL_ERROR;
  }

  static getStatusCode(error: Error): number {
    if (error instanceof AppError) {
      return error.statusCode;
    }
    return 500;
  }

  static getSeverity(error: Error): ErrorSeverity {
    if (error instanceof AppError) {
      return error.severity;
    }
    return ErrorSeverity.CRITICAL;
  }

  static shouldLog(error: Error): boolean {
    const severity = this.getSeverity(error);
    return severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL;
  }

  static shouldAlert(error: Error): boolean {
    const severity = this.getSeverity(error);
    return severity === ErrorSeverity.CRITICAL;
  }

  static formatForClient(error: Error): {
    message: string;
    code: string;
    statusCode: number;
  } {
    if (error instanceof AppError) {
      return {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
      };
    }

    // Don't expose internal errors to clients
    return {
      message: 'An unexpected error occurred',
      code: ErrorCode.INTERNAL_ERROR,
      statusCode: 500,
    };
  }

  static formatForLogging(error: Error): any {
    if (error instanceof AppError) {
      return error.toJSON();
    }

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
    };
  }
}

// Validation error helpers
export function createValidationError(
  field: string,
  message: string,
  value?: any,
): ValidationError {
  return new ValidationError(`Validation failed for field '${field}': ${message}`, {
    field,
    value,
  });
}

export function createZodValidationError(zodError: z.ZodError): ValidationError {
  const errors = zodError.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return new ValidationError('Validation failed', {
    errors,
    fieldCount: errors.length,
  });
}

// Error boundary for React components
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

import React from 'react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error!} />;
      }

      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}
