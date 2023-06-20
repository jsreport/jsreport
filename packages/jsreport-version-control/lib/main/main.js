const VC = require('./versionControl')

module.exports = (reporter, definition) => {
  const options = Object.assign({}, reporter.options.versionControl, definition.options)

  reporter.versionControl = {
    providers: {},
    registerProvider (name, p) {
      this.providers[name] = p
    }
  }

  reporter.versionControl.registerProvider('default', VC(reporter, options))

  reporter.initializeListeners.add('version-control', () => {
    const selectedProvider = options.provider || 'default'
    const provider = reporter.versionControl.providers[selectedProvider]

    if (!provider) {
      throw new Error(`Version control provider with name ${selectedProvider} not registered`)
    }

    Object.assign(reporter.versionControl, provider)

    return reporter.versionControl.init(

    )
  })

  reporter.on('express-configure', (app) => {
    app.use('/api/version-control', async (req, res, next) => {
      if (reporter.authentication == null) {
        return next()
      }

      try {
        const isAdmin = await reporter.authentication.isUserAdmin(req?.context?.user, req)

        if (req.context && req.context.user && isAdmin) {
          return next()
        }

        throw reporter.createError('version control is only available for admin user', {
          statusCode: 401
        })
      } catch (error) {
        next(error)
      }
    })

    app.post('/api/version-control/commit', (req, res, next) => {
      reporter.versionControl.commit(req.body.message, false, req)
        .then(() => res.status(200).end())
        .catch((next))
    })

    app.get('/api/version-control/history', (req, res, next) => {
      reporter.versionControl.history(req)
        .then((h) => res.send(h))
        .catch(next)
    })

    app.get('/api/version-control/diff/:id', (req, res, next) => {
      reporter.versionControl.diff(req.params.id, req)
        .then((d) => res.send(d))
        .catch(next)
    })

    app.get('/api/version-control/local-changes', (req, res, next) => {
      reporter.versionControl.localChanges(req)
        .then((d) => res.send(d))
        .catch(next)
    })

    app.post('/api/version-control/checkout', (req, res, next) => {
      reporter.versionControl.checkout(req.body._id, req)
        .then((d) => res.send({ status: 1 }))
        .catch(next)
    })

    app.post('/api/version-control/revert', (req, res, next) => {
      reporter.versionControl.revert(req)
        .then((d) => res.send({ status: 1 }))
        .catch(next)
    })
  })
}
