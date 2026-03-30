export default {
  ignores: ['node_modules/**', 'logs/**', 'data/**', '**/.pids/**'],
  languageOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
    'no-console': 'off',
    semi: ['error', 'always'],
    'comma-dangle': ['error', 'never']
  }
};
