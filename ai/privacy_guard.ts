/**
 * AI Privacy Guard
 * Redacts PII before any prompt or telemetry export
 * Enforces privacy-by-design principles
 */

export interface RedactionRule {
  pattern: RegExp;
  replacement: string;
  category: 'email' | 'phone' | 'ssn' | 'credit_card' | 'ip' | 'api_key' | 'custom';
}

export interface PrivacyConfig {
  enabled: boolean;
  strictMode: boolean;
  customRules?: RedactionRule[];
  allowedDomains?: string[];
}

export class PrivacyGuard {
  private rules: RedactionRule[];
  private strictMode: boolean;

  constructor(config: PrivacyConfig = { enabled: true, strictMode: true }) {
    this.strictMode = config.strictMode;
    this.rules = this.initializeRules(config);
  }

  /**
   * Initialize redaction rules
   */
  private initializeRules(config: PrivacyConfig): RedactionRule[] {
    const baseRules: RedactionRule[] = [
      // Email addresses
      {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[EMAIL_REDACTED]',
        category: 'email',
      },
      // Phone numbers (various formats)
      {
        pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        replacement: '[PHONE_REDACTED]',
        category: 'phone',
      },
      // SSN
      {
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        replacement: '[SSN_REDACTED]',
        category: 'ssn',
      },
      // Credit card numbers
      {
        pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
        replacement: '[CARD_REDACTED]',
        category: 'credit_card',
      },
      // IP addresses
      {
        pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        replacement: '[IP_REDACTED]',
        category: 'ip',
      },
      // API keys and tokens (generic patterns)
      {
        pattern: /\b[A-Za-z0-9_-]{32,}\b/g,
        replacement: '[TOKEN_REDACTED]',
        category: 'api_key',
      },
      // Bearer tokens
      {
        pattern: /Bearer\s+[A-Za-z0-9_\-\.]+/gi,
        replacement: 'Bearer [TOKEN_REDACTED]',
        category: 'api_key',
      },
      // AWS keys
      {
        pattern: /AKIA[0-9A-Z]{16}/g,
        replacement: '[AWS_KEY_REDACTED]',
        category: 'api_key',
      },
    ];

    if (config.customRules) {
      baseRules.push(...config.customRules);
    }

    return baseRules;
  }

  /**
   * Redact PII from text
   */
  redact(text: string, options: { preserveFormat?: boolean } = {}): string {
    if (!text) return text;

    let redacted = text;

    for (const rule of this.rules) {
      redacted = redacted.replace(rule.pattern, rule.replacement);
    }

    // Additional context-aware redactions in strict mode
    if (this.strictMode) {
      redacted = this.strictModeRedactions(redacted);
    }

    return redacted;
  }

  /**
   * Strict mode additional redactions
   */
  private strictModeRedactions(text: string): string {
    let redacted = text;

    // Password fields
    redacted = redacted.replace(
      /"password"\s*:\s*"[^"]+"/gi,
      '"password": "[REDACTED]"'
    );

