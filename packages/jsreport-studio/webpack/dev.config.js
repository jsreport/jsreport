// Webpack config for development
const fs = require('fs')
const path = require('path')
const jsreportStudioDev = require('@jsreport/studio-dev')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')

const createBabelOptions = jsreportStudioDev.babelOptions
const { HotModuleReplacementPlugin, DefinePlugin, IgnorePlugin } = jsreportStudioDev.deps.webpack
const HtmlWebpackPlugin = jsreportStudioDev.deps['html-webpack-plugin']
const MiniCssExtractPlugin = jsreportStudioDev.deps['mini-css-extract-plugin']

const babelLoaderOptions = Object.assign(createBabelOptions({ withReact: true, withTransformRuntime: true }), {
  // we don't want to take config from babelrc files
  babelrc: false
})

const projectSrcAbsolutePath = path.join(__dirname, '../src')
const projectSrcThemeAbsolutePath = path.join(projectSrcAbsolutePath, 'theme')
const assetsPath = path.resolve(__dirname, '../static/dist')

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
        // reload=true will make the browser to reload when HMR is not possible for a module
        'webpack-hot-middleware/client?reload=true',
        './src/client.js'
      ]
    },
    output: {
      path: assetsPath,
      filename: 'client.dev.js',
      chunkFilename: '[name].client.dev.js',
      // this makes the worker bundle to work fine at runtime, otherwise you
      // will see error in the web worker
      globalObject: 'this'
    },
    externals: [
      ({ context, request }, callback) => {
        if (request === 'jsreport-studio') {
          return callback(null, 'Studio')
        }

        callback()
      }
    ],
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: (modulePath) => {
            // we need to tell babel to exclude the processing of eslint-browser, babel-eslint-browser bundle
            if (modulePath.includes('eslint-browser.js') || modulePath.includes('babel-eslint-browser.js')) {
              return true
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
            options: babelLoaderOptions
          }]
        },
        {
          // process extensions_dev.css file, it is generated at startup during dev mode,
          // it contains a reference to all extensions main.css files
          test: /extensions_dev\.css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader
            },
            {
              loader: 'css-loader'
            }
          ]
        },
        {
          // process css that are not extensions, or studio src files (likely from deps in node_modules)
          test: /\.css$/,
          exclude: [(input) => {
            return input.startsWith(projectSrcAbsolutePath) || hasMatchWithExtension(input, extensionsInDevMode)
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
          // process css from studio src files and extensions (ignoring src/theme and extensions_dev.css)
          test: /\.css$/,
          include: (input) => {
            if (input.startsWith(projectSrcThemeAbsolutePath)) {
              return false
            }

            return input.startsWith(projectSrcAbsolutePath) || hasMatchWithExtension(input, extensionsInDevMode)
          },
          exclude: [/extensions_dev\.css$/],
          use: [
            {
              loader: MiniCssExtractPlugin.loader
            },
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                modules: {
                  getLocalIdent: (context, localIdentName, localName) => {
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
    optimization: {
      splitChunks: {
        cacheGroups: {
          // we configure here that we want all css from all chunks to be extracted
          // to a single file, this is needed in dev because we want to replicate
          // what we do in production, that the main.css file contains all css
          // and we process our css variables as single step there
          main: {
            name: 'main',
            type: 'css/mini-extract',
            chunks: 'all',
            enforce: true
          }
        }
      }
    },
    plugins: [
      // hot reload
      new HotModuleReplacementPlugin(),
      new IgnorePlugin({ resourceRegExp: /webpack-stats\.json$/ }),
      new DefinePlugin({
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
    // this makes the autoprefixer not try to search for browserslist config and use
    // the one we have defined
    jsreportStudioDev.deps.autoprefixer({ overrideBrowserslist: jsreportStudioDev.browserTargets })
  ]
}
