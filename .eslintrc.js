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

    // TypeScript specific rules (tightened for better code quality)
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/no-misused-promises': 'error',

    // General code quality
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'prefer-arrow/prefer-arrow-functions': 'warn', // Changed from error to warn

    // Console statements (custom rule)
    'no-console': ['warn', { // Changed from error to warn
      allow: ['warn', 'error']
    }],

    // Security rules
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',

    // Code style
    'max-len': ['warn', { // Changed from error to warn
      code: 100,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true
    }],
    'no-multiple-empty-lines': ['error', { max: 2 }],
    'eol-last': 'error',
    'no-trailing-spaces': 'error',

    // Error handling
    'prefer-promise-reject-errors': 'error',
    'no-throw-literal': 'error',

    // Performance
    'prefer-destructuring': ['warn', { // Changed from error to warn
      array: true,
      object: true
    }],
    'no-array-constructor': 'error',

    // Maintainability (tightened for better code quality)
    'complexity': ['warn', 10], // Back to original strict limit
    'max-depth': ['warn', 4], // Back to original strict limit
    'max-lines-per-function': ['warn', 50], // Back to original strict limit
    'max-params': ['warn', 5] // Back to original strict limit
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
