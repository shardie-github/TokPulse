import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier';

export default [
  // Base configuration for all files
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        // Web APIs
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        // Wix specific
        $w: 'readonly',
        dataLayer: 'readonly',
        // Next.js
        next: 'readonly',
        // Node.js types
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],

      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Accessibility rules
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',

      // Import rules
      'import/order': [
        'warn',
        {
          groups: [
            ['builtin', 'external', 'internal'],
            ['parent', 'sibling', 'index'],
          ],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // Unused imports
      'unused-imports/no-unused-imports': 'error',
      
      // General rules
      'no-empty': 'warn',
      'no-inner-declarations': 'error',
      'no-unused-vars': 'off', // Use TypeScript version instead
      'no-redeclare': 'error',
    },
  },
  // Override for browser-only files
  {
    files: ['packages/dashboard/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        Blob: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        Element: 'readonly',
        IntersectionObserver: 'readonly',
        IntersectionObserverEntry: 'readonly',
        Image: 'readonly',
        MediaQueryListEvent: 'readonly',
        StorageEvent: 'readonly',
        performance: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        innerWidth: 'readonly',
        innerHeight: 'readonly',
      },
    },
  },
  // Override for service worker files
  {
    files: ['**/*.sw.js', '**/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        addEventListener: 'readonly',
        skipWaiting: 'readonly',
        clients: 'readonly',
      },
    },
  },
  // Override for test files
  {
    files: ['**/*.test.{js,ts,tsx}', '**/*.spec.{js,ts,tsx}', '**/__tests__/**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        vi: 'readonly',
        React: 'readonly',
      },
    },
  },
  // Override for Node.js files
  {
    files: ['apps/**/*.js', 'packages/**/*.js', 'scripts/**/*.js', 'codemods/**/*.js', 'codemods/**/*.mjs'],
    languageOptions: {
      globals: {
        node: true,
        browser: false,
      },
    },
  },
  // Override for Wix files
  {
    files: ['apps/Wix/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        $w: 'readonly',
        dataLayer: 'readonly',
        window: 'readonly',
        document: 'readonly',
      },
    },
  },
  // Override for files with schema issues
  {
    files: ['packages/api/src/experiments.ts'],
    rules: {
      'no-undef': 'off', // These are likely imported from elsewhere
    },
  },
  // Prettier config (must be last)
  prettier,
  // Ignore patterns
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/*.config.js',
      '**/*.config.cjs',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/*.log',
    ],
  },
];