const pkg = require('./package.json')

// for JS: we don't compile syntax that already works in browsers since 2020
// this means that ES6/ES2015 JS versions should not need compilation
// for CSS: we just prefix some values according to the year defined here
const browserTargets = ['since 2020, > 0.5%, Firefox ESR, not dead']

module.exports = {
  babelOptions: require('./babelOptions'),
  browserTargets,
  deps: {
    webpack: require('webpack'),
    postcss: require('postcss'),
    autoprefixer: require('autoprefixer'),
    'postcss-flexbugs-fixes': require('postcss-flexbugs-fixes'),
    'html-webpack-plugin': require('html-webpack-plugin'),
    'clean-webpack-plugin': require('clean-webpack-plugin').CleanWebpackPlugin,
    'mini-css-extract-plugin': require('mini-css-extract-plugin')
  },
  versions: {
    '@babel/runtime-corejs3': pkg.dependencies['@babel/runtime-corejs3']
  },
  paths: {
    '@babel/plugin-transform-runtime': require.resolve('@babel/plugin-transform-runtime')
  }
}
