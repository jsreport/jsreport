const extend = require('node.extend.without.arrays')
const groupBy = require('lodash.groupby')
const get = require('lodash.get')
const set = require('set-value')
const hasOwn = require('has-own-deep')
const unsetValue = require('unset-value')

function createPropertiesManager (propertiesConfig) {
  const hierarchyPropertiesConfig = normalizePropertiesConfigToHierarchy(propertiesConfig)
  const originalValues = {}
  const proxiesInVM = new WeakMap()
  const customProxies = new WeakMap()

  return {
    copyPropertyValuesFrom (context) {
      return copyBasedOnPropertiesConfig(context, propertiesConfig)
    },
    applyPropertiesConfigTo (context) {
      applyPropertiesConfig(context, hierarchyPropertiesConfig, {
        original: originalValues,
        customProxies
      })
    },
    applyRootPropertiesConfigTo (context) {
      Object.keys(hierarchyPropertiesConfig).forEach((key) => {
        const currentConfig = hierarchyPropertiesConfig[key]

        if (currentConfig.root && currentConfig.root.sandboxReadOnly) {
          readOnlyProp(context, key, [], customProxies, { onlyTopLevel: true })
        }
      })
    },
    restorePropertiesFrom (context) {
      return restoreProperties(context, originalValues, proxiesInVM, customProxies)
    }
  }
}

function normalizePropertiesConfigToHierarchy (propertiesConfig) {
  const configMapKeys = Object.keys(propertiesConfig)

  const groupedKeys = groupBy(configMapKeys, (key) => {
    const parts = key.split('.')

    if (parts.length === 1) {
      return ''
    }

    return parts.slice(0, -1).join('.')
  })

  const hierarchy = []
  const hierarchyLevels = {}

  // we sort to ensure that top level properties names are processed first
  Object.keys(groupedKeys).sort(sortPropertiesByLevel).forEach((key) => {
    if (key === '') {
      hierarchy.push('')
      return
    }

    const parts = key.split('.')
    const lastIndexParts = parts.length - 1

    if (parts.length === 1) {
      hierarchy.push(parts[0])
      hierarchyLevels[key] = {}
      return
    }

    for (let i = 0; i < parts.length; i++) {
      const currentKey = parts.slice(0, i + 1).join('.')
      const indexInHierarchy = hierarchy.indexOf(currentKey)
      let parentHierarchy = hierarchyLevels

      if (indexInHierarchy === -1 && i === lastIndexParts) {
        let parentExistsInTopLevel = false

        for (let j = 0; j < i; j++) {
          const segmentedKey = parts.slice(0, j + 1).join('.')

          if (parentExistsInTopLevel !== true) {
            parentExistsInTopLevel = hierarchy.indexOf(segmentedKey) !== -1
          }

          if (parentHierarchy[segmentedKey] != null) {
            parentHierarchy = parentHierarchy[segmentedKey]
          }
        }

        if (!parentExistsInTopLevel) {
          hierarchy.push(key)
        }

        parentHierarchy[key] = {}
      }
    }
  })

  const toHierarchyConfigMap = (parentLevels) => {
    return (acu, key) => {
      if (key === '') {
        groupedKeys[key].forEach((g) => {
          acu[g] = {}

          if (propertiesConfig[g] != null) {
            acu[g].root = propertiesConfig[g]
          }
        })

        return acu
      }

      const currentLevel = parentLevels[key]

      if (acu[key] == null) {
        acu[key] = {}

        if (propertiesConfig[key] != null) {
          // root is config that was defined in the same property
          // that it is grouped
          acu[key].root = propertiesConfig[key]
        }
      }

      // standalone are properties that are direct, no groups
      acu[key].standalone = groupedKeys[key].reduce((obj, stdProp) => {
        // only add the property is not already grouped
        if (groupedKeys[stdProp] == null) {
          obj[stdProp] = propertiesConfig[stdProp]
        }

        return obj
      }, {})

      if (Object.keys(acu[key].standalone).length === 0) {
        delete acu[key].standalone
      }

      const levelKeys = Object.keys(currentLevel)

      if (levelKeys.length === 0) {
        return acu
      }

      // inner are properties which contains other properties, groups
      acu[key].inner = levelKeys.reduce(toHierarchyConfigMap(currentLevel), {})

      if (Object.keys(acu[key].inner).length === 0) {
        delete acu[key].inner
      }

      return acu
    }
  }

  return hierarchy.reduce(toHierarchyConfigMap(hierarchyLevels), {})
}

