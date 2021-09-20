const axios = require('axios')
const querystring = require('querystring')

module.exports.shouldDelegateTokenAuth = (definition) => {
  const options = definition.options
  let usernameField
  let activeField
  let scope
  let auth
  let hint
  let timeout = 6000
  let sendAsJSON = false

  if (!options.authorizationServer) {
    return false
  }

  if (!options.authorizationServer.tokenValidation) {
    return false
  }

  const tokenValidation = options.authorizationServer.tokenValidation

  if (tokenValidation.sendAsJSON === true) {
    sendAsJSON = true
  }

  if (tokenValidation.hint != null) {
    hint = tokenValidation.hint
  }

  if (tokenValidation.endpoint == null) {
    throw new Error(
      'authorizationServer.tokenValidation.endpoint config is required, ' +
        'please pass the url to the token validation endpoint of your authorization server'
    )
  }

  if (
    typeof tokenValidation.endpoint !== 'string' ||
      tokenValidation.endpoint === ''
  ) {
    throw new Error(
      'authorizationServer.tokenValidation.endpoint config has an invalid value, ' +
        'please pass the url to the token validation endpoint of your authorization server'
    )
  }

  const endpoint = tokenValidation.endpoint

  if (tokenValidation.timeout != null && typeof tokenValidation.timeout === 'number') {
    timeout = tokenValidation.timeout
  }

  if (
    (tokenValidation.usernameField != null &&
      typeof tokenValidation.usernameField !== 'string') ||
      tokenValidation.usernameField === ''
  ) {
    throw new Error('authorizationServer.tokenValidation.usernameField config has an invalid value')
  }

  if (tokenValidation.usernameField == null) {
    usernameField = 'username'
  } else {
    usernameField = tokenValidation.usernameField
  }

  if (
    (tokenValidation.activeField != null &&
      typeof tokenValidation.activeField !== 'string') ||
      tokenValidation.activeField === ''
  ) {
    throw new Error('authorizationServer.tokenValidation.activeField config has an invalid value')
  }

  if (tokenValidation.activeField == null) {
    activeField = 'active'
  } else {
    activeField = tokenValidation.activeField
  }

  if (tokenValidation.scope != null) {
    if (typeof tokenValidation.scope !== 'object' || (typeof tokenValidation.scope === 'object' && Array.isArray(tokenValidation.scope))) {
      throw new Error('authorizationServer.tokenValidation.scope config has an invalid value')
    }

    scope = {}

    if (tokenValidation.scope.field != null) {
      if (typeof tokenValidation.scope.field !== 'string') {
        throw new Error('authorizationServer.tokenValidation.scope.field config has an invalid value')
      }

      scope.field = tokenValidation.scope.field
    } else {
      scope.field = 'scope'
    }

    if (tokenValidation.scope.valid == null) {
      throw new Error('authorizationServer.tokenValidation.scope.valid config is required when using scope config')
    }

    if (!Array.isArray(tokenValidation.scope.valid)) {
      throw new Error('authorizationServer.tokenValidation.scope.valid config has an invalid value')
    }

    scope.valid = tokenValidation.scope.valid
  }

  if (tokenValidation.auth == null) {
    throw new Error(
      'authorizationServer.tokenValidation.auth config is required by default, pass a correct auth type with your credentials ' +
        'or pass false if you want to disable authentication to the authorization server'
    )
  }

  if (tokenValidation.auth === false) {
    auth = tokenValidation.auth
  } else {
    if (tokenValidation.auth.type !== 'basic' && tokenValidation.auth.type !== 'bearer') {
      throw new Error('authorizationServer.tokenValidation.auth.type config has no value or an invalid one, please use either "basic" or "bearer"')
    }

    auth = {
      type: tokenValidation.auth.type
    }

    if (tokenValidation.auth.type === 'basic') {
      if (tokenValidation.auth.basic == null) {
        throw new Error('authorizationServer.tokenValidation.auth.basic config is required when using authorizationServer.tokenValidation.auth.type === "basic"')
      }

      if (typeof tokenValidation.auth.basic.clientId !== 'string' || tokenValidation.auth.basic.clientId === '') {
        throw new Error('authorizationServer.tokenValidation.auth.basic.clientId config has an invalid value, please pass a valid clientId string')
      }

      if (typeof tokenValidation.auth.basic.clientSecret !== 'string' || tokenValidation.auth.basic.clientSecret === '') {
        throw new Error('authorizationServer.tokenValidation.auth.basic.clientSecret config has an invalid value, please pass a valid clientSecret string')
      }

      auth.credentials = {
        clientId: tokenValidation.auth.basic.clientId,
        clientSecret: tokenValidation.auth.basic.clientSecret
      }
    } else if (tokenValidation.auth.type === 'bearer') {
      if (tokenValidation.auth.bearer == null) {
        throw new Error('authorizationServer.tokenValidation.auth.bearer config is required when using authorizationServer.tokenValidation.auth.type === "bearer"')
      }

      if (
        typeof tokenValidation.auth.bearer !== 'string' ||
          tokenValidation.auth.bearer === ''
      ) {
        throw new Error('authorizationServer.tokenValidation.auth.bearer config has an invalid value, please pass a valid token string')
      }

      auth.credentials = tokenValidation.auth.bearer
    }
  }

  return {
    endpoint: endpoint,
    timeout: timeout,
    sendAsJSON: sendAsJSON,
    hint: hint,
    usernameField: usernameField,
    activeField: activeField,
    scope: scope,
    auth: auth
  }
}

const bearerSchemaReg = /Bearer/i

module.exports.hasBearerSchema = (info) => {
  return Array.isArray(info) && info.some((item) => bearerSchemaReg.test(String(item)))
}

