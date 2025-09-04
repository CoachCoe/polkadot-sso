module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'security'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/require-await': 'warn',
    '@typescript-eslint/no-misused-promises': 'warn',

    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'prefer-arrow/prefer-arrow-functions': 'off',

    'no-console': 'off',

    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',

    'max-len': 'off',
    'no-multiple-empty-lines': ['error', { max: 2 }],
    'eol-last': 'error',
    'no-trailing-spaces': 'error',

    'prefer-promise-reject-errors': 'error',
    'no-throw-literal': 'error',

    'prefer-destructuring': 'off',
    'no-array-constructor': 'error',

    complexity: 'off',
    'max-depth': 'off',
    'max-lines-per-function': 'off',
    'max-params': 'off',
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
    {
      files: ['**/demo/**/*.ts', '**/scripts/**/*.ts'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'public/js/',
    'src/client/',
    'src/__tests__/',
    '*.js',
    'examples/**/*',
  ],
};