function copyBasedOnPropertiesConfig (context, propertiesConfig) {
  const copied = []
  const newContext = Object.assign({}, context)

  Object.keys(propertiesConfig).sort(sortPropertiesByLevel).forEach((prop) => {
    const parts = prop.split('.')
    const lastPartsIndex = parts.length - 1

    for (let i = 0; i <= lastPartsIndex; i++) {
      let currentContext = newContext
      const propName = parts[i]
      const parentPath = parts.slice(0, i).join('.')
      const fullPropName = parts.slice(0, i + 1).join('.')
      let value

      if (copied.indexOf(fullPropName) !== -1) {
        continue
      }

      if (parentPath !== '') {
        currentContext = get(newContext, parentPath)
      }

      if (currentContext) {
        value = currentContext[propName]

        if (typeof value === 'object') {
          if (value === null) {
            value = null
          } else if (Array.isArray(value)) {
            value = Object.assign([], value)
          } else {
            value = Object.assign({}, value)
          }

          currentContext[propName] = value
          copied.push(fullPropName)
        }
      }
    }
  })

  return newContext
}

function applyPropertiesConfig (context, hierarchyPropertiesConfig, {
  original,
  customProxies,
  isRoot = true,
  isGrouped = true,
  onlyReadOnlyTopLevel = false,
  parentOpts,
  prop
} = {}, readOnlyConfigured = []) {
  let isHidden
  let isReadOnly
  let standalonePropertiesHandled = false
  let innerPropertiesHandled = false

  if (isRoot) {
    return Object.keys(hierarchyPropertiesConfig).forEach((key) => {
      applyPropertiesConfig(context, hierarchyPropertiesConfig[key], {
        original,
        customProxies,
        prop: key,
        isRoot: false,
        isGrouped: true,
        onlyReadOnlyTopLevel,
        parentOpts
      }, readOnlyConfigured)
    })
  }

  if (parentOpts && parentOpts.sandboxHidden === true) {
    return
  }

  if (isGrouped) {
    isHidden = hierarchyPropertiesConfig.root ? hierarchyPropertiesConfig.root.sandboxHidden === true : false
    isReadOnly = hierarchyPropertiesConfig.root ? hierarchyPropertiesConfig.root.sandboxReadOnly === true : false
  } else {
    isHidden = hierarchyPropertiesConfig ? hierarchyPropertiesConfig.sandboxHidden === true : false
    isReadOnly = hierarchyPropertiesConfig ? hierarchyPropertiesConfig.sandboxReadOnly === true : false
  }

  let shouldStoreOriginal = isHidden || isReadOnly

  // prevent storing original value if there is config some child prop
  if (
    shouldStoreOriginal &&
    isGrouped &&
    (hierarchyPropertiesConfig.inner != null || hierarchyPropertiesConfig.standalone != null)
  ) {
    shouldStoreOriginal = false
  }

  // allow configuring parent as hidden, but child props as readonly so we expose
  // just part of the parent
  // const ignoreParentHidden = false
  const ignoreParentHidden = (
    isHidden &&
    isGrouped &&
    (hierarchyPropertiesConfig.inner != null || hierarchyPropertiesConfig.standalone != null)
  )

  if (parentOpts?.originalSandboxHidden !== true && ignoreParentHidden) {
    // we store the original value for the top parent with hidden value
    shouldStoreOriginal = true
  } else if (parentOpts && parentOpts.originalSandboxHidden === true) {
    // we don't store original value when parent was configured as hidden
    shouldStoreOriginal = false
  }

  // saving original value
  if (shouldStoreOriginal) {
    let exists = true
    let newValue

    if (hasOwn(context, prop)) {
      const originalPropValue = get(context, prop)

      if (typeof originalPropValue === 'object' && originalPropValue != null) {
        if (Array.isArray(originalPropValue)) {
          newValue = extend(true, [], originalPropValue)
        } else {
          newValue = extend(true, {}, originalPropValue)
        }
      } else {
        newValue = originalPropValue
      }
    } else {
      exists = false
    }

    original[prop] = {
      exists,
      value: newValue
    }
  }

  const processStandAloneProperties = (c) => {
    Object.keys(c.standalone).forEach((standaloneKey) => {
      const standaloneConfig = c.standalone[standaloneKey]

      const newParentOpts = {
        sandboxHidden: ignoreParentHidden ? false : isHidden,
        sandboxReadOnly: isReadOnly
      }

      // set and inherit originalSandboxHidden if needed
      if (
        parentOpts?.originalSandboxHidden === true ||
        (ignoreParentHidden && isHidden)
      ) {
        newParentOpts.originalSandboxHidden = true
      }

      applyPropertiesConfig(context, standaloneConfig, {
        original,
        customProxies,
        prop: standaloneKey,
        isRoot: false,
        isGrouped: false,
        onlyReadOnlyTopLevel,
        parentOpts: newParentOpts
      }, readOnlyConfigured)
    })
  }

  const processInnerProperties = (c) => {
    Object.keys(c.inner).forEach((innerKey) => {
      const innerConfig = c.inner[innerKey]

      const newParentOpts = {
        sandboxHidden: ignoreParentHidden ? false : isHidden,
        sandboxReadOnly: isReadOnly
      }

      // set and inherit originalSandboxHidden if needed
      if (
        parentOpts?.originalSandboxHidden === true ||
        (ignoreParentHidden && isHidden)
      ) {
        newParentOpts.originalSandboxHidden = true
      }

      applyPropertiesConfig(context, innerConfig, {
        original,
        customProxies,
        prop: innerKey,
        isRoot: false,
        isGrouped: true,
        parentOpts: newParentOpts
      }, readOnlyConfigured)
    })
  }

  if (isHidden) {
    if (ignoreParentHidden) {
      // when parent is hidden but there are configuration for child properties we just copy
      // the properties listed there, we do this because we want to work with just the configured
      // properties, the other properties should not be exposed
      const currentValue = get(context, prop)

      if (currentValue != null && typeof currentValue === 'object') {
        let newValue

        if (Array.isArray(currentValue)) {
          newValue = []
        } else {
          newValue = {}
        }

        for (const config of [hierarchyPropertiesConfig.standalone, hierarchyPropertiesConfig.inner]) {
          if (config == null) {
            continue
          }

          for (const childProp of Object.keys(config)) {
            if (hasOwn(context, childProp)) {
              const childValue = get(context, childProp)
              const targetProp = childProp.replace(`${prop}.`, '')
              set(newValue, targetProp, childValue)
            }
          }
        }

        set(context, prop, newValue)
      }
    } else {
      omitProp(context, prop)
    }
  } else if (isReadOnly) {
    readOnlyProp(context, prop, readOnlyConfigured, customProxies, {
      onlyTopLevel: false,
      onBeforeProxy: () => {
        if (isGrouped && hierarchyPropertiesConfig.standalone != null) {
          processStandAloneProperties(hierarchyPropertiesConfig)
          standalonePropertiesHandled = true
        }

        if (isGrouped && hierarchyPropertiesConfig.inner != null) {
          processInnerProperties(hierarchyPropertiesConfig)
          innerPropertiesHandled = true
        }
      }
    })
  }

  if (!isGrouped) {
    return
  }

  // don't process inner config when the value in context is empty
  if (get(context, prop) == null) {
    return
  }

  if (!standalonePropertiesHandled && hierarchyPropertiesConfig.standalone != null) {
    processStandAloneProperties(hierarchyPropertiesConfig)
  }

  if (!innerPropertiesHandled && hierarchyPropertiesConfig.inner != null) {
    processInnerProperties(hierarchyPropertiesConfig)
  }
}

