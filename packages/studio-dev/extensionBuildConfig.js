const path = require('path')
const fs = require('fs')
const { nanoid } = require('nanoid')
const { DefinePlugin, ProgressPlugin } = require('webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const RemoveSourceMapUrlPlugin = require('@rbarilani/remove-source-map-url-webpack-plugin')
const studioDev = require('.')
const createBabelOptions = studioDev.babelOptions

// in extensions we just share babel helpers, corejs polyfills are not configured
const babelLoaderOptions = Object.assign(createBabelOptions({ withReact: true, withTransformRuntime: true }), {
  // we don't want to take config from babelrc files
  babelrc: false
})

const exposedLibraries = [
  'react',
  'react-dom',
  'prop-types',
  'react-list',
  'superagent',
  'shortid',
  'filesaver.js-npm'
]

module.exports = (customExtName, opts = {}) => {
  const extensionConfigPath = path.join(process.cwd(), 'jsreport.config.js')
  let extensionName

  if (customExtName != null && customExtName !== '') {
    extensionName = customExtName
  } else if (fs.existsSync(extensionConfigPath)) {
    try {
      extensionName = require(extensionConfigPath).name
    } catch (e) {}
  }

  if (extensionName == null) {
    extensionName = nanoid(6)
  }

  const webpackPlugins = []

  webpackPlugins.push(new DefinePlugin({
    __DEVELOPMENT__: false
  }))

  webpackPlugins.push(new MiniCssExtractPlugin({
    filename: '[name].css', // '[name].[hash].css'
    chunkFilename: '[id].css' // '[id].[hash].css'
  }))

  if (opts.removeSourceMapUrl != null && opts.removeSourceMapUrl.length > 0) {
    webpackPlugins.push(new RemoveSourceMapUrlPlugin({
      test: (asset) => {
        return opts.removeSourceMapUrl.some((item) => asset.endsWith(item))
      }
    }))
  }

  webpackPlugins.push(new ProgressPlugin())

  return {
    // we use 'none' to avoid webpack adding any plugin
    // optimization
    mode: 'none',
    devtool: 'hidden-source-map',
    entry: {
      main: './studio/main_dev'
    },
    output: {
      filename: 'main.js',
      path: path.join(process.cwd(), 'studio'),
      pathinfo: false
    },
    performance: {
      hints: 'warning'
    },
    optimization: {
      nodeEnv: 'production',
      moduleIds: 'size',
      chunkIds: 'total-size',
      flagIncludedChunks: true
    },
    externals: [
      ({ context, request }, callback) => {
        if (/@babel\/runtime\//.test(request)) {
          return callback(null, 'Studio.runtime[\'' + request.substring('@babel/runtime/'.length) + '\']')
        }

        if (exposedLibraries.indexOf(request) > -1) {
          return callback(null, 'Studio.libraries[\'' + request + '\']')
        }

        if (request === 'jsreport-studio') {
          return callback(null, 'Studio')
        }

        callback()
      }
    ],
    module: {
      rules: [
        {
          test: /.jsx?$/,
          exclude: /node_modules/,
          use: [{
            loader: 'babel-loader',
            options: babelLoaderOptions
          }]
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader
            },
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                sourceMap: true,
                modules: {
                  localIdentName: `x-${extensionName}-[name]-[local]`
                }
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: getPostcssPlugins()
                }
              }
            }
          ]
        }
      ]
    },
    resolve: {
      modules: [
        'node_modules',
        'node_modules/@jsreport/studio-dev/node_modules'
      ]
    },
    resolveLoader: {
      modules: [
        'node_modules',
        'node_modules/@jsreport/studio-dev/node_modules'
      ]
    },
    plugins: webpackPlugins
  }
}

function getPostcssPlugins () {
  return [
    studioDev.deps['postcss-flexbugs-fixes'],
    // this makes the autoprefixer not try to search for browserslist config and use
    // the one we have defined
    studioDev.deps.autoprefixer({ overrideBrowserslist: studioDev.browserTargets })
  ]
}
