/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Sample report used in standard and multitenant version
 */

const path = require('path')
const util = require('util')
const fs = require('fs')
const omit = require('lodash.omit')
const readFileAsync = util.promisify(fs.readFile)
const pathToSamples = path.join(__dirname, '../samples.json')

module.exports = function (reporter, definition) {
  reporter.on('express-configure', (app) => {
    app.post('/studio/create-samples', async (req, res) => {
      const { ignore } = req.body

      try {
        const isAlreadyCreated = await reporter.settings.findValue('sample-created')

        if (isAlreadyCreated !== true) {
          if (ignore === true) {
            await reporter.settings.addOrSet('sample-created', true)
          } else {
            await createSamples(reporter)
          }
        }

        res.status(200).end()
      } catch (e) {
        reporter.logger.warn(`Unable to create samples. ${e.stack}`)

        res.status(500).end(e.message)
      }
    })
  })

  reporter.initializeListeners.add(definition.name, this, async () => {
    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        createSamples: definition.options.createSamples,
        skipCreateSamplesModal: definition.options.skipCreateSamplesModal
      })
    }

    if (reporter.compilation) {
      reporter.logger.debug('Skipping creation of samples because we are in compilation mode..')
      return
    }

    if (!definition.options.createSamples) {
      reporter.logger.debug('Creating samples is disabled')
      return
    }

    const isAlreadyCreated = await reporter.settings.findValue('sample-created')

    if (isAlreadyCreated === true && !definition.options.forceCreation) {
      return
    }

    await createSamples(reporter)
  })
}

async function createSamples (reporter) {
  reporter.logger.debug('Inserting samples')

  await reporter.settings.addOrSet('sample-created', true)

  const res = await readFileAsync(pathToSamples)
  const entities = JSON.parse(res)

  const found = await reporter.documentStore.collection('folders').findOne({
    name: 'samples'
  })

  if (found) {
    reporter.logger.debug('Not creating samples because "samples" folder already exists')
    return
  }

  reporter.logger.debug('Creating folder "samples" for sample entities')

  const rootFolder = await reporter.documentStore.collection('folders').insert({
    name: 'samples'
  })

  for (const es of ['folders', ...Object.keys(omit(entities, 'folders'))]) {
    const collection = reporter.documentStore.collection(es)
    let entitiesToProcess

    if (!collection) {
      entitiesToProcess = []
    } else {
      const doc = await collection.deserializeProperties(entities[es])
      entitiesToProcess = doc
    }

    for (const entity of entitiesToProcess) {
      const parentFolder = es === 'folders' ? { shortid: rootFolder.shortid } : entity.folder

      const previousEntity = await reporter.documentStore.collection(es).findOne({
        name: entity.name,
        folder: parentFolder
      })

      if (!previousEntity) {
        reporter.logger.debug(`Inserting sample entity ${entity.name} (entitySet: ${es})`)
        await reporter.documentStore.collection(es).insert({ ...entity, folder: parentFolder })
      }
    }
  }
}
