const extend = require('node.extend.without.arrays')

module.exports = function (reporter, definition) {
  reporter.documentStore.registerEntityType('ComponentType', {
    name: { type: 'Edm.String' },
    content: { type: 'Edm.String', document: { main: true, extension: 'html', engine: true } },
    helpers: { type: 'Edm.String', document: { main: true, extension: 'js' }, schema: { type: 'object' } },
    engine: { type: 'Edm.String' }
  })

  reporter.documentStore.addFileExtensionResolver(function (doc, entitySetName, entityType, propertyType) {
    if (entitySetName === 'components' && propertyType.document.engine) {
      return doc.engine
    }
  })

  reporter.documentStore.registerEntitySet('components', {
    entityType: 'jsreport.ComponentType',
    splitIntoDirectories: true
  })

  reporter.initializeListeners.add('components', () => {
    reporter.documentStore.collection('components').beforeInsertListeners.add('components', (doc) => {
      if (!doc.engine) {
        throw reporter.createError('Component must contain engine', {
          weak: true,
          statusCode: 400
        })
      }
    })

    reporter.documentStore.collection('components').beforeUpdateListeners.add('components', (q, u) => {
      if ('engine' in u.$set) {
        if (!u.$set.engine) {
          throw reporter.createError('Component must contain engine', {
            statusCode: 400,
            weak: true
          })
        }
      }
    })
  })

  reporter.on('express-configure', (app) => {
    app.post('/api/component', async (req, res, next) => {
      try {
        const component = req.body.component
        // we create clean request from the http req object
        const localReq = reporter.Request(req)

        if (!component?.shortid) {
          throw reporter.createError('Missing component.shortid parameter in body', {
            weak: true,
            statusCode: 400
          })
        }

        let componentEntity = await reporter.documentStore.collection('components').findOne({
          shortid: component.shortid
        }, localReq)

        if (!componentEntity && component.content == null) {
          throw reporter.createError(`Component does not exists with shortid "${component.shortid}"`, {
            weak: true,
            statusCode: 404
          })
        }

        componentEntity = componentEntity ? extend(true, {}, componentEntity, component) : component

        if (componentEntity.engine == null) {
          throw reporter.createError('Component engine must be specified', {
            weak: true,
            statusCode: 400
          })
        }

        const payload = {
          component: componentEntity
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'data')) {
          reporter.logger.debug('Inline data specified for component.')
          payload.data = req.body.data
        } else {
          if (!componentEntity.data?.shortid && !componentEntity.data?.name) {
            reporter.logger.debug('Data item not defined for this component.')
            payload.data = {}
          } else {
            const findDataItem = async () => {
              const query = {}
              if (componentEntity.data.shortid) {
                query.shortid = componentEntity.data.shortid
              }

              if (componentEntity.data.name) {
                query.name = componentEntity.data.name
              }

              const items = await reporter.documentStore.collection('data').find(query, localReq)

              if (items.length !== 1) {
                throw reporter.createError(`Data entry not found (${(componentEntity.data.shortid || componentEntity.data.name)})`, {
                  weak: true,
                  statusCode: 404
                })
              }

              reporter.logger.debug('Adding sample data ' + (componentEntity.data.name || componentEntity.data.shortid))
              return items[0]
            }

            const dataEntity = await findDataItem()

            try {
              payload.data = JSON.parse(dataEntity.dataJson)
            } catch (e) {
              throw reporter.createError('Failed to parse data json', {
                weak: true,
                statusCode: 400,
                original: e
              })
            }
          }
        }

        if (
          payload.data != null &&
          typeof payload.data === 'object' &&
          Array.isArray(payload.data)
        ) {
          throw reporter.createError('Component data can not be an array. you should pass an object in request.data input', {
            weak: true,
            statusCode: 400
          })
        }

        const componentHtml = await reporter.executeWorkerAction('component-preview', payload, {
          timeoutErrorMessage: 'Timeout during execution of component preview'
        }, localReq)

        res.status(200).send(componentHtml)
      } catch (err) {
        next(err)
      }
    })
  })
}
