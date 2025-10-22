# Repository Housekeeping Plan
**Date:** 2024-12-20  
**Author:** Scott Hardie  
**Branch:** housekeeping/auto/20241220-1430

## Executive Summary

This plan outlines a comprehensive housekeeping pass for the TokPulse repository, focusing on code quality, security, documentation, and developer experience improvements. The repository is a TypeScript/React monorepo using pnpm, Turbo, and Vite with multiple apps and packages.

## Phase 0 — Self-Diagnosis Results

### Repository Topology
- **Type:** Monorepo (pnpm workspace + Turbo)
- **Structure:** `/apps/*` and `/packages/*` pattern
- **Package Manager:** pnpm@8.15.0
- **Build System:** Turbo with Vite
- **Primary Languages:** TypeScript, JavaScript, React

### Detected Tech Stack
- **Frontend:** React 18, TypeScript 5.4+, Vite 5.4+
- **Testing:** Vitest 1.6+, Playwright 1.56+, Testing Library
- **Linting:** ESLint 8.57+ with TypeScript rules
- **Formatting:** Prettier 3.3+
- **CI/CD:** GitHub Actions with comprehensive workflows
- **Security:** Dependabot, CodeQL, Trivy scanning

### Current Configuration Analysis
- **ESLint:** Two conflicting configs (.eslintrc.cjs and .eslintrc.json)
- **Prettier:** Configured with single quotes, semicolons, trailing commas
- **Biome:** Installed but not configured (potential conflict with ESLint)
- **Husky:** Pre-commit hooks configured
- **Lint-staged:** Configured for staged files

### Identified Issues
1. **Conflicting ESLint configs** - Two different configurations present
2. **Biome installed but unused** - Potential tool conflict
3. **Missing .gitattributes** - No line ending normalization
4. **Inconsistent package.json engines** - Some packages use npm, others pnpm
5. **No unified code quality standards** - Each package has its own config

## Phase 1 — Apply Foundations (Quick Wins)

### 1.1 Git Configuration
- [x] Set git user.name to "Scott Hardie"
- [x] Set git user.email to "hardoniastore@gmail.com"
- [x] Create working branch: housekeeping/auto/20241220-1430
- [x] Create backup branch: backup/20241220-pre-housekeeping

### 1.2 Standardize Git Files
- [ ] Create .gitattributes for line ending normalization
- [ ] Enhance .gitignore with comprehensive patterns
- [ ] Verify .editorconfig is optimal

### 1.3 Repository Structure
- [ ] Ensure consistent directory structure
- [ ] Add missing documentation directories if needed

## Phase 2 — Tooling Resolution (Moderate)

### 2.1 ESLint Configuration Cleanup
**Issue:** Two conflicting ESLint configurations
**Solution:** Consolidate to single flat config (eslint.config.js)
**Rationale:** Modern ESLint flat config is more maintainable and performant

### 2.2 Tool Selection Matrix
**JavaScript/TypeScript Stack:**
- **Formatter:** Prettier (already configured, keep existing)
- **Linter:** ESLint with flat config (consolidate existing)
- **Type Checker:** tsc --noEmit (already configured)
- **Test Runner:** Vitest (already configured)
- **E2E:** Playwright (already configured)

**Decision:** Remove Biome to avoid conflicts, standardize on ESLint + Prettier

### 2.3 Configuration Standardization
- [ ] Create unified eslint.config.js
- [ ] Remove conflicting .eslintrc.* files
- [ ] Remove unused Biome dependency
- [ ] Standardize package.json engines across all packages
- [ ] Create unified prettier configuration

## Phase 3 — Code Quality Fixes (Non-Breaking)

### 3.1 Auto-Fixable Issues
- [ ] Run ESLint --fix across entire codebase
- [ ] Run Prettier --write for consistent formatting
- [ ] Remove unused imports and variables
- [ ] Fix import ordering

### 3.2 Dead Code Cleanup
- [ ] Identify and remove unused files
- [ ] Archive legacy code to /archive/20241220/ if uncertain
- [ ] Remove duplicate dependencies

### 3.3 Naming Consistency
- [ ] Ensure consistent file naming conventions
- [ ] Verify folder structure follows monorepo best practices

## Phase 4 — Security & Dependencies

### 4.1 Security Scanning
- [ ] Run secret scanning (gitleaks/trufflehog)
- [ ] Audit dependencies for vulnerabilities
- [ ] Review and update SECURITY.md

### 4.2 Dependency Management
- [ ] Ensure Dependabot is optimally configured
- [ ] Update critical vulnerabilities (patch/minor only)
- [ ] Regenerate lockfiles if needed

## Phase 5 — CI/CD Enhancement

### 5.1 GitHub Actions Optimization
- [ ] Review existing CI workflows
- [ ] Add caching optimizations
- [ ] Ensure matrix jobs for monorepo packages
- [ ] Add quality gates (lint, test, build)

### 5.2 Workflow Improvements
- [ ] Add concurrency groups
- [ ] Implement path-based filtering
- [ ] Add build artifacts caching

## Phase 6 — Documentation Overhaul

### 6.1 README Enhancement
- [ ] Rewrite README.md with clear value proposition
- [ ] Add quick start guide
- [ ] Document development workflow
- [ ] Add troubleshooting section

### 6.2 Contributor Documentation
- [ ] Update CONTRIBUTING.md
- [ ] Ensure CODE_OF_CONDUCT.md is current
- [ ] Add architecture documentation
- [ ] Create issue and PR templates

## Phase 7 — Branch & PR Management

### 7.1 Branch Analysis
- [ ] Identify stale branches (>90 days)
- [ ] List merged branches for cleanup
- [ ] Document branch pruning plan

### 7.2 PR Strategy
- [ ] Create single comprehensive PR
- [ ] Include detailed change summary
- [ ] Add review checklist

## Phase 8 — Final Deliverables

### 8.1 Documentation
- [ ] HOUSEKEEPING_PLAN.md (this file)
- [ ] HOUSEKEEPING_REPORT_20241220.md
- [ ] branch_prune_20241220.md

### 8.2 PR Creation
- [ ] Title: "Housekeeping: structure, quality, security, CI, and docs (Scott)"
- [ ] Comprehensive change summary
- [ ] Links to all documentation
- [ ] Review checklist

## Risk Assessment

### Low Risk
- Formatting changes (Prettier)
- Dead code removal
- Documentation updates
- Configuration consolidation

### Medium Risk
- ESLint configuration changes (may require manual fixes)
- Dependency updates (test thoroughly)
- CI workflow modifications

### High Risk
- None identified in this plan

## Manual Approval Required

### History Rewrite Considerations
- No history rewrites planned
- All changes are additive or non-breaking
- Backup branch created for safety

### Secret Exposure
- Will scan for secrets and document findings
- No automatic secret rotation (manual process required)

## Success Metrics

- [ ] Zero ESLint errors/warnings
- [ ] Consistent formatting across codebase
- [ ] All CI checks passing
- [ ] No security vulnerabilities
- [ ] Comprehensive documentation
- [ ] Clean branch structure

## Implementation Timeline

- **Phase 1-2:** Foundation and tooling (1-2 hours)
- **Phase 3-4:** Code quality and security (1-2 hours)
- **Phase 5-6:** CI/CD and documentation (1-2 hours)
- **Phase 7-8:** Final cleanup and PR (30 minutes)

**Total Estimated Time:** 3-5 hours

---

*This plan follows conventional commit standards and maintains Scott's authorship throughout.*