/**
 * Diff two entities into patch which can be latter applied to replay the modification
 * The diff for document store properties is stored extra for each one
 */
const extend = require('node.extend.without.arrays')
const isbinaryfile = require('isbinaryfile')
const { serialize, parse, deepGet, deepSet, deepDelete, deepHasOwnProperty } = require('./customUtils')
const sortVersions = require('../shared/sortVersions')
const diff = require('./diff.js')

function serializeConfig (doc, entitySet, documentModel) {
  const clone = extend(true, {}, doc)
  documentModel.entitySets[entitySet].entityType.documentProperties.forEach((prop) => {
    deepDelete(clone, prop.path)
  })

  return serialize(clone)
}

// apply all patches in collection and return final state of entities
async function applyPatches (versions, documentModel, reporter, req) {
  versions = sortVersions(versions, 'ASC')

  let state = []
  // iterate patches to the final one => get previous commit state
  for (const v of versions) {
    let changes = v.changes
    if (changes == null) {
      const changesContent = await reporter.blobStorage.read(v.blobName, req)
      changes = JSON.parse(changesContent.toString())
    }

    for (const c of changes) {
      if (c.operation === 'insert') {
        state.push({
          entityId: c.entityId,
          entitySet: c.entitySet,
          entity: parse(c.serializedDoc),
          path: c.path
        })
        continue
      }

      if (c.operation === 'remove') {
        state = state.filter((e) => e.entityId !== c.entityId)
        continue
      }

      const entityState = state.find((e) => e.entityId === c.entityId)
      applyPatch(entityState.entity, parse(c.serializedPatch), c.entitySet, documentModel)

      // _id was changed, reflect it to the state
      if (entityState.entityId !== entityState.entity._id) {
        entityState.entityId = entityState.entity._id
      }
    }
  }

  return state
}

function applyPatch (doc, patch, entitySet, documentModel) {
  patch.documentProperties.forEach((p) => {
    const prevVal = deepGet(doc, p.path) || ''
    if (p.type === 'bigfile') {
      const patchBufContent = p.patch ? Buffer.from(p.patch, 'base64') : null
      let propContent = patchBufContent

      const docPropDef = documentModel.entitySets[entitySet].entityType.documentProperties.find((dp) => dp.path === p.path)

      if (propContent != null && docPropDef != null && docPropDef.type.type === 'Edm.String') {
        propContent = propContent.toString()
      }

      deepSet(doc, p.path, propContent)
    } else {
      if (Buffer.isBuffer(prevVal)) {
        deepSet(doc, p.path, Buffer.from(diff.applyPatch(prevVal.toString('base64'), p.patch), 'base64'))
      } else {
        deepSet(doc, p.path, diff.applyPatch(prevVal, p.patch))
      }
    }
  })

  const patchResult = diff.applyPatch(serializeConfig(doc, entitySet, documentModel), patch.config)

  // patch was not applied, because it was not compatible with object state
  if (patchResult === false) {
    return
  }

  const baseDoc = {}

  documentModel.entitySets[entitySet].entityType.documentProperties.forEach((prop) => {
    if (deepHasOwnProperty(doc, prop.path)) {
      deepSet(baseDoc, prop.path, deepGet(doc, prop.path))
    }
  })

  // important to do deep merge, because config can have { chrome: {} } and shallow merge would remove the headerTemplate previously set
  const newDoc = extend(true, baseDoc, parse(patchResult))

  const docProps = Object.keys(doc)
  const newDocProps = Object.keys(newDoc)

  const toRemove = docProps.filter((p) => !newDocProps.includes(p))
  const toAddUpdate = newDocProps.filter((p) => !toRemove.includes(p))

  for (const propName of toAddUpdate) {
    doc[propName] = newDoc[propName]
  }

  for (const propName of toRemove) {
    delete doc[propName]
  }
}

function createPatch ({
  name,
  oldEntity,
  newEntity,
  entitySet,
  documentModel,
  diffLimit = 400 * 1024,
  context = 0,
  bufferEncoding = 'base64'
}) {
  const patch = {
    documentProperties: []
  }

  documentModel.entitySets[entitySet].entityType.documentProperties.forEach((p) => {
    let older = deepGet(oldEntity, p.path)
    let newer = deepGet(newEntity, p.path)

    if (older == null && newer == null) {
      return
    }

    if (older === newer) {
      return
    }

    if (older && newer && Buffer.from(older).equals(Buffer.from(newer))) {
      return
    }

    const olderLength = older ? Buffer.from(older).length : 0
    const newerLength = newer ? Buffer.from(newer).length : 0

    // big files or binary files are not diffed
    if (
      olderLength > diffLimit || newerLength > diffLimit ||
        (Buffer.isBuffer(newer) && isbinaryfile.sync(newer, newerLength)) ||
        (Buffer.isBuffer(older) && isbinaryfile.sync(older, olderLength))
    ) {
      return patch.documentProperties.push({
        path: p.path,
        type: 'bigfile',
        patch: newer ? Buffer.from(newer).toString('base64') : null
      })
    }

    older = Buffer.isBuffer(older) ? older.toString(bufferEncoding) : older
    newer = Buffer.isBuffer(newer) ? newer.toString(bufferEncoding) : newer

    patch.documentProperties.push({
      path: p.path,
      patch: diff.createPatch(name, older || '', newer || '', context)
    })
  })

  patch.config = diff.createPatch(
    name,
    serializeConfig(oldEntity, entitySet, documentModel),
    serializeConfig(newEntity, entitySet, documentModel),
    context
  )

  return patch
}

module.exports.applyPatch = applyPatch
module.exports.applyPatches = applyPatches
module.exports.createPatch = createPatch
