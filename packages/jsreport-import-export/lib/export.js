const pkg = require('../package.json')
const pReduce = require('p-reduce')
const { zipEntities } = require('./helpers')

async function exportToStream (reporter, selection, req) {
  reporter.logger.debug('exporting objects, with selection ' + JSON.stringify(selection || []))

  const exportableCollectionsWithoutFolders = Object.keys(reporter.documentStore.collections).filter((collectionName) => {
    return (
      (
        // null check for back-compatible support
        reporter.documentStore.model.entitySets[collectionName].exportable == null ||
        reporter.documentStore.model.entitySets[collectionName].exportable === true
      ) && collectionName !== 'folders'
    )
  })

  const foldersRefInExport = []

  await reporter.documentStore.beginTransaction(req)

  let entities

  try {
    entities = await pReduce(exportableCollectionsWithoutFolders, async (acu, c) => {
      acu[c] = []

      const collection = reporter.documentStore.collection(c)

      if (!collection) {
        return acu
      }

      let res = await collection.find({}, req)

      if (selection) {
        res = res.filter((r) => {
          return selection.indexOf(r._id.toString()) > -1
        })
      }

      if (res.length > 0) {
        res.forEach((r) => {
          if (r.folder != null && !foldersRefInExport.includes(r.folder.shortid)) {
            foldersRefInExport.push(r.folder.shortid)
          }
        })
      }

      const serializedEntities = await collection.serializeProperties(res)

      acu[c] = serializedEntities

      return acu
    }, {})

    if (reporter.documentStore.collections.folders != null) {
      const foldersRefIds = []

      if (foldersRefInExport.length > 0) {
        const results = await Promise.all(foldersRefInExport.map(async (fShortid) => {
          const pFolders = await getParentFoldersInFolder(reporter, fShortid, req)
          return pFolders.map((f) => f._id.toString())
        }))

        results.forEach((folders) => {
          folders.forEach((fId) => {
            if (!foldersRefIds.includes(fId)) {
              foldersRefIds.push(fId)
            }
          })
        })
      }

      let folders = await reporter.documentStore.collections.folders.find({}, req)

      if (selection) {
        folders = folders.filter((r) => {
          return foldersRefIds.includes(r._id.toString()) || selection.includes(r._id.toString())
        })
      }

      const collection = reporter.documentStore.collection('folders')
      const serializedEntities = await collection.serializeProperties(folders)

      entities.folders = serializedEntities
    }

    await reporter.documentStore.rollbackTransaction(req)
  } catch (e) {
    await reporter.documentStore.rollbackTransaction(req)

    throw e
  }

  const sum = Object.keys(entities).reduce((o, v, i) => (o + entities[v].length), 0)

  reporter.logger.debug(`export will backup ${sum} objects`)

  const stream = zipEntities(entities, {
    reporterVersion: reporter.version,
    importExportVersion: pkg.version,
    storeProvider: reporter.options.store.provider,
    createdAt: new Date().getTime()
  })

  return {
    entitiesCount: Object.keys(entities).reduce((acu, entitySet) => {
      acu[entitySet] = entities[entitySet].length
      return acu
    }, {}),
    stream
  }
}

async function getParentFoldersInFolder (reporter, fShortid, req) {
  const folders = []

  let currentFolder = await reporter.documentStore.collection('folders').findOne({
    shortid: fShortid
  }, req)

  if (currentFolder != null) {
    folders.push(currentFolder)
  }

  while (currentFolder != null) {
    if (currentFolder.folder != null) {
      currentFolder = await reporter.documentStore.collection('folders').findOne({
        shortid: currentFolder.folder.shortid
      }, req)

      if (currentFolder != null) {
        folders.push(currentFolder)
      }
    } else {
      currentFolder = null
    }
  }

  return folders
}

module.exports = exportToStream
