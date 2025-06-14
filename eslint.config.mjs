// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/no-require-imports': 0,
      '@typescript-eslint/no-duplicate-enum-values': 0,
    },
    languageOptions: {
      globals: {
        require: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
);
