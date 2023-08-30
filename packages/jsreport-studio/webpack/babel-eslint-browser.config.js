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
    'babel-eslint-browser': './src/babel-eslint-browser.js'
  },
  output: {
    path: assetsPath,
    filename: 'babel-eslint-browser.js',
    library: 'babel-eslint-browser',
    libraryTarget: 'umd',
    // this makes the worker bundle to work fine at runtime, otherwise you
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
      assert: require.resolve('assert/')
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
      // provide global variables to modules (dependencies of babel-eslint),
      Buffer: 'buffer/',
      // Make a global `process` variable that points to the `process` package,
      // because the `util` package (dep of assert) expects there to be a global variable named `process`.
      // Thanks to https://stackoverflow.com/a/65018686/14239942
      process: 'process/browser'
    })
  ]
}