function restoreProperties (context, originalValues, proxiesInVM, customProxies) {
  const restored = []
  const newContext = Object.assign({}, context)

  Object.keys(originalValues).sort(sortPropertiesByLevel).forEach((prop) => {
    const confValue = originalValues[prop]
    const parts = prop.split('.')
    const lastPartsIndex = parts.length - 1

    for (let i = 0; i <= lastPartsIndex; i++) {
      let currentContext = newContext
      const propName = parts[i]
      const parentPath = parts.slice(0, i).join('.')
      const fullPropName = parts.slice(0, i + 1).join('.')
      let value

      if (restored.indexOf(fullPropName) !== -1) {
        continue
      }

      if (parentPath !== '') {
        currentContext = get(newContext, parentPath)
      }

      if (currentContext) {
        value = currentContext[propName]

        // unwrapping proxies
        value = getOriginalFromProxy(proxiesInVM, customProxies, value)

        if (typeof value === 'object') {
          // we call object assign to be able to get rid of
          // previous properties descriptors (hide/readOnly) configured
          if (value === null) {
            value = null
          } else if (Array.isArray(value)) {
            value = Object.assign([], value)
          } else {
            value = Object.assign({}, value)
          }

          currentContext[propName] = value
          restored.push(fullPropName)
        }

        if (i === lastPartsIndex) {
          if (confValue.exists) {
            currentContext[propName] = confValue.value
          } else {
            delete currentContext[propName]
          }
        }
      }
    }
  })

  // unwrapping proxies for top level properties
  Object.keys(newContext).forEach((prop) => {
    newContext[prop] = getOriginalFromProxy(proxiesInVM, customProxies, newContext[prop])
  })

  return newContext
}

