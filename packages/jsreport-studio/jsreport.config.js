const themeVarsDefinition = require('./lib/themeVarsDefinition.json')

module.exports = {
  name: 'studio',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: {
    extensions: {
      studio: {
        type: 'object',
        properties: {
          favicon: {
            type: 'string',
            description: 'specifies the path to a custom favicon to use in the studio'
          },
          title: {
            type: 'string',
            description: 'The browser title that will be shown in studio, it accepts es6 template string for dynamic values',
            // eslint-disable-next-line no-template-curly-in-string
            default: 'jsreport ${jsreport.version}'
          },
          theme: {
            type: 'object',
            default: {},
            properties: {
              name: {
                type: 'string',
                enum: ['light'],
                description: 'specifies the default theme name that is going to be used in studio',
                default: 'light'
              },
              logo: {
                type: 'object',
                default: {},
                properties: {
                  path: {
                    type: 'string',
                    description: 'specifies the path to a custom logo to use in the studio UI'
                  },
                  base64: {
                    type: 'object',
                    description: 'specifies the base64 representation of a custom logo to use in the studio UI',
                    properties: {
                      type: {
                        type: 'string',
                        description: 'specifies the type of image of the custom logo. For example "png"'
                      },
                      content: {
                        type: 'string',
                        description: 'specifies the base64 string of a custom logo'
                      }
                    }
                  }
                }
              },
              editorThemeName: {
                type: 'string',
                enum: ['chrome', 'vs', 'vs-dark', 'hc-black'],
                description: 'specifies the theme name to use for the editor'
              },
              variables: {
                type: 'object',
                description: 'specifies the value of theme variables to customize the studio UI',
                properties: getThemeVariablesSchema(themeVarsDefinition)
              },
              customCss: {
                type: 'object',
                default: {},
                description: 'specifies the custom css that will be loaded with studio styles',
                properties: {
                  path: {
                    type: 'string',
                    description: 'specifies the path to the custom css file'
                  },
                  content: {
                    type: 'string',
                    description: 'specifies the custom css as string content'
                  }
                }
              }
            }
          },
          startupPage: {
            type: 'boolean',
            default: true
          },
          entityTreeOrder: {
            type: 'array',
            items: { type: 'string' }
          },
          entityTreeGroupMode: {
            type: 'string',
            enum: ['folders'],
            default: 'folders'
          },
          linkButtonVisibility: {
            type: 'boolean',
            default: true
          },
          webpackStatsInDevMode: {
            type: 'object'
          },
          extensionsInDevMode: {
            anyOf: [
              {
                type: 'string',
                '$jsreport-constantOrArray': []
              },
              {
                type: 'array',
                items: { type: 'string' }
              }
            ]
          }
        }
      }
    }
  },
  dependencies: ['express'],
  requires: {
    core: '4.x.x',
    express: '4.x.x'
  }
}

function getThemeVariablesSchema (themeVarsDefinition) {
  return themeVarsDefinition.reduce((acu, varDef) => {
    acu[varDef.name] = {
      type: 'string'
    }

    if (varDef.extends != null) {
      acu[varDef.name].description = `If not specified inherits value from variable "${varDef.extends}"`
    }

    return acu
  }, {})
}
