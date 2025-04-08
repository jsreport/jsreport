const path = require('path')
const extend = require('node.extend.without.arrays')
const pMap = require('p-map')
const { copy, deepGet, deepSet, deepDelete, serialize, parse, retry, uid } = require('./customUtils')
const { createError } = require('@jsreport/jsreport-core')

function getDirectoryPath (fs, model, doc, documents) {
  if (!doc.folder) {
    return ''
  }

  const folders = []

  while (doc.folder) {
    const folderEntity = (documents.folders || []).find((f) => f.shortid === doc.folder.shortid)

    if (!folderEntity) {
      throw createError(`Can not find parent folder for entity "${doc.name}" (entitySet: ${doc.$entitySet})`, { week: true })
    }

    folders.push(folderEntity.name)
    doc = folderEntity
  }

  return folders.reverse().join(fs.path.sep)
}

function getEntitySetNameFromPath (fs, p) {
  const fragments = p.split(fs.path.sep)
  return fragments[fragments.length - 2]
}

async function parseFiles (fs, parentDirectory, documentsModel, files) {
  const configFile = files.find(f => f === 'config.json')

  if (!configFile && !parentDirectory) {
    return []
  }

  if (!configFile) {
    const folder = {
      _id: uid(16),
      shortid: uid(6),
      $entitySet: 'folders',
      name: fs.path.basename(parentDirectory)
    }
    await fs.writeFile(fs.path.join(parentDirectory, 'config.json'), serialize(folder))

    return [folder]
  }

  const pathToFile = fs.path.join(parentDirectory, configFile)
  const rawContent = (await fs.readFile(pathToFile)).toString()
  let document

  try {
    document = parse(rawContent)
  } catch (e) {
    const newE = new Error(`Error when trying to parse file at "${pathToFile}", check that file contains valid JSON. ${e.message}`)
    throw newE
  }

  if (!document.$entitySet) {
    document.$entitySet = getEntitySetNameFromPath(fs, parentDirectory)
  }

  const es = documentsModel.entitySets[document.$entitySet]
  if (!es) {
    return []
  }
  const entityType = es.entityType

  document.name = fs.path.basename(parentDirectory)

  // eslint-disable-next-line no-unused-vars
  for (const prop of entityType.documentProperties) {
    const matchingDocumentFile = files.find((f) => {
      const fileWithoutExtension = f.substring(0, f.lastIndexOf('.'))
      const pathFragments = prop.path.split('.')
      return fileWithoutExtension === pathFragments[pathFragments.length - 1]
    })

    if (!matchingDocumentFile) {
      continue
    }

    const content = await fs.readFile(fs.path.join(parentDirectory, matchingDocumentFile))

    deepSet(document, prop.path, prop.type.type === 'Edm.Binary' ? content : content.toString('utf8'))
  }

  return [document]
}

async function load (fs, directory, model, documents, { dataDirectory, blobStorageDirectory, loadConcurrency, parentDirectoryEntity }) {
  const dirEntries = await fs.readdir(directory)
  const contentStats = await pMap(dirEntries, async (e) => ({ name: e, stat: await fs.stat(fs.path.join(directory, e)) }), { concurrency: loadConcurrency })

  const loadedDocuments = await parseFiles(fs, directory, model, contentStats.filter((e) => !e.stat.isDirectory()).map(e => e.name))

  // eslint-disable-next-line no-unused-vars
  for (const d of loadedDocuments) {
    if (parentDirectoryEntity && !d.folder) {
      d.folder = { shortid: parentDirectoryEntity.shortid }
    } else if (parentDirectoryEntity && d.folder && d.folder.shortid !== parentDirectoryEntity.shortid) {
      // normalize folder, the filesystem is the source of truth
      d.folder.shortid = parentDirectoryEntity.shortid
    } else if (!parentDirectoryEntity && d.folder) {
      // normalize folder when it is at the root
      delete d.folder
    }

    if (d.$entitySet === 'folders') {
      parentDirectoryEntity = d
    }
  }

  documents.push(...loadedDocuments)

  const dirNames = contentStats.filter((e) => {
    let result = e.stat.isDirectory()

    if (blobStorageDirectory && blobStorageDirectory.startsWith(dataDirectory)) {
      const blobStorageDirectoryName = path.basename(blobStorageDirectory, '')
      result = result && e.name !== blobStorageDirectoryName
    }

    return result
  }).map((e) => e.name)

  await pMap(dirNames, (n) => load(fs, fs.path.join(directory, n), model, documents, { parentDirectoryEntity, dataDirectory, blobStorageDirectory, loadConcurrency }), { concurrency: loadConcurrency })
  return documents
}

