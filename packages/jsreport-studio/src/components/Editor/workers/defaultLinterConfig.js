import Linter from 'eslint-browser'

const restrictedGlobals = [
  'addEventListener',
  'blur',
  'close',
  'closed',
  'confirm',
  'defaultStatus',
  'defaultstatus',
  'event',
  'external',
  'find',
  'focus',
  'frameElement',
  'frames',
  'history',
  'innerHeight',
  'innerWidth',
  'length',
  'location',
  'locationbar',
  'menubar',
  'moveBy',
  'moveTo',
  'name',
  'onblur',
  'onerror',
  'onfocus',
  'onload',
  'onresize',
  'onunload',
  'open',
  'opener',
  'opera',
  'outerHeight',
  'outerWidth',
  'pageXOffset',
  'pageYOffset',
  'parent',
  'print',
  'removeEventListener',
  'resizeBy',
  'resizeTo',
  'screen',
  'screenLeft',
  'screenTop',
  'screenX',
  'screenY',
  'scroll',
  'scrollbars',
  'scrollBy',
  'scrollTo',
  'scrollX',
  'scrollY',
  'self',
  'status',
  'statusbar',
  'stop',
  'toolbar',
  'top'
]

const options = Object.assign({}, Linter.DEFAULT_RECOMMENDED_RULES, {
  parserOptions: {
    ecmaVersion: 9,
    sourceType: 'script',
    ecmaFeatures: {
      jsx: false,
      globalReturn: false,
      impliedStrict: false
    }
  },
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true
  },
  rules: Object.assign({}, Linter.DEFAULT_RECOMMENDED_RULES.rules, {
    'no-restricted-globals': ['error'].concat(restrictedGlobals),
    'no-console': 'off',
    'no-unused-vars': 'off',
    'no-undef': 'off'
  })
})

export default options
