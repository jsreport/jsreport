module.exports = {
  name: 'authentication',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  optionsSchema: {
    migrateAuthenticationUsernameProp: {
      type: 'boolean',
      default: true
    },
    extensions: {
      authentication: {
        type: 'object',
        properties: {
          cookieSession: {
            type: 'object',
            properties: {
              cookie: { type: 'object' },
              secret: { type: 'string' }
            }
          },
          admin: {
            type: 'object',
            properties: {
              username: { type: 'string' },
              password: { type: 'string' }
            }
          },
          authorizationServer: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              issuer: { type: 'string' },
              endpoints: {
                type: 'object',
                properties: {
                  jwks: { type: 'string' },
                  authorization: { type: 'string' },
                  token: { type: 'string' },
                  introspection: { type: 'string' },
                  userinfo: { type: 'string' }
                }
              },
              studioClient: {
                clientId: { type: 'string' },
                clientSecret: { type: 'string' },
                authType: {
                  type: 'string',
                  enum: ['basic', 'post'],
                  default: 'basic'
                }
              },
              apiResource: {
                clientId: { type: 'string' },
                clientSecret: { type: 'string' },
                authType: {
                  type: 'string',
                  enum: ['basic', 'post'],
                  default: 'basic'
                }
              },
              usernameField: { type: 'string', default: 'username' },
              groupField: { type: 'string', default: 'group' },
              timeout: { type: 'number', default: 3500 },
              authorizationRequest: {
                type: 'object',
                properties: {
                  scope: {
                    anyOf: [
                      {
                        type: 'string',
                        '$jsreport-constantOrArray': []
                      },
                      {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    ],
                    default: ['openid', 'profile']
                  }
                },
                default: {}
              },
              introspectionRequest: {
                type: 'object',
                properties: {
                  tokenValidScopes: {
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
                  },
                  extraBody: { type: 'object' }
                }
              }
            }
          }
        }
      }
    }
  },
  dependencies: [],
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
  },
  skipInExeRender: true
}
