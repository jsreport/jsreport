/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Extension allows to share report template with non authenticated users by providing
 * auth tokens.
 */

const { customAlphabet } = require('nanoid')
const nanoid = customAlphabet('0123456789abcdef', 32)

async function generateSharingToken (reporter, shortid, req) {
  const template = await reporter.documentStore.collection('templates').findOne({ shortid: shortid }, req)

  if (!template) {
    throw reporter.createError(`Unable to find template with shortid: ${shortid}`, {
      statusCode: 400
    })
  }

  const token = uuidv4()

  template.readSharingToken = token

  await reporter.documentStore.collection('templates').update({ shortid: shortid }, {
    $set: {
      readSharingToken: template.readSharingToken
    }
  }, req)

  return token
}

function routes (reporter) {
  return (app) => {
    app.post('/api/templates/sharing/:shortid/access/:access', (req, res, next) => {
      generateSharingToken(reporter, req.params.shortid, req).then((token) => {
        res.send({
          token: token
        })
      }).catch(next)
    })

    app.get('/public-templates', (req, res, next) => {
      const templatesCol = reporter.documentStore.collection('templates')

      templatesCol.findOne({ readSharingToken: req.query.access_token }).then((template) => {
        if (!template) {
          return res.status(401).end('Invalid access token or template is no longer shared')
        }

        reporter.express.render({
          template
        }, req, res, next)
      }).catch(next)
    })
  }
}

function uuidv4 () {
  const id = nanoid()
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
}

module.exports = (reporter, definition) => {
  if (!reporter.documentStore.model.entityTypes.TemplateType || !reporter.authentication || !reporter.authorization) {
    definition.options.enabled = false
    return
  }

  reporter.documentStore.model.entityTypes.TemplateType.readSharingToken = { type: 'Edm.String' }
  reporter.on('express-configure', routes(reporter))
  reporter.initializeListeners.add('public-templates', () => reporter.emit('export-public-route', '/public-templates'))
}
