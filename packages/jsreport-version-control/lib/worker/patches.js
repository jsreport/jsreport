/**
 * Diff two entities into patch which can be latter applied to replay the modification
 * The diff for document store properties is stored extra for each one
 */
const extend = require('node.extend.without.arrays')
const isbinaryfile = require('isbinaryfile')
const { serialize, parse, deepGet, deepSet, deepDelete } = require('./customUtils')
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
      deepSet(doc, p.path, p.patch ? Buffer.from(p.patch, 'base64') : null)
    } else {
      if (Buffer.isBuffer(prevVal)) {
        deepSet(doc, p.path, Buffer.from(diff.applyPatch(prevVal.toString('base64'), p.patch), 'base64'))
      } else {
        deepSet(doc, p.path, diff.applyPatch(prevVal, p.patch))
      }
    }
  })
  // important to do deep merge, because config can have { chrome: {} } and shallow merge wouldthe headerTemplate previously set
  extend(true, doc, parse(diff.applyPatch(serializeConfig(doc, entitySet, documentModel), patch.config)))
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
