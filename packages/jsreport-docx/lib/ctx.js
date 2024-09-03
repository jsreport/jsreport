const { createCollectionManager } = require('./idManager')

module.exports = function createContext (type, opts) {
  assertOk(type != null, 'type is required')
  assertOk(type === 'document' || type === 'handlebars', 'type should be either "document" or "handlebars"')

  const isDocx = type === 'document'

  const ctx = {
    idManagers: createCollectionManager(),
    templating: {}
  }

  if (isDocx) {
    const { options } = opts

    ctx.options = options
    ctx.localIdManagers = createCollectionManager(false)

    addStoreValueApi(ctx.templating, ['getGlobalValue', 'setGlobalValue', 'allGlobalValues'])
    addStoreValueApi(ctx.templating, ['getLocalValue', 'setLocalValue', 'allLocalValues'], false)

    ctx.templating.serializeToHandlebarsAttrs = function serializeToHandlebarsAttrs (attrsIter) {
      const extraAttrs = []

      for (const [key, value] of attrsIter) {
        if (value == null) {
          continue
        }

        let val

        if (typeof value === 'number') {
          val = value
        } else {
          val = `'${value}'`
        }

        extraAttrs.push(`${key}=${val}`)
      }

      return extraAttrs
    }
  } else {
    addStoreValueApi(ctx.templating, ['get', 'set', 'all'])
  }

  return ctx
}

function addStoreValueApi (container, methodNames, isGlobal = true) {
  const store = new Map()
  const [getterName, setterName, getAllName] = methodNames

  container[getterName] = (...args) => {
    if (isGlobal) {
      const [key] = args
      assertOk(key != null, 'key is required')
      return store.get(key)
    }

    const [filePath, key] = args
    assertOk(filePath != null, 'filePath is required')
    assertOk(key != null, 'key is required')

    return store.get(filePath)?.get(key)
  }

  container[setterName] = (...args) => {
    if (isGlobal) {
      const [key, value] = args
      assertOk(key != null, 'key is required')
      assertOk(args.length === 2, 'expected 2 arguments. key and value to be passed')

      store.set(key, value)
      return
    }

    let valueMap

    const [filePath, key, value] = args
    assertOk(filePath != null, 'filePath is required')
    assertOk(key != null, 'key is required')
    assertOk(args.length === 3, 'expected 3 arguments. filePath, key and value to be passed')

    if (store.has(filePath)) {
      valueMap = store.get(filePath)
    } else {
      valueMap = new Map()
      store.set(filePath, valueMap)
    }

    valueMap.set(key, value)
  }

  container[getAllName] = (...args) => {
    if (isGlobal) {
      return store.entries()
    }

    const [filePath] = args

    if (filePath != null) {
      const valuesMap = store.get(filePath) ?? []
      return valuesMap.entries()
    }

    return store.entries()
  }
}

function assertOk (valid, message) {
  if (!valid) {
    throw new Error(message)
  }
}
