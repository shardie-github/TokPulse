# Critical Fixes Needed for v1.0.0 Release

## Immediate Actions Required

### 1. Fix TypeScript rootDir Issues
**Problem**: Packages cannot import from other packages due to `rootDir` restrictions

**Solution**: Remove `rootDir` from all package `tsconfig.json` files and add proper path mappings:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@tokpulse/db": ["../db/src"],
      "@tokpulse/shared": ["../shared/src"]
    }
  }
}
```

**Files to fix**:
- `packages/api/tsconfig.json`
- `packages/jobs/tsconfig.json`
- `packages/billing/tsconfig.json`
- `packages/billing-api/tsconfig.json`
- `packages/rbac-api/tsconfig.json`

### 2. Add Missing Dependencies

**For API packages** (api, billing-api, rbac-api):
```bash
pnpm --filter @tokpulse/api add zod express
pnpm --filter @tokpulse/api add -D @types/express @types/node
```

**For all packages needing Node.js types**:
```bash
pnpm --filter @tokpulse/jobs add -D @types/node
pnpm --filter @tokpulse/billing add -D @types/node
pnpm --filter @tokpulse/billing-api add -D @types/node
pnpm --filter @tokpulse/rbac-api add -D @types/node
```

### 3. Fix Missing Files in Jobs Package

**Problem**: `packages/jobs/src/index.ts` imports non-existent files

**Files to create or fix**:
- `packages/jobs/src/catalog-sync.ts`
- `packages/jobs/src/creative-generation.ts`

### 4. Update Lockfile

```bash
pnpm install
```

### 5. Verify Fixes

```bash
# Check all packages
pnpm turbo run typecheck --filter="*"

# Check specific broken packages
pnpm --filter @tokpulse/api typecheck
pnpm --filter @tokpulse/jobs typecheck
```

## Quick Fix Script

```bash
#!/bin/bash

# Fix TypeScript configs
find packages -name "tsconfig.json" -exec sed -i 's/"rootDir": "\.\/src"//g' {} \;

# Add path mappings to all tsconfig.json files
for tsconfig in packages/*/tsconfig.json; do
  if [ -f "$tsconfig" ]; then
    # Add baseUrl and paths if not present
    if ! grep -q "baseUrl" "$tsconfig"; then
      sed -i 's/"compilerOptions": {/"compilerOptions": {\n    "baseUrl": ".",/g' "$tsconfig"
    fi
    if ! grep -q "paths" "$tsconfig"; then
      sed -i 's/"baseUrl": "."/"baseUrl": ".",\n    "paths": {\n      "@tokpulse\/db": ["..\/db\/src"],\n      "@tokpulse\/shared": ["..\/shared\/src"]\n    }/g' "$tsconfig"
    fi
  fi
done

# Install missing dependencies
pnpm --filter @tokpulse/api add zod express
pnpm --filter @tokpulse/api add -D @types/express @types/node
pnpm --filter @tokpulse/jobs add -D @types/node
pnpm --filter @tokpulse/billing add -D @types/node
pnpm --filter @tokpulse/billing-api add -D @types/node
pnpm --filter @tokpulse/rbac-api add -D @types/node

# Update lockfile
pnpm install

# Verify fixes
pnpm turbo run typecheck --filter="*"
```

## Expected Outcome

After applying these fixes:
- All TypeScript errors should be resolved
- All packages should build successfully
- Cross-package imports should work properly
- Dependencies should be properly installed

## Next Steps After Fixes

1. Run full quality check: `pnpm turbo run typecheck && pnpm turbo run lint && pnpm turbo run format:check && pnpm turbo run test`
2. Perform security audit
3. Perform observability audit
4. Clean up orphaned code
5. Prepare for v1.0.0 release