function sortPropertiesByLevel (a, b) {
  const parts = a.split('.')
  const parts2 = b.split('.')

  return parts.length - parts2.length
}

function omitProp (context, prop) {
  // if property has value, then set it to some value first,
  // unsetValue expects that property has some non empty value to remove the property
  // so we set to "true" to ensure it works for all cases,
  // we use unsetValue instead of lodash.omit because
  // it supports object paths x.y.z and does not copy the object for each call
  if (hasOwn(context, prop)) {
    set(context, prop, true)
    unsetValue(context, prop)
  }
}

function readOnlyProp (context, prop, configured, customProxies, { onlyTopLevel = false, onBeforeProxy } = {}) {
  const parts = prop.split('.')
  const lastPartsIndex = parts.length - 1

  const throwError = (fullPropName) => {
    throw new Error(`Can't modify read only property "${fullPropName}" inside sandbox`)
  }

  for (let i = 0; i <= lastPartsIndex; i++) {
    let currentContext = context
    const isTopLevelProp = i === 0
    const propName = parts[i]
    const parentPath = parts.slice(0, i).join('.')
    const fullPropName = parts.slice(0, i + 1).join('.')
    let value

    if (configured.indexOf(fullPropName) !== -1) {
      continue
    }

    if (parentPath !== '') {
      currentContext = get(context, parentPath)
    }

    if (currentContext) {
      value = currentContext[propName]

      if (
        i === lastPartsIndex &&
        typeof value === 'object' &&
        value != null
      ) {
        const valueType = Array.isArray(value) ? 'array' : 'object'
        const rawValue = value

        if (onBeforeProxy) {
          onBeforeProxy()
        }

        value = new Proxy(rawValue, {
          set: (target, prop) => {
            throw new Error(`Can't add or modify property "${prop}" to read only ${valueType} "${fullPropName}" inside sandbox`)
          },
          deleteProperty: (target, prop) => {
            throw new Error(`Can't delete property "${prop}" in read only ${valueType} "${fullPropName}" inside sandbox`)
          }
        })

        customProxies.set(value, rawValue)
      }

      // only create the getter/setter wrapper if the property is defined,
      // this prevents getting errors about proxy traps and descriptors differences
      // when calling `JSON.stringify(req.context)` from a script
      if (Object.prototype.hasOwnProperty.call(currentContext, propName)) {
        if (!configured.includes(fullPropName)) {
          configured.push(fullPropName)
        }

        Object.defineProperty(currentContext, propName, {
          get: () => value,
          set: () => { throwError(fullPropName) },
          enumerable: true
        })
      }

      if (isTopLevelProp && onlyTopLevel) {
        break
      }
    }
  }
}

function getOriginalFromProxy (proxiesInVM, customProxies, value) {
  let newValue

  if (customProxies.has(value)) {
    newValue = getOriginalFromProxy(proxiesInVM, customProxies, customProxies.get(value))
  } else if (proxiesInVM.has(value)) {
    newValue = getOriginalFromProxy(proxiesInVM, customProxies, proxiesInVM.get(value))
  } else {
    newValue = value
  }

  return newValue
}

module.exports = createPropertiesManager
