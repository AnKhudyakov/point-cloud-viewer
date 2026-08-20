import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import boundaries from 'eslint-plugin-boundaries';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];

const SLICED_LAYERS = ['pages', 'widgets', 'features', 'entities'];

const layerElements = LAYERS.map((layer) => ({
  type: layer,
  pattern: `src/${layer}/*`,
  capture: ['slice'],
}));

const downwardPolicies = LAYERS.map((layer, index) => {
  const below = LAYERS.slice(index + 1);
  const sliced = below.filter((candidate) => SLICED_LAYERS.includes(candidate));
  const allow = [];

  if (sliced.length > 0) {
    allow.push({ to: { element: { types: { anyOf: sliced }, internalPath: 'index.ts' } } });
  }
  if (below.includes('shared')) {
    allow.push({ to: { element: { type: 'shared' } } });
  }

  return { from: { element: { type: layer } }, allow };
});

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'public'] },

  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
      prettier,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      boundaries,
      'import-x': importX,
      'jsx-a11y': jsxA11y,
      'simple-import-sort': simpleImportSort,
    },
    settings: {
      'boundaries/elements': layerElements,
      'boundaries/include': ['src/**/*'],

      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.app.json' },
      },
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ project: './tsconfig.app.json' }),
      ],
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,

      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      'import-x/no-cycle': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-self-import': 'error',

      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:', '^@?\\w'],
            [`^@/(${LAYERS.join('|')})(/.*|$)`],
            ['^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            'FSD: {{from.type}} must not import {{to.type}} at {{to.internalPath}}. ' +
            'Import lower layers only, and sliced layers only through their index.ts.',
          policies: [
            ...downwardPolicies,
            { from: { element: { type: 'app' } }, allow: { to: { element: { type: 'app' } } } },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/**/*.test.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'boundaries/dependencies': 'off',
    },
  },

  {
    files: ['vite.config.ts', 'eslint.config.js', 'scripts/**/*.{js,mjs,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, prettier],
    languageOptions: {
      globals: globals.node,
    },
  },
);