module.exports.authenticateToken = ({ authorizationServerAuth, logger, admin, usersRepository }) => (req, token, done) => {
  let isBearerAuth
  let credentials
  let jsonRequest = false

  const reqOpts = {
    method: 'post',
    url: authorizationServerAuth.endpoint,
    timeout: authorizationServerAuth.timeout
  }

  const data = {}

  if (authorizationServerAuth.hint != null) {
    if (Array.isArray(authorizationServerAuth.hint)) {
      authorizationServerAuth.hint.forEach(function (item) {
        if (item.name) {
          data[String(item.name)] = item.value
        }
      })
    } else if (typeof authorizationServerAuth.hint === 'object') {
      if (authorizationServerAuth.hint.name) {
        data[String(authorizationServerAuth.hint.name)] = authorizationServerAuth.hint.value
      }
    } else {
      data.hint = authorizationServerAuth.hint
    }
  }

  data.token = token
  data.token_type_hint = 'access_token'

  if (authorizationServerAuth.sendAsJSON) {
    jsonRequest = true
  }

  if (jsonRequest) {
    reqOpts.headers = {
      'Content-Type': 'application/json'
    }

    reqOpts.data = data
  } else {
    reqOpts.headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    }

    reqOpts.data = querystring.stringify(data)
  }

  if (authorizationServerAuth.auth !== false) {
    isBearerAuth = (authorizationServerAuth.auth.type === 'bearer')
    credentials = authorizationServerAuth.auth.credentials

    if (isBearerAuth) {
      reqOpts.headers.Authorization = `Bearer ${token}`
    } else {
      reqOpts.auth = {
        username: credentials.clientId,
        password: credentials.clientSecret
      }
    }
  }

  logger.debug('Delegating token auth to authorization server at ' + reqOpts.url)

  function handleResponse (err, authRes) {
    let tokenResponse
    let scopeResponse
    let scopeValid

    if (err) {
      if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
        logger.error(
          'Timeout Error in authorization server request, no response was sent after ' +
          authorizationServerAuth.timeout +
          ' milliseconds: ' + err.message
        )

        return done(new Error('Timeout error while verifying token'))
      }

      logger.error('Error in authorization server request: ' + err.message)
      return done(err)
    }

    const body = authRes.data

    if (authRes.status !== 200) {
      logger.error('Authorization server has sent an invalid status code (' + authRes.status + ') in response, token assumed as invalid')
      return done(null, false)
    }

    if (body && typeof body === 'object') {
      tokenResponse = body
    } else {
      try {
        tokenResponse = JSON.parse(body)
      } catch (e) {}
    }

    if (!tokenResponse || (typeof tokenResponse !== 'object' || Array.isArray(tokenResponse))) {
      logger.error('Authorization server has sent an invalid response, token assumed as invalid')
      return done(null, false)
    }

    if (tokenResponse[authorizationServerAuth.activeField] == null) {
      logger.error('Authorization server has no "' + authorizationServerAuth.activeField + '" field in its response, token assumed as invalid')
      return done(null, false)
    }

    if (tokenResponse[authorizationServerAuth.activeField] !== true) {
      logger.error('Authorization server has responded with a non-true value in active field "' + authorizationServerAuth.activeField + '", token assumed as invalid')
      return done(null, false)
    }

    // check for username field presence if the token is active
    if (tokenResponse[authorizationServerAuth.usernameField] == null) {
      logger.error('Authorization server has no "' + authorizationServerAuth.usernameField + '" field in its response, token assumed as invalid')
      return done(null, false)
    }

    if (typeof tokenResponse[authorizationServerAuth.usernameField] !== 'string' || tokenResponse[authorizationServerAuth.usernameField].trim() === '') {
      logger.error('Authorization server has responded with an invalid value in username field "' + authorizationServerAuth.usernameField + '", token assumed as invalid')
      return done(null, false)
    }

    // validating scopes if user has configured it
    if (authorizationServerAuth.scope && authorizationServerAuth.scope.valid.length) {
      scopeResponse = tokenResponse[authorizationServerAuth.scope.field]

      if (scopeResponse == null) {
        logger.error('Authorization server has no "' + authorizationServerAuth.scope.field + '" field in its response, token assumed as invalid')
        return done(null, false)
      }

      if (typeof scopeResponse === 'string') {
        scopeResponse = scopeResponse.split(' ').map((s) => s.trim())
      }

      if (Array.isArray(scopeResponse)) {
        scopeValid = scopeResponse.some(function (scope) {
          return authorizationServerAuth.scope.valid.indexOf(scope) !== -1
        })

        if (!scopeValid) {
          logger.error(
            'Authorization server response doesn\'t contain any valid scope type: "' +
            scopeResponse.join(', ') +
            '" in scope field "' + authorizationServerAuth.scope.field +
            '", valid scopes are: ' + authorizationServerAuth.scope.valid.join(', ')
          )
          return done(null, false)
        }
      }
    }

    logger.debug('Token auth in authorization server was validated correctly')

    if (admin.username === tokenResponse[authorizationServerAuth.usernameField]) {
      req.authServerTokenValidationResponse = tokenResponse
      return done(null, admin)
    }

    usersRepository.find(
      tokenResponse[authorizationServerAuth.usernameField]
    ).then(function (user) {
      if (!user) {
        logger.error('username "' + tokenResponse[authorizationServerAuth.usernameField] + '" returned from authorization server is not a jsreport user')
        return done(null, false)
      }

      req.authServerTokenValidationResponse = tokenResponse
      done(null, user)
    }).catch(function (e) {
      done(e)
    })
  }

  axios(reqOpts).then((response) => {
    handleResponse(null, response)
  }).catch((err) => {
    if (err.response) {
      handleResponse(null, err.response)
    } else {
      handleResponse(err)
    }
  })
}
