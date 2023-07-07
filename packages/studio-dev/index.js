const pkg = require('./package.json')

module.exports = {
  deps: {
    webpack: require('webpack'),
    autoprefixer: require('autoprefixer'),
    'postcss-flexbugs-fixes': require('postcss-flexbugs-fixes'),
    'html-webpack-plugin': require('html-webpack-plugin'),
    'clean-webpack-plugin': require('clean-webpack-plugin')
  },
  versions: {
    '@babel/runtime-corejs3': pkg.dependencies['@babel/runtime-corejs3']
  }
}
