const path = require('path')

const assetsPath = path.resolve(__dirname, '../static/dist')

const sepRe = `\\${path.sep}` // path separator regex

const babelLoaderOptions = {
  presets: [
    require.resolve('babel-preset-es2015'),
    require.resolve('babel-preset-stage-0')
  ],
  plugins: [
    require.resolve('babel-plugin-transform-runtime')
  ]
}

module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '..'),
  entry: {
    'babel-eslint-browser': './src/babel-eslint-browser.js'
  },
  output: {
    path: assetsPath,
    filename: 'babel-eslint-browser.js',
    library: 'babel-eslint-browser',
    libraryTarget: 'umd',
    // this makes the worker-loader bundle to work fine at runtime, otherwise you
    // will see error in the web worker
    globalObject: 'this'
  },
  module: {
    rules: [
      // Patch for `babel-eslint`
      {
        test: new RegExp(`node_modules${sepRe}babel-eslint${sepRe}lib${sepRe}index\\.js$`),
        loader: 'string-replace-loader',
        options: {
          search: '[\\s\\S]+', // whole file.
          replace:
            'module.exports.parseForESLint = require("./parse-with-scope")',
          flags: 'g'
        }
      },
      {
        test: /\.js$/,
        exclude: (modulePath) => {
          // we need to exclude some internal calls to be processed by babel,
          // otherwise this ends in runtime error when running the editor in browser
          if (
            new RegExp(`node_modules${sepRe}babel-runtime${sepRe}`).test(modulePath) ||
            new RegExp(`node_modules${sepRe}core-js${sepRe}`).test(modulePath) ||
            new RegExp(`node_modules${sepRe}webpack${sepRe}`).test(modulePath)
          ) {
            return true
          }

          return false
        },
        use: [{
          loader: 'babel-loader',
          options: babelLoaderOptions
        }]
      }
    ]
  },
  resolve: {
    extensions: ['.json', '.js'],
    mainFields: ['browser', 'main'],
    modules: [
      path.join(__dirname, '../node_modules'),
      path.join(__dirname, '../node_modules/@jsreport/studio-dev/node_modules'),
      path.join(__dirname, '../../studio-dev/node_modules'),
      'node_modules'
    ]
  },
  resolveLoader: {
    modules: [
      path.join(__dirname, '../node_modules'),
      path.join(__dirname, '../node_modules/@jsreport/studio-dev/node_modules'),
      path.join(__dirname, '../../studio-dev/node_modules'),
      'node_modules'
    ]
  }
}
