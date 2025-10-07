import should from 'should'
import storeMethods, { setStore } from '../../../../src/redux/methods'
import { selectors, actions } from '../../../../src/redux/entities'
import uid from '../../../../src/helpers/uid'
import { values as configuration } from '../../../../src/lib/configuration'
import { describeAsyncStore, itAsync } from '../asyncStore'

describeAsyncStore('Studio.resolveEntityFromPath', ({ store, api }) => {
  itAsync('should find itself', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't1')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('doc1', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t1')
  })

  itAsync('should find entity in subfolder', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't1')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('B/doc2', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t2')
  })

  itAsync('should find entity in nested subfolder', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't1')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('B/C/doc3', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t3')
  })

  itAsync('should find entity using .. to go up', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't3')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('../doc2', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t2')
  })

  itAsync('should find entity using multiple .. to go up', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't3')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('../../doc1', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t1')
  })

  itAsync('should find entity using multiple .. to go up - to root', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't3')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('../../../doc0', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t0')
  })

  itAsync('should find entity if going above root by staying at root', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't1')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('../../doc0', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t0')
  })

  itAsync('should find entity starting at root', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't0')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('doc0', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t0')
  })

  itAsync('should find entity using combination of .. and subfolders', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't3')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('../../B/doc2', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t2')
  })

  itAsync('should return null if path does not exist', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't1')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const result = storeMethods.resolveEntityFromPath('NonExistent/docX', null, { currentPath: parentPath })

    should(result).be.not.ok()
  })

  itAsync('should find entity if starting entity is at root', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't0')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('A/doc1', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t1')
  })

  itAsync('should handle going up to and down root', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't1')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('../A/B/doc2', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t2')
  })

  itAsync('should handle going back and forth root', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't0')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('A/../doc0', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t0')
  })

  itAsync('should handle if final entity is a folder', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't1')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('B/', null, { currentPath: parentPath })

    should(entitySet).be.eql('folders')
    should(entity.shortid).be.eql('f2')
  })

  itAsync('should start at root if path starts with /', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't3')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('/A/B/doc2', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t2')
  })

  itAsync('should find entity neighbor of root entity', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't0')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('doc02', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t02')
  })

  itAsync('should treat . as current directory', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't1')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('./doc1', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t1')
  })

  itAsync('should ignore redundant slashes', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't1')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('B//doc2', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t2')
  })

  itAsync('should handle trailing slash on file', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't1')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('doc1/', null, { currentPath: parentPath })

    should(entitySet).be.eql('templates')
    should(entity.shortid).be.eql('t1')
  })

  itAsync('should return null for path with only .', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't1')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const { entitySet, entity } = storeMethods.resolveEntityFromPath('.', null, { currentPath: parentPath })

    should(entitySet).be.eql('folders')
    should(entity.shortid).be.eql('f1')
  })

  itAsync('should return null for path with only ..', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't1')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const result = storeMethods.resolveEntityFromPath('..', null, { currentPath: parentPath })

    should(result).be.not.ok()
  })

  itAsync('should stay at root for ../../..', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't0')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const result = storeMethods.resolveEntityFromPath('../../..', null, { currentPath: parentPath })

    should(result).be.not.ok()
  })

  itAsync('should handle .. after absolute path', async () => {
    await prepareStore(store, api)
    const entities = selectors.getAll(store.getState().entities)
    const startingEntity = entities.find(e => e.shortid === 't3')
    setStore(store)
    const parentPath = getParentPath(storeMethods.resolveEntityPath(startingEntity))
    const result = storeMethods.resolveEntityFromPath('/A/..', null, { currentPath: parentPath })

    should(result).be.not.ok()
  })
})

function getParentPath (entityPath) {
  return `/${entityPath.split('/').slice(1, -1).join('/')}`
}

async function prepareStore (store, api) {
  configuration.entitySets = {
    folders: { nameAttribute: 'name', referenceAttributes: ['name', 'shortid', 'folder'] },
    templates: { nameAttribute: 'name', referenceAttributes: ['name', 'shortid', 'folder'] }
  }

  // Helper to create folder/entity structure
  const makeEntity = ({ name, shortid, folderShortid, entitySet }) => {
    return {
      _id: uid(),
      name,
      shortid,
      __entitySet: entitySet,
      folder: folderShortid ? { shortid: folderShortid } : undefined
    }
  }

  api.get((p) => {
    if (p.startsWith('/odata/folders')) {
      return {
        value: [
          makeEntity({ name: 'A', shortid: 'f1', entitySet: 'folders' }),
          makeEntity({ name: 'B', shortid: 'f2', folderShortid: 'f1', entitySet: 'folders' }),
          makeEntity({ name: 'C', shortid: 'f3', folderShortid: 'f2', entitySet: 'folders' })
        ]
      }
    } else if (p.startsWith('/odata/templates')) {
      return {
        value: [
          makeEntity({ name: 'doc0', shortid: 't0', entitySet: 'templates' }),
          makeEntity({ name: 'doc02', shortid: 't02', entitySet: 'templates' }),
          makeEntity({ name: 'doc1', shortid: 't1', folderShortid: 'f1', entitySet: 'templates' }),
          makeEntity({ name: 'doc2', shortid: 't2', folderShortid: 'f2', entitySet: 'templates' }),
          makeEntity({ name: 'doc3', shortid: 't3', folderShortid: 'f3', entitySet: 'templates' })
        ]
      }
    }

    throw new Error('unexpected odata request ' + p)
  })

  await store.dispatch(actions.loadReferences())
}