async function persistToPath (fs, resolveFileExtension, model, docPath, doc, originalDoc, documents) {
  if (!(await fs.exists(docPath))) {
    await fs.mkdir(docPath)
  }

  if (originalDoc && doc.$entitySet === 'folders') {
    const originalDocPath = fs.path.join(getDirectoryPath(fs, model, originalDoc, documents), originalDoc.name)

    if (originalDocPath !== docPath) {
      await copy(fs, originalDocPath, docPath)
    }
  }

  const dirEntries = await fs.readdir(docPath)
  await Promise.all(dirEntries.map(async (e) => {
    const stat = await fs.stat(fs.path.join(docPath, e))
    if (!stat.isDirectory()) {
      return fs.remove(fs.path.join(docPath, e))
    }
  }))

  const entityType = model.entitySets[doc.$entitySet].entityType
  await Promise.all(entityType.documentProperties.map(async (prop) => {
    const fileExtension = resolveFileExtension(doc, doc.$entitySet, prop.path)
    let value = deepGet(doc, prop.path)

    if (value == null) {
      deepDelete(doc, prop.path)
      return
    }

    value = value || ''

    if (prop.type.type === 'Edm.Binary' && !Buffer.isBuffer(value)) {
      value = Buffer.from(value, 'base64')
    }

    const pathFragments = prop.path.split('.')
    await fs.writeFile(fs.path.join(docPath, pathFragments[pathFragments.length - 1] + '.' + fileExtension), value)

    deepDelete(doc, prop.path)
  }))

  await fs.writeFile(fs.path.join(docPath, 'config.json'), serialize(doc))
}

async function persist (fs, resolveFileExtension, model, doc, originalDoc, documents) {
  if (!model.entitySets[doc.$entitySet].splitIntoDirectories) {
    const docFinalPath = doc.$entitySet

    return fs.appendFile(docFinalPath, serialize(doc, false) + '\n')
  }

  const docFinalPath = fs.path.join(getDirectoryPath(fs, model, doc, documents), doc.name)

  if (!originalDoc && (await fs.exists(docFinalPath))) {
    // this can happen when recovering failed remove
    await fs.remove(docFinalPath)
  }

  const docClone = extend(true, {}, doc)

  // don't store the folder reference, it is computed from the file system hierarchy
  deepDelete(docClone, 'folder')

  await persistToPath(fs, resolveFileExtension, model, docFinalPath, docClone, originalDoc, documents)

  if (originalDoc) {
    const originalDocPath = fs.path.join(getDirectoryPath(fs, model, originalDoc, documents), originalDoc.name)
    if (originalDocPath !== docFinalPath) {
      await fs.remove(originalDocPath)
    }
  }
}

async function remove (fs, model, doc, documents) {
  if (!model.entitySets[doc.$entitySet].splitIntoDirectories) {
    const removal = { $$deleted: true, _id: doc._id }
    const docFinalPath = doc.$entitySet

    return fs.appendFile(docFinalPath, serialize(removal, false) + '\n')
  }

  const originalDocPath = fs.path.join(getDirectoryPath(fs, model, doc, documents), doc.name)

  await fs.remove(originalDocPath)
}

