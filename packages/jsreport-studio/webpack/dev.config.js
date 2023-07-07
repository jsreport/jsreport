// Webpack config for development
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const jsreportStudioDev = require('@jsreport/studio-dev')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')
const projectSrcAbsolutePath = path.join(__dirname, '../src')
const assetsPath = path.resolve(__dirname, '../static/dist')
const babelrc = require('../.babelrc')

const sepRe = `\\${path.sep}` // path separator regex

const babelrcObject = _.cloneDeep(babelrc)

const webpack = jsreportStudioDev.deps.webpack

const babelLoaderQuery = Object.assign({}, babelrcObject)

module.exports = (extensions, extensionsInNormalMode) => {
  const { hasMatchWithExtension, getMatchedExtension } = getBuildHelpers(extensions)

  const extensionsInDevMode = extensions.filter((e) => {
    return (
      !hasMatchWithExtension(e.directory, extensionsInNormalMode) &&
      fs.existsSync(path.join(e.directory, 'studio/main_dev.js'))
    )
  })

  return {
    mode: 'development',
    devtool: 'eval-source-map',
    context: path.resolve(__dirname, '..'),
    entry: {
      main: [
        './src/client.js',
        'webpack-hot-middleware/client',
        // we use a forked font-awesome-webpack (named: font-awesome-webpack-4)
        // because the original repository does not support webpack 4,
        // see this issue for a bit of history: https://github.com/gowravshekar/font-awesome-webpack/issues/41#issuecomment-413213495
        // we should be able to go back to original package when it is updated.
        'font-awesome-webpack-4!./src/theme/font-awesome.config.js'
      ]
    },
    output: {
      path: assetsPath,
      filename: 'client.dev.js',
      chunkFilename: '[name].client.dev.js',
      // this makes the worker-loader bundle to work fine at runtime, otherwise you
      // will see error in the web worker
      globalObject: 'this'
    },
    externals: [
      (context, request, callback) => {
        if (request === 'jsreport-studio') {
          return callback(null, 'Studio')
        }

        callback()
      }
    ],
    module: {
      rules: [
        {
          test: /\.worker\.js$/,
          include: [path.resolve(__dirname, '../src/components/Editor/workers')],
          use: [{
            loader: 'worker-loader',
            options: {
              name: '[name].dev.js'
            }
          }]
        },
        {
          test: /\.js$/,
          exclude: (modulePath) => {
            // we need to tell babel to exclude the processing of eslint-browser, babel-eslint-browser bundle
            if (modulePath.includes('eslint-browser.js') || modulePath.includes('babel-eslint-browser.js')) {
              return true
            }

            // we want to process monaco-editor files
            if (
              new RegExp(`node_modules${sepRe}monaco-editor${sepRe}`).test(modulePath)
            ) {
              return false
            }

            const matchedExtension = getMatchedExtension(modulePath, extensions)
            const shouldExcludeExplicitly = matchedExtension == null ? true : hasMatchWithExtension(matchedExtension, extensionsInNormalMode)

            if (shouldExcludeExplicitly) {
              return true
            }

            if (
              hasMatchWithExtension(modulePath, extensions) &&
              modulePath.replace(getMatchedExtension(modulePath, extensions), '').includes('node_modules') === false
            ) {
              return false
            }

            return true
          },
          use: [{
            loader: 'babel-loader',
            options: babelLoaderQuery
          }]
        },
        {
          test: /extensions_dev\.css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                hmr: true
              }
            },
            'css-loader'
          ]
        },
        {
          test: /\.css$/,
          exclude: [/.*theme.*\.css/, /extensions_dev\.css$/, (input) => {
            return input.startsWith(projectSrcAbsolutePath) || hasMatchWithExtension(input, extensionsInDevMode)
          }],
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.less$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: true,
                importLoaders: 2,
                sourceMap: true,
                localIdentName: '[local]___[hash:base64:5]'
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                ident: 'postcss',
                plugins: getPostcssPlugins
              }
            }, {
              loader: 'less-loader',
              options: {
                outputStyle: 'expanded',
                sourceMap: true
              }
            }
          ]
        },
        {
          include: [/.*theme.*\.css/],
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                hmr: true
              }
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
                ident: 'postcss',
                plugins: getPostcssPlugins
              }
            }
          ]
        },
        {
          test: /\.css$/,
          include: (input) => {
            return input.startsWith(projectSrcAbsolutePath) || hasMatchWithExtension(input, extensionsInDevMode)
          },
          exclude: [/.*theme.*/, /extensions_dev\.css$/],
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                hmr: true
              }
            },
            {
              loader: 'css-loader',
              options: {
                modules: true,
                importLoaders: 1,
                sourceMap: true,
                getLocalIdent: (context, localIdentName, localName, options) => {
                  const modulePath = context.resource
                  let devExtension

                  for (const key in extensionsInDevMode) {
                    const currentExtension = extensionsInDevMode[key]

                    if (currentExtension.name === 'studio') {
                      break
                    }

                    const extensionDirectory = getMatchedExtension(modulePath, [currentExtension])

                    if (extensionDirectory == null) {
                      continue
                    }

                    const extensionStudioDirectoryNormalized = path.join(extensionDirectory, `${path.sep}studio${path.sep}`)
                    const valid = modulePath.includes(extensionStudioDirectoryNormalized)

                    if (valid) {
                      devExtension = currentExtension.name
                      break
                    }
                  }

                  const name = path.basename(context.resource, path.extname(context.resource))

                  if (devExtension != null) {
                    return `x-${devExtension}-${name}-${localName}`
                  }

                  return `${name}-${localName}`
                }
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
        },
        {
          test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
            loader: 'url-loader',
            options: {
              limit: 10000,
              mimetype: 'application/font-woff'
            }
          }]
        },
        {
          test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
            loader: 'url-loader',
            options: {
              limit: 10000,
              mimetype: 'application/font-woff'
            }
          }]
        },
        {
          test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
            loader: 'url-loader',
            options: {
              limit: 10000,
              mimetype: 'application/octet-stream'
            }
          }]
        },
        {
          test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
          use: ['file-loader']
        },
        {
          test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
            loader: 'url-loader',
            options: {
              limit: 10000,
              mimetype: 'image/svg+xml'
            }
          }]
        },
        {
          test: /\.(png|jpg)$/,
          use: [{
            loader: 'url-loader',
            options: {
              limit: 8192
            }
          }]
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
    plugins: [
      // hot reload
      new webpack.HotModuleReplacementPlugin(),
      new webpack.IgnorePlugin(/webpack-stats\.json$/),
      new webpack.DefinePlugin({
        __DEVELOPMENT__: true
      }),
      new MiniCssExtractPlugin({
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        filename: '[name].dev.css', // '[name].[hash].css'
        chunkFilename: '[name].client.dev.css' // '[id].[hash].css'
      }),
      new MonacoWebpackPlugin({
        languages: ['xml', 'html', 'handlebars', 'css', 'json', 'javascript', 'typescript'],
        // we exclude some features
        features: ['!iPadShowKeyboard', '!dnd']
      }),
      new HtmlWebpackPlugin({
        hash: true,
        inject: false,
        template: path.join(__dirname, '../static/index.html'),
        chunksSortMode: 'none'
      })
    ]
  }
}

