const path = require('path')
const fs = require('fs')
const nanoid = require('nanoid')
const webpack = require('webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const exposedLibraries = [
  'react',
  'react-dom',
  'prop-types',
  'react-list',
  'superagent',
  'shortid',
  'bluebird',
  'filesaver.js-npm'
]

module.exports = (customExtName) => {
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
      namedModules: false,
      namedChunks: false,
      occurrenceOrder: true,
      flagIncludedChunks: true
    },
    externals: [
      (context, request, callback) => {
        if (/babel-runtime/.test(request)) {
          return callback(null, 'Studio.runtime[\'' + request.substring('babel-runtime/'.length) + '\']')
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
            options: {
              presets: [
                require.resolve('babel-preset-es2015'),
                require.resolve('babel-preset-react'),
                require.resolve('babel-preset-stage-0')
              ]
            }
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
                modules: true,
                importLoaders: 1,
                sourceMap: true,
                localIdentName: `x-${extensionName}-[name]-[local]`
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                ident: 'postcss',
                plugins: getPostcssPlugins
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
    plugins: [
      new webpack.DefinePlugin({
        __DEVELOPMENT__: false
      }),
      new MiniCssExtractPlugin({
        filename: '[name].css', // '[name].[hash].css'
        chunkFilename: '[id].css' // '[id].[hash].css'
      }),
      new webpack.ProgressPlugin()
    ]
  }
}

function getPostcssPlugins () {
  return [
    require('postcss-flexbugs-fixes'),
    require('autoprefixer')
  ]
}
