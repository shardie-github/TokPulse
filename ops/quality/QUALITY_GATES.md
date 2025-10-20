# TokPulse Quality Gates

## Overview
Comprehensive quality assurance pipeline ensuring code quality, security, performance, and maintainability.

## Quality Gates

### 1. TypeScript Strict Mode
- **Command**: `npm run typecheck`
- **Threshold**: Zero type errors
- **Configuration**: `packages/dashboard/tsconfig.json`
- **Features**:
  - Strict null checks
  - No implicit any
  - No unused locals/parameters
  - Exact optional property types
  - No unchecked indexed access

### 2. ESLint Security & Code Quality
- **Command**: `npm run lint`
- **Threshold**: Zero warnings
- **Configuration**: `.eslintrc.json`
- **Rules**:
  - TypeScript recommended
  - React hooks rules
  - JSX accessibility
  - Security vulnerabilities
  - Code quality best practices

### 3. Prettier Code Formatting
- **Command**: `npm run format:check`
- **Threshold**: All files formatted
- **Configuration**: `.prettierrc.json`
- **Features**:
  - Consistent formatting
  - Single quotes
  - Trailing commas
  - 100 character line length

### 4. Testing Coverage
- **Command**: `npm run test:coverage`
- **Threshold**: 80% global coverage
- **Critical Modules**: 90% coverage
- **Configuration**: `packages/dashboard/vite.config.ts`
- **Coverage Areas**:
  - Branches: 80%
  - Functions: 80%
  - Lines: 80%
  - Statements: 80%

### 5. Dependency Security
- **Command**: `npm run audit:deps`
- **Threshold**: Zero moderate+ vulnerabilities
- **Features**:
  - npm audit
  - License compliance
  - Abandoned package detection

### 6. Performance Budgets
- **Command**: `npm run perf:budgets`
- **Thresholds**:
  - LCP ≤ 2.5s (p75)
  - CLS ≤ 0.1
  - INP ≤ 200ms
  - TTFB ≤ 0.8s
  - Bundle size ≤ 1MB

### 7. Accessibility Compliance
- **Command**: `npm run test:a11y`
- **Threshold**: WCAG 2.2 AA compliance
- **Tools**: axe-core, jest-axe
- **Areas**:
  - Keyboard navigation
  - Screen reader support
  - Color contrast
  - Focus management

## CI/CD Integration

### Pre-commit Hooks
```bash
# Install husky
npm run prepare

# Hooks run automatically:
# - lint-staged (format + lint)
# - typecheck
# - tests
```

### GitHub Actions
- **PR Checks**: All quality gates must pass
- **Main Branch**: Additional security scans
- **Release**: Performance budgets enforced

## Quality Commands

### Development
```bash
# Quick quality check
npm run quality:check

# Fix auto-fixable issues
npm run quality:fix

# Type checking only
npm run typecheck

# Linting only
npm run lint

# Formatting only
npm run format
```

### Testing
```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui
```

### Performance
```bash
# Build with analysis
npm run build:analyze

# Check performance budgets
npm run perf:budgets
```

### Security
```bash
# Audit dependencies
npm run audit:deps

# Check licenses
npm run audit:licenses

# Spell check
npm run spell:check
```

## Quality Metrics

### Code Quality
- **TypeScript Coverage**: 100%
- **ESLint Warnings**: 0
- **Prettier Issues**: 0
- **Test Coverage**: ≥80%

### Security
- **Vulnerabilities**: 0 moderate+
- **License Compliance**: 100%
- **Dependency Health**: All active

### Performance
- **Bundle Size**: ≤1MB
- **LCP**: ≤2.5s
- **CLS**: ≤0.1
- **INP**: ≤200ms

### Accessibility
- **WCAG Compliance**: 2.2 AA
- **Keyboard Navigation**: 100%
- **Screen Reader**: Compatible
- **Color Contrast**: ≥4.5:1

## Quality Tools

### Linting & Formatting
- **ESLint**: Code quality and security
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Husky**: Git hooks
- **lint-staged**: Pre-commit formatting

### Testing
- **Vitest**: Test runner
- **Testing Library**: Component testing
- **jsdom**: DOM simulation
- **@testing-library/jest-dom**: Custom matchers

### Security
- **npm audit**: Vulnerability scanning
- **license-checker**: License compliance
- **cspell**: Spell checking

### Performance
- **Vite Bundle Analyzer**: Bundle analysis
- **Lighthouse CI**: Performance budgets
- **Web Vitals**: Core metrics

## Quality Exceptions

### Test Coverage Exceptions
- `src/test/` - Test utilities
- `**/*.d.ts` - Type definitions
- `**/*.config.*` - Configuration files
- `**/index.ts` - Barrel exports

### ESLint Exceptions
- `**/*.test.*` - Test files (relaxed rules)
- `**/*.spec.*` - Spec files (relaxed rules)
- `**/node_modules/**` - Dependencies

## Quality Monitoring

### Daily
- Automated CI runs
- Dependency updates
- Security scans

### Weekly
- Performance budget review
- Test coverage analysis
- Code quality metrics

### Monthly
- Dependency audit
- License compliance check
- Accessibility audit

## Quality Escalation

### Level 1: Developer
- Fix issues locally
- Run quality checks
- Update tests

### Level 2: Team Lead
- Review quality metrics
- Approve exceptions
- Update thresholds

### Level 3: Engineering Manager
- Quality policy changes
- Tool updates
- Process improvements