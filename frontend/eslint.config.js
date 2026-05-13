import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // `motion` namespace used via JSX (motion.div). Without eslint-plugin-react's
      // jsx-uses-vars, core no-unused-vars can't see JSX usage — whitelist it.
      'no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^(motion|[A-Z_])',
          argsIgnorePattern: '^(motion|_|[A-Z])',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // React Hooks v6 strict rules generate hundreds of findings on the
      // existing codebase. Disable until a dedicated refactor pass.
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      // shadcn/ui pattern: components co-export variants/constants — rule
      // would force a refactor of every shadcn file. Off.
      'react-refresh/only-export-components': 'off',
      // react plugin not installed — directive references rule we don't load.
      'react/display-name': 'off',
    },
  },
  {
    files: ['*.config.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/test/**/*.{js,jsx}', 'src/__tests__/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
      },
    },
  },
])
