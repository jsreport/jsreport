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
    'eslint-browser': './src/eslint-browser.js'
  },
  output: {
    path: assetsPath,
    filename: 'eslint-browser.js',
    library: 'eslint-browser',
    libraryTarget: 'umd',
    // this makes the worker-loader bundle to work fine at runtime, otherwise you
    // will see error in the web worker
    globalObject: 'this'
  },
  module: {
    rules: [
      // `eslint` has some dynamic `require(...)`.
      // Delete those to suppress webpack warnings.
      {
        test: new RegExp(`node_modules${sepRe}eslint${sepRe}lib${sepRe}(?:linter|rules)\\.js$`),
        loader: 'string-replace-loader',
        options: {
          search: '(?:\\|\\||(\\())\\s*require\\(.+?\\)',
          replace: '$1',
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
