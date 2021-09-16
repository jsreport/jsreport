const webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: ['babel-polyfill', './playground.js'],

  target: 'web',

  mode: 'production',

  output: {
    path: path.join(__dirname, 'public'),
    filename: 'bundle.js',
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [[path.resolve("./node_modules/babel-preset-env"), {
                          "targets": {
                            "browsers": "ie 10, ios 9, safari 7, edge 13, chrome 54, firefox 49"
                          }
                        }]]
          }
        }
      }
    ]
  },

  optimization: {
    minimize: true
  }
}