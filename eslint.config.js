import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-electron/**',
      'release/**',
      'node_modules/**',
      'coverage/**',
      '*.min.js',
      'electron/*.test.mjs',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Console — all logging must go through loggerService
      'no-console': 'error',

      // React
      'react/jsx-uses-react': 'off', // Not needed with React 17+ JSX transform
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/display-name': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-key': 'error',

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Accessibility
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
    },
  },
  {
    // loggerService is the console backend — it must use console methods directly
    files: ['**/loggerService.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Test files legitimately spy on / mock console methods
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Enforce store boundary guardrail: stores must communicate via storeMediator
    files: ['src/core/store/useLocationStore.ts', 'src/core/store/useExternalStudioResultStore.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                './useAppStore',
                '@core/store/useAppStore',
                './useProjectStore',
                '@core/store/useProjectStore',
              ],
              message:
                'Zustand stores must not import or mutate other stores directly. Route cross-store communication through storeMediator.',
            },
          ],
        },
      ],
    },
  },
  {
    // i18n Guard: Disallow raw string literals in JSX in fully localized critical feature views
    files: [
      'src/features/delivery/components/**/*.{ts,tsx}',
      'src/features/media/components/**/*.{ts,tsx}',
    ],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'react/jsx-no-literals': [
        'error',
        {
          noStrings: true,
          ignoreProps: true,
          noAttributeStrings: false,
        },
      ],
    },
  },
);
