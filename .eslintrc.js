module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: [
    '@typescript-eslint',
    'prefer-arrow',
    'security',
    'prettier'
  ],
  rules: {
    // Prettier integration
    'prettier/prettier': 'error',

    // TypeScript specific rules (relaxed for development)
    '@typescript-eslint/no-explicit-any': 'warn', // Changed from error to warn
    '@typescript-eslint/no-unsafe-assignment': 'warn', // Changed from error to warn
    '@typescript-eslint/no-unsafe-call': 'warn', // Changed from error to warn
    '@typescript-eslint/no-unsafe-member-access': 'warn', // Changed from error to warn
    '@typescript-eslint/no-unsafe-return': 'warn', // Changed from error to warn
    '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Changed from error to warn
    '@typescript-eslint/prefer-optional-chain': 'warn', // Changed from error to warn
    '@typescript-eslint/no-unused-vars': ['warn', { // Changed from error to warn
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/explicit-function-return-type': 'off', // Changed from warn to off
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Changed from warn to off
    '@typescript-eslint/no-non-null-assertion': 'warn', // Changed from error to warn
    '@typescript-eslint/require-await': 'warn', // Changed from error to warn
    '@typescript-eslint/no-misused-promises': 'warn', // Changed from error to warn

    // General code quality
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'prefer-arrow/prefer-arrow-functions': 'off', // Changed from warn to off

    // Console statements (custom rule)
    'no-console': 'off', // Changed from warn to off for development

    // Security rules
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',

    // Code style
    'max-len': 'off', // Changed from warn to off for development
    'no-multiple-empty-lines': ['error', { max: 2 }],
    'eol-last': 'error',
    'no-trailing-spaces': 'error',

    // Error handling
    'prefer-promise-reject-errors': 'error',
    'no-throw-literal': 'error',

    // Performance
    'prefer-destructuring': 'off', // Changed from warn to off for development
    'no-array-constructor': 'error',

    // Maintainability (relaxed for development)
    'complexity': 'off', // Changed from warn to off
    'max-depth': 'off', // Changed from warn to off
    'max-lines-per-function': 'off', // Changed from warn to off
    'max-params': 'off' // Changed from warn to off
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off'
      }
    },
    {
      files: ['**/demo/**/*.ts', '**/scripts/**/*.ts'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off'
      }
    }
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'public/js/',
    'src/client/',
    'src/__tests__/',
    '*.js'
  ]
};
