const Passport = require('passport').Passport
const BasicStrategy = require('passport-http').BasicStrategy
const express = require('express')
const bodyParser = require('body-parser')
const passport = new Passport()

module.exports = function createAuthServer (_options) {
  const options = _options || {}
  const app = express()
  let mainUser
  let mainToken
  let mainTokenUsername
  const usernameField = options.usernameField || 'username'
  const activeField = options.activeField || 'active'
  const scopeField = (options.scope && options.scope.field) || 'scope'
  const validScopes = (options.scope && options.scope.valid) || []

  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(bodyParser.json())

  if (options.token) {
    mainToken = options.token.value
    mainTokenUsername = options.token.username
  }

  // require authentication for endpoints when user options was specified
  if (options.user) {
    mainUser = options.user

    app.use(passport.initialize())

    passport.use(new BasicStrategy((username, password, done) => {
      if (username === mainUser.username && password === mainUser.password) {
        return done(null, mainUser)
      }

      return done(null, false)
    }))

    app.use('/', passport.authenticate('basic', { session: false }))
  }

  app.post('/reply-body', (req, res) => {
    let isUrlEncoded = req.is('urlencoded')
    let isJson = req.is('json')

    isUrlEncoded = (isUrlEncoded === 'urlencoded') ? true : isUrlEncoded
    isJson = (isJson === 'json') ? true : isJson

    const payload = {
      isFormEncoded: isUrlEncoded,
      isJson: isJson,
      data: req.body
    }

    payload[activeField] = true
    payload[usernameField] = 'admin'

    res.status(200).json(payload)
  })

  app.post('/timeout', (req, res) => {
    const payload = {}

    setTimeout(() => {
      payload[activeField] = true
      payload[usernameField] = 'admin'

      res.status(200).json(payload)
    }, 10000)
  })

  app.post('/token/introspection', (req, res) => {
    if (!mainToken) {
      return res.status(500).end()
    }

    const payload = {}
    const isValid = (mainToken === req.body.token)

    payload[activeField] = isValid

    if (isValid) {
      payload[usernameField] = mainTokenUsername

      if (validScopes.length) {
        payload[scopeField] = validScopes
      }
    }

    res.status(200).json(payload)
  })

  app.use((err, req, res, next) => {
    console.error('final error handler in auth server:', err)
    res.status(500).end()
  })

  return new Promise((resolve, reject) => {
    let isServerBound = false

    // start on random port
    app.listen(0, function () {
      isServerBound = true

      resolve({
        port: this.address().port,
        app: app
      })
    })

    app.on('error', (err) => {
      if (!isServerBound) {
        app.close(() => reject(err))
      }
    })
  })
}
