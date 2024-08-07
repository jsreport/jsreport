
module.exports.shouldDelegateTokenAuth = (definition) => {
  const options = definition.options

  if (!options.authorizationServer) {
    return false
  }

  if (!options.authorizationServer.name) {
    throw new Error(
      'authorizationServer.name config is required, ' +
      'please pass a name for your authorization server'
    )
  }

  if (!options.authorizationServer.issuer) {
    throw new Error(
      'authorizationServer.issuer config is required, ' +
      'please pass the issuer identifier of your authorization server'
    )
  }

  if (!options.authorizationServer.endpoints) {
    throw new Error(
      'authorizationServer.endpoints config is required, ' +
      'please pass object with urls pointing to the endpoints of your authorization server'
    )
  }

  if (!options.authorizationServer.endpoints.jwks) {
    throw new Error(
      'authorizationServer.endpoints.jwks config is required, ' +
      'please pass url pointing to the endpoint of your authorization server that exposes the JSON Web Key Sets needed to verify the tokens issued'
    )
  }

  if (!options.authorizationServer.endpoints.authorization) {
    throw new Error(
      'authorizationServer.endpoints.authorization config is required, ' +
      'please pass url pointing to the endpoint of your authorization server that starts the authorization process for the user'
    )
  }

  if (!options.authorizationServer.endpoints.token) {
    throw new Error(
      'authorizationServer.endpoints.token config is required, ' +
      'please pass url pointing to the endpoint of your authorization server that issues tokens'
    )
  }

  if (!options.authorizationServer.endpoints.introspection) {
    throw new Error(
      'authorizationServer.endpoints.introspection config is required, ' +
      'please pass url pointing to the endpoint of your authorization server that validates issued tokens'
    )
  }

  if (!options.authorizationServer.endpoints.userinfo) {
    throw new Error(
      'authorizationServer.endpoints.userinfo config is required, ' +
      'please pass url pointing to the endpoint of your authorization server that returns identity information about the user'
    )
  }

  if (!options.authorizationServer.studioClient) {
    throw new Error(
      'authorizationServer.studioClient config is required, ' +
      'please pass object with clientId and clientSecret for the registered jsreport studio client in your authorization server'
    )
  }

  if (!options.authorizationServer.studioClient.clientId) {
    throw new Error(
      'authorizationServer.studioClient.clientId config is required, ' +
      'please pass clientId for the registered jsreport studio client in your authorization server'
    )
  }

  if (!options.authorizationServer.studioClient.clientSecret) {
    throw new Error(
      'authorizationServer.studioClient.clientSecret config is required, ' +
      'please pass clientSecret for the registered jsreport studio client in your authorization server'
    )
  }

  if (!options.authorizationServer.apiResource) {
    throw new Error(
      'authorizationServer.apiResource config is required, ' +
      'please pass object with clientId and clientSecret for the registered jsreport http api resource in your authorization server'
    )
  }

  if (!options.authorizationServer.apiResource.clientId) {
    throw new Error(
      'authorizationServer.apiResource.clientId config is required, ' +
      'please pass clientId for the registered jsreport http api resource in your authorization server'
    )
  }

  if (!options.authorizationServer.apiResource.clientSecret) {
    throw new Error(
      'authorizationServer.apiResource.clientSecret config is required, ' +
      'please pass clientSecret for the registered jsreport http api resource in your authorization server'
    )
  }

  if (!options.authorizationServer.usernameField && !options.authorizationServer.groupField) {
    throw new Error(
      'one of authorizationServer.usernameField or authorizationServer.groupField config is required, ' +
      'please pass the name of the field which will contain either name the username or group name of the linked user in the authorization server response'
    )
  }

  return {
    name: options.authorizationServer.name,
    issuer: options.authorizationServer.issuer,
    endpoints: options.authorizationServer.endpoints,
    studioClient: options.authorizationServer.studioClient,
    apiResource: options.authorizationServer.apiResource,
    usernameField: options.authorizationServer.usernameField,
    groupField: options.authorizationServer.groupField,
    timeout: options.authorizationServer.timeout,
    authorizationRequest: options.authorizationServer.authorizationRequest == null ? {} : options.authorizationServer.authorizationRequest,
    introspectionRequest: options.authorizationServer.introspectionRequest == null ? {} : options.authorizationServer.introspectionRequest
  }
}