async function loadFlatDocument (fs, file, documents, corruptAlertThreshold) {
  let doesNeedCompaction = false

  const contents = (await fs.readFile(file)).toString().split('\n').filter(c => c)
  const resultDocs = {}
  let corruptItems = -1 // Last line of every data file is usually blank so not really corrupt

  // eslint-disable-next-line no-unused-vars
  for (const docContent of contents) {
    try {
      const doc = parse(docContent)

      if (doc.$$deleted) {
        doesNeedCompaction = true
        delete resultDocs[doc._id]
        continue
      }

      if (resultDocs[doc._id]) {
        doesNeedCompaction = true
      }
      doc.$entitySet = file
      resultDocs[doc._id] = doc
    } catch (e) {
      doesNeedCompaction = true
      corruptItems += 1
    }
  }

  if (contents.length > 0 && (corruptItems / contents.length) > corruptAlertThreshold) {
    throw Error(`Data file "${file}" is corrupted. To recover you need to open it in an editor and fix the json inside.`)
  }

  Object.keys(resultDocs).forEach((k) => documents.push(resultDocs[k]))
  return {
    doesNeedCompaction
  }
}

async function loadFlatDocuments (fs, documentsModel, documents, corruptAlertThreshold) {
  const dirEntries = await fs.readdir('')
  const contentStats = await Promise.all(dirEntries.map(async (e) => ({ name: e, stat: await fs.stat(e) })))
  const flatFilesToLoad = contentStats.filter(e => !e.stat.isDirectory() && documentsModel.entitySets[e.name]).map(e => e.name)

  const compactionNeedResults = {}

  // eslint-disable-next-line no-unused-vars
  for (const file of flatFilesToLoad.filter(f => !f.startsWith('~'))) {
    const { doesNeedCompaction } = await loadFlatDocument(fs, file, documents, corruptAlertThreshold)
    compactionNeedResults[file] = doesNeedCompaction
  }
  return compactionNeedResults
}

async function compactFlatFiles (fs, model, memoryDocumentsByEntitySet, corruptAlertThreshold) {
  const documents = []
  const compactionNeedResults = await loadFlatDocuments(fs, model, documents, corruptAlertThreshold)

  const documentsByEntitySet = {}
  Object.keys(model.entitySets).forEach(e => (documentsByEntitySet[e] = []))
  documents.forEach(d => documentsByEntitySet[d.$entitySet].push(d))

  // eslint-disable-next-line no-unused-vars
  for (const es of Object.keys(documentsByEntitySet)) {
    if (model.entitySets[es].splitIntoDirectories) {
      continue
    }

    memoryDocumentsByEntitySet[es] = documentsByEntitySet[es]

    if (documentsByEntitySet[es].length === 0 && !(await fs.exists(es))) {
      continue
    }

    if (compactionNeedResults[es]) {
      await fs.writeFile('~' + es, documentsByEntitySet[es].map((d) => serialize(d, false)).join('\n') + '\n')

      // the final rename sometimes throws EPERM error, because the folder is still somehow
      // blocked because of previous reload, the retry should help in the case
      await retry(() => fs.rename('~' + es, es), 5)
    }
  }
}

module.exports = ({ fs, documentsModel, corruptAlertThreshold, resolveFileExtension, dataDirectory, blobStorageDirectory, loadConcurrency = 8 }) => ({
  update: (doc, originalDoc, documents) => persist(fs, resolveFileExtension, documentsModel, doc, originalDoc, documents),
  insert: (doc, documents) => persist(fs, resolveFileExtension, documentsModel, doc, null, documents),
  remove: (doc, documents) => remove(fs, documentsModel, doc, documents),
  reload: async (doc, documents) => {
    const loadedDocuments = []
    const docPath = fs.path.join(getDirectoryPath(fs, documentsModel, doc, documents), doc.name)
    await load(fs, docPath, documentsModel, loadedDocuments, { dataDirectory, blobStorageDirectory, loadConcurrency })

    return loadedDocuments.length !== 1 ? null : loadedDocuments[0]
  },
  load: async () => {
    const documents = []
    await load(fs, '', documentsModel, documents, { dataDirectory, blobStorageDirectory, loadConcurrency })
    await loadFlatDocuments(fs, documentsModel, documents, corruptAlertThreshold)
    return documents
  },
  compact: (documents) => compactFlatFiles(fs, documentsModel, documents, corruptAlertThreshold)
})
