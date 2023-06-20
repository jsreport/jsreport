/**
 * Custom implementation of changes versioning which uses extra entity to persist
 * changes between commits. The changes are stored as string diffs of serialized individual entities
 */

const bytes = require('bytes')
const mimeTypes = require('mime-types')
const omit = require('lodash.omit')
const { customAlphabet } = require('nanoid')
const DocumentModel = require('./documentModel')
const sortVersions = require('../shared/sortVersions')
const migrateVersionControlProps = require('../migration/versionControlProps')
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

module.exports = (reporter, options) => {
  // now it basically represents a commit
  reporter.documentStore.registerEntityType('VersionType', {
    changes: { type: 'Collection(jsreport.ChangeType)' },
    message: { type: 'Edm.String' },
    creationDate: { type: 'Edm.DateTimeOffset' },
    blobName: { type: 'Edm.String' }
  })

  reporter.documentStore.registerEntitySet('versions', {
    entityType: 'jsreport.VersionType',
    exportable: false,
    shared: true
  })

  const diffLimit = bytes.parse(options.diffLimit)

  let documentModel

  reporter.initializeListeners.add('version-control-get-model', async () => {
    await migrateVersionControlProps(reporter)

    documentModel = DocumentModel(reporter.documentStore.model)

    if (reporter.authorization) {
      const col = reporter.documentStore.collection('versions')

      col.beforeFindListeners.add('version-control', async (q, p, req) => {
        const isAdmin = await reporter.authentication.isUserAdmin(req?.context?.user, req)

        if (req && req.context && req.context.userFindCall && req.context.user && !isAdmin) {
          throw reporter.authorization.createAuthorizationError(col.name)
        }
      })

      col.beforeInsertListeners.add('version-control', async (doc, req) => {
        const isAdmin = await reporter.authentication.isUserAdmin(req?.context?.user, req)

        if (req && req.context && req.context.user && !isAdmin) {
          throw reporter.authorization.createAuthorizationError(col.name)
        }
      })

      col.beforeUpdateListeners.add('version-control', async (q, u, options, req) => {
        const isAdmin = await reporter.authentication.isUserAdmin(req?.context?.user, req)

        if (req && req.context && req.context.user && !isAdmin) {
          throw reporter.authorization.createAuthorizationError(col.name)
        }
      })

      col.beforeRemoveListeners.add('version-control', async (q, req) => {
        const isAdmin = await reporter.authentication.isUserAdmin(req?.context?.user, req)

        if (req && req.context && req.context.user && !isAdmin) {
          throw reporter.authorization.createAuthorizationError(col.name)
        }
      })
    }
  })

  async function persistChanges (state, req) {
    await reporter.documentStore.beginTransaction(req)

    try {
      const entitySetsWithoutFolders = omit(documentModel.entitySets, ['folders'])
      const updateBecauseIdChange = []

      // remove entities that are not in the new state
      for (const es in entitySetsWithoutFolders) {
        if (documentModel.entitySets[es].splitIntoDirectories) {
          let existingEntities = await reporter.documentStore.collection(es).find({}, req)

          existingEntities = await Promise.all(existingEntities.map(async (entity) => {
            const entityPath = await reporter.folders.resolveEntityPath(entity, es, req)
            entity.__entityPath = entityPath
            return entity
          }))

          for (const entity of existingEntities.filter((e) => !state.find((s) => s.entityId === e._id))) {
            // if not found we try to search by entity path, if we found it, it means that the id changed
            // and we just need to update the entity later
            const existsByPath = state.find((s) => s.entitySet === es && s.path === entity.__entityPath)

            if (existsByPath) {
              updateBecauseIdChange.push({
                entitySet: es,
                entityId: existsByPath.entityId,
                storeEntityId: entity._id
              })
              continue
            }

            await reporter.documentStore.collection(es).remove({ _id: entity._id }, req)
          }
        }
      }

      // remove folders that are not in the new state
      let existingFolders = await reporter.documentStore.collection('folders').find({}, req)

      existingFolders = await Promise.all(existingFolders.map(async (folder) => {
        const entityPath = await reporter.folders.resolveEntityPath(folder, 'folders', req)
        folder.__entityPath = entityPath
        return folder
      }))

      const notFoundFoldersPathSortedDesc = existingFolders.filter((f) => !state.find((s) => s.entityId === f._id)).sort((a, b) => {
        const aLevel = a.__entityPath.split('/')
        const bLevel = b.__entityPath.split('/')

        return bLevel.length - aLevel.length
      })

      for (const folder of notFoundFoldersPathSortedDesc) {
        // if not found we try to search by entity path, if we found it, it means that the id changed
        // and we just need to update the entity later
        const existsByPath = state.find((s) => s.entitySet === 'folders' && s.path === folder.__entityPath)

        if (existsByPath) {
          updateBecauseIdChange.push({
            entitySet: 'folders',
            entityId: existsByPath.entityId,
            storeEntityId: folder._id
          })
          continue
        }

        await reporter.documentStore.collection('folders').remove({ _id: folder._id }, req)
      }

      const folderGroupsInState = groupFoldersStateByLevel(state.filter(e => e.entitySet === 'folders'))

      if (folderGroupsInState[-1] != null && folderGroupsInState[-1].length > 0) {
        throw new Error(`Inconsistency detected, folders ${folderGroupsInState[-1].length} not found in version control state`)
      }

      const sortedLevelsASC = Object.keys(folderGroupsInState).map((l) => parseInt(l, 10)).sort((a, b) => a - b)

      const foldersInStatePathSortedAsc = []

      for (const level of sortedLevelsASC) {
        foldersInStatePathSortedAsc.push(...folderGroupsInState[level])
      }

      // folders needs go first because of validations in fs store
      // we can't move entity to a folder that doesn't yet exist,
      // and also the folders should be processed in order, so a child folder
      // does not tried to be inserted before parent folder
      for (const e of foldersInStatePathSortedAsc) {
        const shouldUpdateWithStoreId = updateBecauseIdChange.find((s) => s.entityId === e.entityId && s.entitySet === e.entitySet)

        const updateReq = reporter.Request(req)

        // we don't want the update to produce a change to modification date
        updateReq.context.skipModificationDateUpdate = true

        const updateCount = await reporter.documentStore.collection('folders').update({
          _id: shouldUpdateWithStoreId ? shouldUpdateWithStoreId.storeEntityId : e.entityId
        }, {
          $set: e.entity
        }, updateReq)

        if (updateCount === 0) {
          await reporter.documentStore.collection('folders').insert(e.entity, req)
        }
      }

      for (const e of state.filter(e => e.entitySet !== 'folders')) {
        const shouldUpdateWithStoreId = updateBecauseIdChange.find((s) => s.entityId === e.entityId && s.entitySet === e.entitySet)

        const updateReq = reporter.Request(req)

        // we don't want the update to produce a change to modification date
        updateReq.context.skipModificationDateUpdate = true

        const updateCount = await reporter.documentStore.collection(e.entitySet).update({
          _id: shouldUpdateWithStoreId ? shouldUpdateWithStoreId.storeEntityId : e.entityId
        }, {
          $set: e.entity
        }, updateReq)

        if (updateCount === 0) {
          await reporter.documentStore.collection(e.entitySet).insert(e.entity, req)
        }
      }

      await reporter.documentStore.commitTransaction(req)
    } catch (e) {
      await reporter.documentStore.rollbackTransaction(req)

      throw e
    }
  }

  return ({
    init () {

    },
    async history (req) {
      const versions = await reporter.documentStore.collection('versions').find({}, req)

      return sortVersions(versions, 'DESC').map((v) => ({
        date: v.creationDate,
        message: v.message,
        _id: v._id.toString()
      }))
    },

    async localChanges (req) {
      const version = await this.commit('local changes', true, req)
      return this.diff(version, req)
    },

    async diff (commitOrCommitId, req) {
      let commitToDiff
      let versionsToPatch

      if (typeof commitOrCommitId === 'string') {
        const versions = typeof commitOrCommitId === 'string' ? await reporter.documentStore.collection('versions').find({ _id: commitOrCommitId }, req) : commitOrCommitId

        if (versions.length === 0) {
          throw new Error('Commit with id ' + commitOrCommitId + ' was not found')
        }

        commitToDiff = versions[0]
        versionsToPatch = await reporter.documentStore.collection('versions').find({ creationDate: { $lte: commitToDiff.creationDate } }, req)
      } else {
        commitToDiff = commitOrCommitId
        versionsToPatch = await reporter.documentStore.collection('versions').find({ creationDate: { $lte: commitToDiff.creationDate } }, req)
        versionsToPatch.push(commitToDiff)
      }

      // currently we display only modified lines in the patch to safe some space
      // but for diff we need changes with full context, so we need to perform the full diff
      reporter.logger.debug('Version control diff for ' + commitToDiff.message)

      const result = await reporter.executeWorkerAction('version-control-diff',
        {
          commitToDiff,
          versions: versionsToPatch,
          documentModel,
          diffLimit
        }, {
          timeoutErrorMessage: 'Timeout during execution of version control diff'
        },
        req
      )

      const diff = result.diff

      const newDiff = diff.reduce((acu, item) => {
        const { state, properties, ...rest } = item

        acu.push({
          ...rest,
          contentMimeType: 'application/json',
          contentFileExtension: 'json'
        })

        properties.forEach((propItem) => {
          const { propertyName, ...restProp } = propItem
          const newPropItem = { ...restProp }

          if (state != null) {
            const docPropFileExtension = reporter.documentStore.resolveFileExtension(state, propItem.entitySet, propertyName)
            newPropItem.contentFileExtension = docPropFileExtension
            newPropItem.contentMimeType = mimeTypes.lookup(docPropFileExtension) || 'application/octet-stream'
          }

          acu.push(newPropItem)
        })

        return acu
      }, [])

      return newDiff
    },

    async commit (message, preview, req) {
      if (!message) {
        throw new Error('Missing message for version control commit')
      }

      reporter.logger.debug(`Version control commit: ${message}`)

      const currentEntities = {}

      for (const entitySet in documentModel.entitySets) {
        if (documentModel.entitySets[entitySet].splitIntoDirectories) {
          currentEntities[entitySet] = await reporter.documentStore.collection(entitySet).find({}, req)

          currentEntities[entitySet] = await Promise.all(currentEntities[entitySet].map(async (entity) => {
            const entityPath = await reporter.folders.resolveEntityPath(entity, entitySet, req)
            entity.__entityPath = entityPath
            return entity
          }))
        }
      }

      const versions = await reporter.documentStore.collection('versions').find({}, req)

      const result = await reporter.executeWorkerAction('version-control-commit',
        {
          commitMessage: message,
          versions,
          currentEntities,
          documentModel,
          diffLimit
        },
        {
          timeoutErrorMessage: 'Timeout during execution of version control commit'
        },
        req
      )

      const newCommit = result.commit

      newCommit.changes = await Promise.all(newCommit.changes.map(async (change) => {
        if (change.path != null || change.__local == null) {
          return change
        }

        const local = change.__local

        delete change.__local

        const entityPath = await reporter.folders.resolveEntityPath(local, change.entitySet, req, (folderShortId) => {
          const found = result.localFolders.find((ls) => ls.shortid === folderShortId)

          if (!found) {
            return
          }

          return found
        })

        return { ...change, path: entityPath }
      }))

      if (preview) {
        return newCommit
      }

      if (newCommit.changes.length === 0) {
        throw new Error('Can not save an empty commit, there are no changes to commit')
      }

      let blobName = `versions/${newCommit.message.replace(/[^a-zA-Z0-9]/g, '')}${nanoid()}.json`
      blobName = await reporter.blobStorage.write(blobName, Buffer.from(JSON.stringify(newCommit.changes)), req)
      const version = await reporter.documentStore.collection('versions').insert({
        ...omit(newCommit, 'changes'),
        blobName
      }, req)

      version.changes = newCommit.changes
      return version
    },

    async revert (req) {
      reporter.logger.debug('Version control revert')

      const versions = await reporter.documentStore.collection('versions').find({}, req)

      const result = await reporter.executeWorkerAction('version-control-apply-patches',
        {
          versions,
          documentModel
        },
        {
          timeoutErrorMessage: 'Timeout during execution of version control revert'
        },
        req
      )

      const state = result.state

      return persistChanges(state, req)
    },

    async checkout (commitId, req) {
      if (!commitId) {
        throw new Error('Missing commitId for version control checkout')
      }

      const versionsToCheckout = await reporter.documentStore.collection('versions').find({ _id: commitId }, req)

      if (versionsToCheckout.length === 0) {
        throw new Error('Commit with id ' + commitId + ' was not found.')
      }

      const versionToCheckout = versionsToCheckout[0]

      reporter.logger.debug('Version control checkout to ' + versionToCheckout.message)

      const versionsToPatch = await reporter.documentStore.collection('versions').find({ creationDate: { $lte: versionToCheckout.creationDate } }, req)

      const result = await reporter.executeWorkerAction('version-control-apply-patches',
        {
          versions: versionsToPatch,
          documentModel
        },
        {
          timeoutErrorMessage: 'Timeout during execution of version control checkout'
        },
        req
      )

      const state = result.state

      return persistChanges(state, req)
    }
  })
}

function groupFoldersStateByLevel (foldersState) {
  // group folders by level
  const groups = {}

  foldersState.forEach((fState) => {
    let level = 0
    let currentFolder = fState.entity

    while (currentFolder != null) {
      if (currentFolder.folder != null) {
        const foundFolderState = foldersState.find((f) => f.entity.shortid === currentFolder.folder.shortid)

        if (foundFolderState != null) {
          level++
          currentFolder = foundFolderState.entity
        } else {
          // folders with invalid hierarchy get inserted into -1 level
          level = -1
          currentFolder = null
          break
        }
      } else {
        currentFolder = null
      }
    }

    groups[level] = groups[level] || []
    groups[level].push(fState)
  })

  return groups
}