    // Secret fields
    redacted = redacted.replace(
      /"secret"\s*:\s*"[^"]+"/gi,
      '"secret": "[REDACTED]"'
    );

    // Authorization headers
    redacted = redacted.replace(
      /Authorization:\s*[^\n]+/gi,
      'Authorization: [REDACTED]'
    );

    return redacted;
  }

  /**
   * Redact object properties
   */
  redactObject<T extends Record<string, unknown>>(obj: T): T {
    const redacted = JSON.parse(JSON.stringify(obj));

    const sensitiveKeys = [
      'password',
      'secret',
      'token',
      'apiKey',
      'api_key',
      'privateKey',
      'private_key',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'ssn',
      'creditCard',
      'credit_card',
    ];

    const redactRecursive = (obj: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
          obj[key] = '[REDACTED]';
        } else if (typeof value === 'string') {
          obj[key] = this.redact(value);
        } else if (typeof value === 'object' && value !== null) {
          redactRecursive(value as Record<string, unknown>);
        }
      }
    };

    redactRecursive(redacted);
    return redacted;
  }

  /**
   * Validate that text is safe to export
   */
  validate(text: string): { safe: boolean; violations: string[] } {
    const violations: string[] = [];

    for (const rule of this.rules) {
      const matches = text.match(rule.pattern);
      if (matches) {
        violations.push(`Found ${matches.length} ${rule.category} pattern(s)`);
      }
    }

    return {
      safe: violations.length === 0,
      violations,
    };
  }

  /**
   * Sanitize for AI prompt
   */
  sanitizeForPrompt(text: string): string {
    // First pass: standard redaction
    let sanitized = this.redact(text);

    // Remove any remaining suspicious patterns
    sanitized = sanitized.replace(/sk-[A-Za-z0-9]{48}/g, '[API_KEY_REDACTED]');
    sanitized = sanitized.replace(/ghp_[A-Za-z0-9]{36}/g, '[GITHUB_TOKEN_REDACTED]');

    return sanitized;
  }

  /**
   * Sanitize telemetry data
   */
  sanitizeTelemetry<T extends Record<string, unknown>>(data: T): T {
    const sanitized = this.redactObject(data);

    // Remove user-identifying fields
    const fieldsToRemove = ['userId', 'user_id', 'email', 'username', 'ip', 'ipAddress'];
    
    const removeFields = (obj: Record<string, unknown>) => {
      for (const field of fieldsToRemove) {
        if (field in obj) {
          delete obj[field];
        }
      }
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) {
          removeFields(value as Record<string, unknown>);
        }
      }
    };

    removeFields(sanitized);
    return sanitized;
  }

  /**
   * Generate privacy report
   */
  generateReport(data: string[]): {
    totalScanned: number;
    redactionsApplied: number;
    categories: Record<string, number>;
  } {
    const categories: Record<string, number> = {};
    let totalRedactions = 0;

    for (const text of data) {
      for (const rule of this.rules) {
        const matches = text.match(rule.pattern);
        if (matches) {
          const count = matches.length;
          categories[rule.category] = (categories[rule.category] || 0) + count;
          totalRedactions += count;
        }
      }
    }

    return {
      totalScanned: data.length,
      redactionsApplied: totalRedactions,
      categories,
    };
  }
}

/**
 * Singleton instance
 */
let globalGuard: PrivacyGuard | null = null;

export function getPrivacyGuard(config?: PrivacyConfig): PrivacyGuard {
  if (!globalGuard) {
    globalGuard = new PrivacyGuard(config);
  }
  return globalGuard;
}

/**
 * Decorator for automatic redaction
 */
export function withPrivacyGuard<T extends (...args: unknown[]) => unknown>(
  fn: T,
  guard?: PrivacyGuard
): T {
  const privacyGuard = guard || getPrivacyGuard();

  return ((...args: unknown[]) => {
    const sanitizedArgs = args.map((arg) => {
      if (typeof arg === 'string') {
        return privacyGuard.redact(arg);
      }
      if (typeof arg === 'object' && arg !== null) {
        return privacyGuard.redactObject(arg as Record<string, unknown>);
      }
      return arg;
    });

    return fn(...sanitizedArgs);
  }) as T;
}

/**
 * CLI testing utility
 */
export async function main() {
  const guard = new PrivacyGuard({ enabled: true, strictMode: true });

  const testCases = [
    'Contact me at john.doe@example.com or call 555-123-4567',
    'API Key: sk-1234567890abcdef1234567890abcdef1234567890abcdef',
    'Credit card: 4532-1234-5678-9010',
    'User IP: 192.168.1.1',
    JSON.stringify({
      email: 'user@test.com',
      password: 'secret123',
      apiKey: 'abc123xyz',
    }),
  ];

  console.log('🔒 Privacy Guard Test\n');

  for (const testCase of testCases) {
    console.log('Original:', testCase);
    console.log('Redacted:', guard.redact(testCase));
    console.log('---');
  }

  const report = guard.generateReport(testCases);
  console.log('\n📊 Privacy Report:');
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
