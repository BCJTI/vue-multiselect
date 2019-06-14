module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'plugin:vue/essential',
    '@vue/airbnb',
  ],
  rules: {
    'indent': [0, 'tab', { 'SwitchCase': 1 }],
    'no-param-reassign': ['error', { 'props': false }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-bitwise': ['error', { 'allow': ['&'] }],
    'no-tabs': 0,
    'vue/require-v-for-key': 0,
    'prefer-destructuring': 0,
    'no-cond-assign': 0,
    'implicit-arrow-linebreak': 0,
    'consistent-return': 0,
    'prefer-template': 0,
    'import/first': 0,
    'import/no-cycle': 0,
    'quote-props': 0,
    'no-plusplus': 0,
    'no-prototype-builtins': 0,
    'no-useless-escape': 0,
    'no-nested-ternary': 0,
    'object-shorthand': 0,
    'linebreak-style': 0,
    'default-case': 0,
    'no-continue': 0,
    'object-curly-newline': 0,
    'max-len': [0, {
      'code': 150,
      'ignoreUrls': true,
      'ignoreComments': true
    }],
    // don't require .vue extension when importing
    'import/extensions': ['error', 'always', {
      'js': 'never',
      'vue': 'never',
      'mjs': 'never'
    }],
    // allow optionalDependencies
    'import/no-extraneous-dependencies': ['error', {
      'optionalDependencies': ['test/unit/index.js']
    }],
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
  },
  parserOptions: {
    parser: 'babel-eslint',
  },
};
