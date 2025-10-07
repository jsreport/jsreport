
function resolveEntityFromPath (entitySets, references, entityPathParam, targetEntitySet, options) {
  const entityPath = normalizeEntityPath(entityPathParam, options)
  const fragments = entityPath.split('/').filter(s => s)
  let currentEntity = null
  let currentEntitySet = null
  let currentFolder = null

  if (targetEntitySet) {
    const entitySet = entitySets[targetEntitySet]

    if (!entitySet) {
      throw new Error(`Target entity set "${targetEntitySet}" does not exists`)
    }

    const nameAttribute = entitySet.nameAttribute || 'name'

    if (!entitySet.referenceAttributes.includes(nameAttribute)) {
      throw new Error(`Entity set "${targetEntitySet}" does not have a name attribute`)
    }
  }

  if (fragments.length === 0) {
    return
  }

  const lastIndex = fragments.length - 1

  for (const [index, entityName] of fragments.entries()) {
    if (lastIndex === index) {
      if (!targetEntitySet) {
        for (const c of Object.keys(entitySets)) {
          const nameAttribute = entitySets[c].nameAttribute || 'name'

          if (!entitySets[c].referenceAttributes.includes(nameAttribute)) {
            continue
          }

          const entity = references[c].find((e) => {
            if (!currentFolder) {
              return e.name === entityName && e.folder == null
            }

            return e.name === entityName && e.folder?.shortid === currentFolder.shortid
          })

          if (!entity) {
            continue
          }

          currentEntitySet = c
          currentEntity = entity

          if (currentEntity) {
            break
          }
        }
      } else {
        const entity = references[targetEntitySet].find((e) => {
          if (!currentFolder) {
            return e.name === entityName && e.folder == null
          }

          return e.name === entityName && e.folder?.shortid === currentFolder.shortid
        })

        currentEntitySet = targetEntitySet
        currentEntity = entity
      }
    } else {
      const folder = references.folders.find((f) => {
        if (!currentFolder) {
          return f.name === entityName && f.folder == null
        }

        return f.name === entityName && f.folder?.shortid === currentFolder.shortid
      })

      if (!folder) {
        break
      }

      currentFolder = folder
    }
  }

  if (!currentEntity) {
    return
  }

  return {
    entitySet: currentEntitySet,
    entity: currentEntity
  }
}

function normalizeEntityPath (entityPath, { currentPath }) {
  let parentPath = '/'

  if (currentPath) {
    parentPath = currentPath
  }

  return resolvePath(parentPath, entityPath)
}

function resolvePath (base, newPath) {
  const segments = [base, newPath]
  let path = segments[1].startsWith('/') ? segments[1] : joinPath(base, segments[1])

  for (let i = 2; i < segments.length; i++) {
    path = joinPath(path, segments[i])
  }

  return path
}

function joinPath (base, newPath) {
  const segments = [base, newPath]
  const parts = segments.join('/').split('/').filter(Boolean)
  const stack = []

  for (const part of parts) {
    if (part === '.') continue

    if (part === '..') {
      if (stack.length) stack.pop()
      continue
    }

    stack.push(part)
  }

  const leadingSlash = segments[0]?.startsWith('/') ? '/' : ''
  return leadingSlash + stack.join('/')
}

export default resolveEntityFromPath
