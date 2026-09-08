const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const unusedImports = require('eslint-plugin-unused-imports');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'unused-imports': unusedImports,
      'react-hooks': reactHooks,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        { 'vars': 'all', 'varsIgnorePattern': '^_', 'args': 'after-used', 'argsIgnorePattern': '^_' }
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'react-hooks/exhaustive-deps': 'warn'
    },
  },
];
