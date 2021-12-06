const express = require('express')
const { Provider } = require('oidc-provider')

module.exports = function createAuthServer (options) {
  const ISSUER = options.issuer
  const PORT = options.port
  const STUDIO_CLIENT = options.studioClient
  const API_RESOURCE = options.apiResource

  const studioClient = {
    client_id: STUDIO_CLIENT.clientId,
    client_secret: STUDIO_CLIENT.clientSecret,
    client_name: 'jsreport studio Web Application',
    redirect_uris: [STUDIO_CLIENT.redirectUri]
  }

  const apiResourceClient = {
    client_id: API_RESOURCE.clientId,
    client_secret: API_RESOURCE.clientSecret,
    client_name: 'jsreport HTTP API',
    redirect_uris: [],
    response_types: [],
    grant_types: []
  }

  const configuration = {
    async findAccount (ctx, sub, token) {
      return {
        accountId: sub,
        async claims (use, scope, claims, rejected) {
          if (sub === 'guser') {
            return {
              sub,
              group: 'g1'
            }
          }

          if (sub === 'guser2') {
            return {
              sub,
              group: 'g1',
              username: 'custom'
            }
          }

          return {
            sub,
            username: sub
          }
        }
      }
    },
    claims: {
      authProfile: ['username', 'group']
    },
    scopes: [
      'openid',
      'offline_access',
      'jsreport'
    ],
    features: {
      introspection: {
        allowedPolicy: () => {
          return true
        },
        enabled: true
      }
    },
    clients: [studioClient, apiResourceClient],
    pkce: {
      required: function pkceRequired (ctx, client) {
        return false
      }
    },
    routes: {
      jwks: '/.well-known/openid-configuration/jwks',
      authorization: '/connect/authorize',
      introspection: '/connect/introspect',
      token: '/connect/token',
      userinfo: '/connect/userinfo'
    }
  }

  const oidc = new Provider(ISSUER, configuration)
  const app = express()

  oidc.on('access_token.saved', (token) => {
    console.log(`NEW access_token "${token.jti}" saved`, token)
  })

  app.use('/', oidc.callback())

  return new Promise((resolve, reject) => {
    let isServerBound = false

    // start on random port
    app.listen(PORT, function () {
      isServerBound = true
      console.log(`oidc-provider listening on port ${PORT}, check http://localhost:${PORT}/.well-known/openid-configuration`)
      resolve(app)
    })

    app.on('error', (err) => {
      if (!isServerBound) {
        app.close(() => reject(err))
      }
    })
  })
}