const bearerSchemaReg = /Bearer/i

module.exports.hasBearerSchema = (info) => {
  return Array.isArray(info) && info.some((item) => bearerSchemaReg.test(String(item)))
}

module.exports.authenticateToken = ({ authorizationServerAuth, client, documentStore, logger, admin, usersRepository }) => async (req, token, done) => {
  logger.debug(`Delegating token auth to authorization server at ${authorizationServerAuth.endpoints.introspection}`)

  try {
    const introspectParams = [token, 'access_token']
    let tokenResponse
    let tokenErr

    if (authorizationServerAuth.introspectionRequest.extraBody != null) {
      introspectParams.push({
        introspectBody: authorizationServerAuth.introspectionRequest.extraBody
      })
    }

    try {
      tokenResponse = await client.introspect(...introspectParams)
    } catch (introspectError) {
      tokenErr = introspectError

      if (introspectError.code === 'ETIMEDOUT' || introspectError.code === 'ESOCKETTIMEDOUT') {
        logger.error(
          'Timeout Error in authorization server request, no response was sent after ' +
          authorizationServerAuth.timeout +
          ' milliseconds: ' + introspectError.message
        )

        throw new Error('Timeout error while verifying token')
      }
    }

    if (!tokenResponse || (typeof tokenResponse !== 'object' || Array.isArray(tokenResponse))) {
      const msg = 'Authorization server has sent an invalid response, token assumed as invalid'

      if (tokenErr != null) {
        logger.error(`${msg}. ${tokenErr.message ? `Error: ${tokenErr.message}` : ''}`)
      } else {
        logErrorWithResponseBody(msg)
      }

      return done(null, false)
    }

    if (tokenResponse.active == null) {
      logErrorWithResponseBody('Authorization server has no "active" field in its response, token assumed as invalid', tokenResponse)
      return done(null, false)
    }

    if (tokenResponse.active !== true) {
      logErrorWithResponseBody('Authorization server has responded with a non-true value in "active" field, token assumed as invalid', tokenResponse)
      return done(null, false)
    }

    // validating scopes if user has configured it
    if (authorizationServerAuth.introspectionRequest.tokenValidScopes && authorizationServerAuth.introspectionRequest.tokenValidScopes.length) {
      let scopeResponse = tokenResponse.scope

      if (scopeResponse == null) {
        logErrorWithResponseBody('Authorization server has no "scope" field in its response, token assumed as invalid', tokenResponse)
        return done(null, false)
      }

      if (typeof scopeResponse === 'string') {
        scopeResponse = scopeResponse.split(' ').map((s) => s.trim())
      }

      if (Array.isArray(scopeResponse)) {
        const scopeValid = scopeResponse.some((scope) => {
          return authorizationServerAuth.introspectionRequest.tokenValidScopes.includes(scope)
        })

        if (!scopeValid) {
          logErrorWithResponseBody(
            'Authorization server response doesn\'t contain any valid scope: "' +
            scopeResponse.join(', ') +
            '" in "scope" field' +
            ', valid scopes are: ' + authorizationServerAuth.introspectionRequest.tokenValidScopes.join(', '),
            tokenResponse
          )
          return done(null, false)
        }
      }
    }

    let mode
    let userinfo

    if (
      authorizationServerAuth.groupField != null &&
      tokenResponse[authorizationServerAuth.groupField] != null
    ) {
      mode = 'group'
    } else if (
      authorizationServerAuth.usernameField != null &&
      tokenResponse[authorizationServerAuth.usernameField] != null
    ) {
      mode = 'user'
    }

    if (mode == null) {
      userinfo = await client.userinfo(token)

      if (authorizationServerAuth.groupField != null && userinfo[authorizationServerAuth.groupField] != null) {
        mode = 'group'
      } else {
        mode = 'user'
      }
    }

    let resolvedUser

    if (mode === 'group') {
      let groupFromAuthServer = tokenResponse[authorizationServerAuth.groupField]

      // check for group field presence in the token, if not there
      // we get it from the userinfo endpoint
      if (groupFromAuthServer == null && userinfo != null) {
        groupFromAuthServer = userinfo[authorizationServerAuth.groupField]
      }

      if (groupFromAuthServer == null) {
        logErrorWithResponseBody(`Authorization server has no "${authorizationServerAuth.groupField}" field (group) in its response, token assumed as invalid`, tokenResponse)
        return done(null, false)
      }

      if (typeof groupFromAuthServer !== 'string' || groupFromAuthServer.trim() === '') {
        logErrorWithResponseBody(`Authorization server has responded with an invalid value in group field "${authorizationServerAuth.groupField}", token assumed as invalid`, tokenResponse)
        return done(null, false)
      }

      const group = await documentStore.collection('usersGroups').findOne({
        name: groupFromAuthServer
      }, req)

      if (!group) {
        logErrorWithResponseBody(`group "${groupFromAuthServer}" returned from authorization server is not a jsreport group`, tokenResponse)
        return done(null, false)
      }

      let customUsername

      if (
        authorizationServerAuth.usernameField != null &&
        tokenResponse[authorizationServerAuth.usernameField] != null
      ) {
        customUsername = tokenResponse[authorizationServerAuth.usernameField]
      } else if (
        authorizationServerAuth.usernameField != null &&
        userinfo != null &&
        userinfo[authorizationServerAuth.usernameField] != null
      ) {
        customUsername = userinfo[authorizationServerAuth.usernameField]
      }

      resolvedUser = {
        _id: group._id,
        name: customUsername != null ? customUsername : group.name,
        isGroup: true
      }
    } else {
      let usernameFromAuthServer = tokenResponse[authorizationServerAuth.usernameField]

      // check for username field presence in the token, if not there
      // we get it from the userinfo endpoint
      if (usernameFromAuthServer == null && userinfo != null) {
        usernameFromAuthServer = userinfo[authorizationServerAuth.usernameField]
      }

      if (usernameFromAuthServer == null) {
        logErrorWithResponseBody(`Authorization server has no "${authorizationServerAuth.usernameField}" field in its response, token assumed as invalid`, tokenResponse)
        return done(null, false)
      }

      if (typeof usernameFromAuthServer !== 'string' || usernameFromAuthServer.trim() === '') {
        logErrorWithResponseBody(`Authorization server has responded with an invalid value in username field "${authorizationServerAuth.usernameField}", token assumed as invalid`, tokenResponse)
        return done(null, false)
      }

      if (admin.username === usernameFromAuthServer) {
        resolvedUser = admin
      } else {
        const user = await usersRepository.find(usernameFromAuthServer)

        if (!user) {
          logErrorWithResponseBody(`username "${usernameFromAuthServer}" returned from authorization server is not a jsreport user`, tokenResponse)
          return done(null, false)
        }

        resolvedUser = user
      }
    }

    logger.debug('Token auth in authorization server was validated correctly')
    req.authServerTokenValidationResponse = tokenResponse
    done(null, resolvedUser)
  } catch (err) {
    logger.error(`Error during authorization server request: ${err.message}`)
    return done(err)
  }

  function logErrorWithResponseBody (msg, tokenResponse) {
    if (tokenResponse) {
      logger.debug(`Authorization server introspection response: ${JSON.stringify(tokenResponse)}`)
    }

    logger.error(msg)
  }
}
