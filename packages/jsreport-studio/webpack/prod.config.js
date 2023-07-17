// Webpack config for creating the production bundle.
const path = require('path')
const jsreportStudioDev = require('@jsreport/studio-dev')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')

const createBabelOptions = jsreportStudioDev.babelOptions
const { DefinePlugin, IgnorePlugin, ProgressPlugin } = jsreportStudioDev.deps.webpack
const HtmlWebpackPlugin = jsreportStudioDev.deps['html-webpack-plugin']
const CleanPlugin = jsreportStudioDev.deps['clean-webpack-plugin']
const MiniCssExtractPlugin = jsreportStudioDev.deps['mini-css-extract-plugin']

const babelLoaderOptions = Object.assign(createBabelOptions({ withReact: true, withTransformRuntime: true }), {
  // we don't want to take config from babelrc files
  babelrc: false
})

const projectSrcAbsolutePath = path.join(__dirname, '../src')
const projectSrcThemeAbsolutePath = path.join(projectSrcAbsolutePath, 'theme')
const projectRootPath = path.resolve(__dirname, '../')
const assetsPath = path.resolve(projectRootPath, './static/dist')

module.exports = {
  mode: 'production',
  devtool: 'hidden-source-map',
  context: path.resolve(__dirname, '..'),
  entry: {
    main: [
      './src/client.js'
    ]
  },
  output: {
    path: assetsPath,
    filename: 'client.[contenthash].js',
    chunkFilename: '[name].client.[contenthash].js',
    // this makes the worker bundle to work fine at runtime, otherwise you
    // will see error in the web worker
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: (modulePath) => {
          // we need to tell babel to exclude the processing of eslint-browser, babel-eslint-browser bundle
          if (modulePath.includes('eslint-browser.js') || modulePath.includes('babel-eslint-browser.js')) {
            return true
          }

          if (modulePath.replace(projectRootPath, '').includes('node_modules')) {
            return true
          }

          return false
        },
        use: [{
          loader: 'babel-loader',
          options: babelLoaderOptions
        }]
      },
      {
        // process css that are not inside studio src files (likely from deps in node_modules)
        // we don't care about checking css from extensions here because
        // studio src files does not add any reference to them that webpack can track
        test: /\.css$/,
        exclude: [(input) => {
          return input.startsWith(projectSrcAbsolutePath)
        }],
        use: [
          {
            loader: 'style-loader',
            options: {
              injectType: 'singletonStyleTag'
            }
          },
          {
            loader: 'css-loader'
          }
        ]
      },
      {
        // process css from studio src/theme (global css)
        test: /\.css$/,
        include: [(input) => {
          return input.startsWith(projectSrcThemeAbsolutePath)
        }],
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1
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
      },
      {
        // process css from studio src files (ignoring src/theme)
        test: /\.css$/,
        include: (input) => {
          if (input.startsWith(projectSrcThemeAbsolutePath)) {
            return false
          }

          return input.startsWith(projectSrcAbsolutePath)
        },
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
                localIdentName: '[name]-[local]'
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
      },
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset',
        mimetype: 'application/font-woff',
        parser: {
          dataUrlCondition: {
            maxSize: 10000 // 10kb
          }
        }
      },
      {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset',
        mimetype: 'application/font-woff',
        parser: {
          dataUrlCondition: {
            maxSize: 10000 // 10kb
          }
        }
      },
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset',
        mimetype: 'application/octet-stream',
        parser: {
          dataUrlCondition: {
            maxSize: 10000 // 10kb
          }
        }
      },
      {
        test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset/resource'
      },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset',
        mimetype: 'image/svg+xml',
        parser: {
          dataUrlCondition: {
            maxSize: 10000 // 10kb
          }
        }
      },
      {
        test: /\.(png|jpg)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8192 // 8kb
          }
        }
      }
    ],
    noParse: [/eslint-browser\.js$/, /babel-eslint-browser\.js$/]
  },
  resolve: {
    extensions: ['.json', '.js', '.jsx'],
    alias: {
      'eslint-browser': path.join(__dirname, '../static/dist/eslint-browser.js'),
      'babel-eslint-browser': path.join(__dirname, '../static/dist/babel-eslint-browser.js')
    },
    modules: [
      'src',
      'node_modules',
      path.join(__dirname, '../node_modules'),
      path.join(__dirname, '../node_modules/@jsreport/studio-dev/node_modules'),
      path.join(__dirname, '../../studio-dev/node_modules')
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
  performance: {
    hints: false
  },
  plugins: [
    new CleanPlugin({
      cleanOnceBeforeBuildPatterns: ['**/*', '!eslint-browser.js', '!babel-eslint-browser.js']
    }),
    new DefinePlugin({
      __DEVELOPMENT__: false
    }),
    // ignore dev config
    new IgnorePlugin({
      checkResource (resource) {
        const isDev = /\.\/dev/.test(resource)
        const isConfig = /\/config$/.test(resource)

        return (
          isDev ||
          isConfig
        )
      }
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: '[name].[contenthash].css', // '[name].[hash].css'
      chunkFilename: '[name].client.[contenthash].css' // '[id].[hash].css'
    }),
    new MonacoWebpackPlugin({
      languages: ['xml', 'html', 'handlebars', 'css', 'json', 'javascript', 'typescript'],
      // we exclude some features
      features: ['!iPadShowKeyboard', '!dnd']
    }),
    new HtmlWebpackPlugin({
      hash: false,
      inject: false,
      template: path.join(__dirname, '../static/index.html'),
      chunksSortMode: 'none',
      // prevent html to be minified, because we want clear
      // diffs what changed between builds
      minify: false
    }),
    new ProgressPlugin()
  ]
}

function getPostcssPlugins () {
  return [
    jsreportStudioDev.deps['postcss-flexbugs-fixes'],
    // this makes the autoprefixer not try to search for browserslist config and use
    // the one we have defined
    jsreportStudioDev.deps.autoprefixer({ overrideBrowserslist: jsreportStudioDev.browserTargets })
  ]
}
