
const idPrefixMap = Object.assign(Object.create(null), {
  documentRels: 'rId',
  shapeType: '_jsr_t',
  shape: '_jsr_i'
})

function createCollectionManager (isGlobal = true) {
  const collection = new Map()

  return {
    has (...args) {
      if (isGlobal) {
        const [key] = args
        assertOk(key != null, 'key is required')
        return collection.has(key)
      }

      const [filePath, key] = args

      assertOk(filePath != null, 'filePath is required')
      assertOk(key != null, 'key is required')

      return collection.has(filePath) ? collection.get(key) : false
    },
    get (...args) {
      if (isGlobal) {
        const [key] = args
        assertOk(key != null, 'key is required')
        return collection.get(key)
      }

      const [filePath, key] = args

      assertOk(filePath != null, 'filePath is required')
      assertOk(key != null, 'key is required')

      return collection.get(filePath)?.get(key)
    },
    set (...args) {
      if (isGlobal) {
        const [key, managerSpec] = args

        assertOk(key != null, 'key is required')
        assertOk(managerSpec != null, 'managerSpec is required')

        const manager = createIdManager(key, managerSpec)
        collection.set(key, manager)

        return manager
      }

      const [filePath, key, managerSpec] = args

      assertOk(filePath != null, 'filePath is required')
      assertOk(key != null, 'key is required')
      assertOk(managerSpec != null, 'managerSpec is required')

      let managersMap

      if (collection.has(filePath)) {
        managersMap = collection.get(filePath)
      } else {
        managersMap = new Map()
        collection.set(filePath, managersMap)
      }

      const manager = createIdManager(key, managerSpec)
      managersMap.set(key, manager)

      return manager
    },
    all (...args) {
      if (isGlobal) {
        return collection.entries()
      }

      const [filePath] = args

      if (filePath != null) {
        const managersMap = collection.get(filePath) ?? []
        return managersMap.entries()
      }

      return collection.entries()
    }
  }
}

function createIdManager (name, options = {}) {
  assertOk(name != null, 'name must be provided')

  const { fromItems, fromMaxId } = options

  assertOk(!(fromItems == null && fromMaxId == null), 'either fromItems or fromMaxId implementation must be provided')
  assertOk(!(fromItems != null && fromMaxId != null), 'only one implementation fromItems or fromMaxId can be provided')

  let prefix

  if (options.prefix != null) {
    prefix = options.prefix
  } else {
    prefix = idPrefixMap[name]

    if (prefix == null) {
      throw new Error(`default prefix for "${name}" not found`)
    }
  }

  let maxNumId

  const getMaxFromItems = (_currentFromItems, initialMaxNumId) => {
    const { getIds, getNumberId } = _currentFromItems

    if (getIds == null || getNumberId == null) {
      throw new Error('fromItems implementation must provide getIds and getNumberId functions')
    }

    const ids = getIds()

    return ids.reduce((lastNumId, id) => {
      const numId = getNumberId(id)

      if (numId == null) {
        return lastNumId
      }

      if (numId > lastNumId) {
        return numId
      }

      return lastNumId
    }, initialMaxNumId)
  }

  if (fromItems != null) {
    maxNumId = getMaxFromItems(fromItems, 0)
  } else {
    maxNumId = fromMaxId
  }

  if (maxNumId == null) {
    throw new Error('Unable to get max num id')
  }

  const generateId = (numId) => `${prefix}${numId}`

  return {
    get last () {
      return { numId: maxNumId, id: generateId(maxNumId) }
    },
    updateFromItems (fromItems) {
      maxNumId = getMaxFromItems(fromItems, maxNumId)
    },
    generate () {
      maxNumId++
      return { numId: maxNumId, id: generateId(maxNumId) }
    }
  }
}

function assertOk (valid, message) {
  if (!valid) {
    throw new Error(message)
  }
}

// NOTE: we actually don't need to expose the createIdManager, but we need to use it
// temporarily somewhere else in utils, so until we migrate that code we expose it.
module.exports.createIdManager = createIdManager
module.exports.createCollectionManager = createCollectionManager