function getBuildHelpers (extensions) {
  const symlinkExtensionsMap = new Map()

  for (const extension of extensions) {
    const realPath = fs.realpathSync(extension.directory)

    if (extension.directory !== realPath) {
      symlinkExtensionsMap.set(extension.name, realPath)
    }
  }

  const findMatch = (directory, targetExtensions) => {
    if (directory == null || targetExtensions == null) {
      return
    }

    let extensionMatch

    for (const tExtension of targetExtensions) {
      const realTExtensionDirectory = symlinkExtensionsMap.has(tExtension.name) ? symlinkExtensionsMap.get(tExtension.name) : tExtension.directory
      const realTExtensionDirectoryPrefix = path.join(realTExtensionDirectory, path.sep)

      if (
        directory === realTExtensionDirectory ||
        (
          directory.startsWith(realTExtensionDirectoryPrefix) &&
          !directory.replace(realTExtensionDirectoryPrefix, '').startsWith('node_modules')
        )
      ) {
        extensionMatch = realTExtensionDirectory
      }

      if (extensionMatch != null) {
        break
      }
    }

    return extensionMatch
  }

  return {
    hasMatchWithExtension: (directory, targetExtensions) => findMatch(directory, targetExtensions) != null,
    getMatchedExtension: (directory, targetExtensions) => findMatch(directory, targetExtensions)
  }
}

function getPostcssPlugins () {
  return [
    jsreportStudioDev.deps['postcss-flexbugs-fixes'],
    jsreportStudioDev.deps.autoprefixer
  ]
}
