const saveExportStream = require('./saveExportStream')

const nameEntitySetMap = {
  f: 'folders',
  t: 'templates',
  d: 'data'
}

const defaults = {
  templates: {
    engine: 'none',
    recipe: 'html'
  },
  data: {
    dataJson: '{}'
  }
}

function conflictsUtils (reporter) {
  const localReq = reporter.Request({})
  let exportPath

  return {
    get req () {
      return localReq
    },
    async exportEntities (...toCreate) {
      const entities = await create(reporter, toCreate, localReq)
      const { stream } = await reporter.export(entities.map((e) => e._id), localReq)
      const exportFilePath = await saveExportStream(reporter, stream)

      for (const entitySet of Object.keys(reporter.documentStore.collections)) {
        if (entitySet === 'folders') {
          await Promise.all((await reporter.documentStore.collection(entitySet).find({}, localReq)).map(async (e) => {
            return reporter.documentStore.collection(entitySet).remove({
              _id: e._id
            }, localReq)
          }))
        } else {
          await reporter.documentStore.collection(entitySet).remove({}, localReq)
        }
      }

      exportPath = exportFilePath

      return { entities, exportFilePath }
    },
    async importEntities (...args) {
      let opts
      let toCreate

      if (!exportPath) {
        throw new Error('.importEntities should be called after .exportEntities')
      }

      if (typeof args[0] === 'object') {
        opts = args[0]
        toCreate = args.slice(1)
      } else {
        toCreate = args
      }

      const entities = await create(reporter, toCreate, localReq)

      await reporter.import(exportPath, opts, localReq)

      return { entities }
    },
    async assertExists (...args) {
      const lastArg = args.slice(-1)[0]
      let toVerify
      let customFn

      if (typeof lastArg === 'function') {
        toVerify = args.slice(0, -1)
        customFn = lastArg
      } else {
        toVerify = args
      }

      for (const item of toVerify) {
        const { entitySet, entityName, parentFolder } = parseName(item)

        if (!reporter.documentStore.collection(entitySet)) {
          throw new Error(`There is no collection "${entitySet}"`)
        }

        const query = {
          name: entityName,
          folder: null
        }

        if (parentFolder) {
          const folderSearch = await reporter.folders.resolveEntityFromPath(parentFolder, 'folders', localReq)

          if (!folderSearch) {
            throw new Error(`Parent folder of entity ${item} does not exists`)
          }

          query.folder = {
            shortid: folderSearch.entity.shortid
          }
        }

        const found = await reporter.documentStore.collection(entitySet).findOne(query, localReq)

        if (!found) {
          throw new Error(`Entity ${item} does not exists`)
        }
      }

      const entities = {}

      for (const entitySet of Object.keys(reporter.documentStore.collections)) {
        const results = await reporter.documentStore.collection(entitySet).find({}, localReq)
        entities[entitySet] = results
      }

      if (customFn) {
        await customFn(entities)
      }
    }
  }
}

function parseName (rawName) {
  const parts = rawName.split('/')
  let parentFolder
  let entityName

  if (parts.length > 1) {
    parentFolder = `/${parts.slice(0, -1).join('/')}`
    entityName = parts.slice(-1)[0]
  } else {
    entityName = parts[0]
  }

  const entitySet = nameEntitySetMap[entityName[0]]

  if (!entitySet) {
    throw new Error(`Could not find entity set for entity with name "${rawName}"`)
  }

  return {
    entitySet,
    entityName,
    parentFolder
  }
}

async function create (reporter, list, req) {
  const entities = []
  const toCreate = []
  let lastItem

  for (const item of list) {
    if (lastItem == null && typeof item !== 'string') {
      throw new Error('Bad argument for create, first item should be string')
    }

    if (typeof item === 'string') {
      if (item === '') {
        throw new Error('.create can not have empty string as argument')
      }

      const { entitySet, entityName, parentFolder } = parseName(item)

      const defaultsToApply = defaults[entitySet] || {}

      lastItem = {
        entitySet,
        entity: {
          _id: entityName,
          shortid: entityName,
          name: entityName,
          ...defaultsToApply
        },
        parentFolder
      }

      toCreate.push(lastItem)
    } else {
      lastItem.entity = Object.assign({}, lastItem.entity, item)
    }
  }

  for (const item of toCreate) {
    const { entitySet, entity, parentFolder } = item

    if (!reporter.documentStore.collection(entitySet)) {
      throw new Error(`There is no collection "${entitySet}"`)
    }

    if (parentFolder) {
      const folderSearch = await reporter.folders.resolveEntityFromPath(parentFolder, 'folders', req)

      if (!folderSearch) {
        throw new Error(`Parent folder of entity ${item} does not exists`)
      }

      entity.folder = {
        shortid: folderSearch.entity.shortid
      }
    }

    const result = await reporter.documentStore.collection(entitySet).insert(entity, req)

    entities.push(result)
  }

  return entities
}

module.exports = conflictsUtils
