module.exports = {
  'env': {
    'browser': true,
    'es6': true
  },

  'extends': 'eslint:recommended',

  'parserOptions': {
    'sourceType': 'module'
  },

  'rules': {
    'arrow-parens': ['error', 'always'],
    'no-console': 1,

    // Stylistic rules (automatically fixed on commit).
    'array-bracket-spacing': ['error', 'never'],
    'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
    'comma-dangle': ['error', 'always-multiline'],
    'comma-spacing': ['error', { 'before': false, 'after': true }],
    'comma-style': ['error', 'last'],
    'computed-property-spacing': ['error', 'never'],
    'eol-last': ['error', 'always'],
    'func-call-spacing': ['error', 'never'],
    'indent': ['error', 2, {
      'SwitchCase': 1,
      'MemberExpression': 1,
    }],
    'key-spacing': ['error', {
      'beforeColon': false,
      'afterColon': true,
    }],
    'keyword-spacing': ['error', {
      'before': true,
      'after': true,
    }],
    'new-parens': 'error',
    'no-lonely-if': 'error',
    'no-trailing-spaces': 'error',
    'no-unneeded-ternary': 'error',
    'no-whitespace-before-property': 'error',
    'object-curly-spacing': ['error', 'always'],
    'operator-assignment': ['error', 'always'],
    'operator-linebreak': ['error', 'after'],
    'quote-props': ['error', 'as-needed'],
    'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
    'semi-spacing': 'error',
    'semi': ['error', 'always'],
    'space-before-blocks': 'error',
    'space-before-function-paren': ['error', 'never'],
    'space-in-parens': ['error', 'never'],
    'space-infix-ops': 'error',
    'spaced-comment': ['error', 'always', { 'block': { 'balanced': true } }],
  },
};
