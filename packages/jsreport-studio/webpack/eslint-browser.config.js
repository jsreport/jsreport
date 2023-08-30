const path = require('path')
const jsreportStudioDev = require('@jsreport/studio-dev')

const createBabelOptions = jsreportStudioDev.babelOptions
const { ProvidePlugin } = jsreportStudioDev.deps.webpack

const babelLoaderOptions = Object.assign(createBabelOptions(), {
  // we don't want to take config from babelrc files
  babelrc: false
})

babelLoaderOptions.plugins.push(jsreportStudioDev.paths['@babel/plugin-transform-runtime'])

const assetsPath = path.resolve(__dirname, '../static/dist')

const sepRe = `\\${path.sep}` // path separator regex

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
    // this makes the worker bundle to work fine at runtime, otherwise you
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
    // node.js polyfills required by eslint source code
    fallback: {
      assert: require.resolve('assert/'),
      path: require.resolve('path-browserify/')
    },
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
  },
  plugins: [
    new ProvidePlugin({
      // provide global variable to modules (dependencies of eslint),
      // Make a global `process` variable that points to the `process` package,
      // because the `util` package (dep of assert) expects there to be a global variable named `process`.
      // Thanks to https://stackoverflow.com/a/65018686/14239942
      process: 'process/browser'
    })
  ]
}
