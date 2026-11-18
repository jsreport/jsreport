const { serialize, parse, infiniteRetry, retry } = require('./customUtils')

function collectDocsInHierarchy (folder, documents) {
  const entities = [folder]
  function _collectDocsInHierarchy (folder) {
    for (const es in documents) {
      for (const doc of documents[es]) {
        if (doc.folder && doc.folder.shortid === folder.shortid) {
          entities.push(doc)
          if (doc.$entitySet === 'folders') {
            _collectDocsInHierarchy(doc)
          }
        }
      }
    }
  }
  _collectDocsInHierarchy(folder)
  return entities
}

module.exports = ({ persistence, fs, logger, commitedStore, onRecovery }) => {
  return {
    recover: (workingDocuments) => {
      return infiniteRetry(async () => {
        if (await fs.exists('tran.journal')) {
          const journalContent = await fs.readFile('tran.journal')
          const entries = []

          for (const line of journalContent.toString().split('\n')) {
            if (line.trim().length === 0) {
              continue
            }

            try {
              entries.push(parse(line))
            } catch (e) {
              logger.warn(`Data corruption in the transaction journal file, skipping entry ${line}`, e)
              continue
            }
          }

          const folderHints = [
            ...((workingDocuments || commitedStore.documents).folders || []),
            ...entries.flatMap(entry => [entry.doc, entry.originalDoc].filter(doc => doc && doc.$entitySet === 'folders'))
          ]
          const folders = new Map(folderHints.map(folder => [folder.shortid, folder]))

          // Another pod may have replaced the journal before rollback acquired the lock.
          // Refresh folder paths even when a working copy is available, without loading partial entities.
          for (const folder of await persistence.loadFolders(folderHints)) {
            folders.set(folder.shortid, folder)
          }
          // Journal entries describe folder versions at the time of the interrupted writes.
          // Keep removed folders too, as their descendants may still need them to resolve paths.
          for (const entry of entries) {
            if (entry.doc.$entitySet === 'folders') {
              folders.set(entry.doc.shortid, entry.doc)
            }
          }

          for (const entry of entries.reverse()) {
            const documents = { folders: [...folders.values()] }
            switch (entry.operation) {
              case 'insert':
                await persistence.remove(entry.doc, documents)
                if (entry.doc.$entitySet === 'folders') {
                  folders.delete(entry.doc.shortid)
                }
                break
              case 'update':
                if (entry.doc.$entitySet === 'folders') {
                  // Restore folder metadata without removing its child directories.
                  await persistence.update(entry.originalDoc, entry.doc, documents)
                  folders.set(entry.originalDoc.shortid, entry.originalDoc)
                } else {
                  await persistence.remove(entry.doc, documents)
                  await persistence.insert(entry.originalDoc, documents)
                }
                break
              case 'remove':
                await persistence.insert(entry.doc, documents)
                if (entry.doc.$entitySet === 'folders') {
                  folders.set(entry.doc.shortid, entry.doc)
                }
                break
            }
          }
          // Keep the journal until memory and the cluster notification are consistent too.
          await onRecovery()
          return fs.remove('tran.journal')
        }
      }, (e, delay) => {
        logger.error(`Rollback crashed, trying again in ${delay}ms`, e)
      })
    },
    insert: async (doc) => {
      const content = {
        operation: 'insert',
        doc
      }

      const contentToWrite = serialize(content, false) + '\n'

      return retry(() => fs.appendFile('tran.journal', contentToWrite))
    },
    update: async (doc, originalDoc, documents) => {
      if (doc.$entitySet === 'folders' && (doc.folder?.shortid !== originalDoc.folder?.shortid || doc.name !== originalDoc.name)) {
        const updatingDocs = collectDocsInHierarchy(originalDoc, documents)
        updatingDocs.reverse()
        for (const updatingDoc of updatingDocs) {
          const content = {
            operation: 'remove',
            doc: updatingDoc
          }
          const contentToWrite = serialize(content, false) + '\n'

          await retry(() => fs.appendFile('tran.journal', contentToWrite))
        }
        const content = {
          operation: 'insert',
          doc: doc
        }
        const contentToWrite = serialize(content, false) + '\n'

        await retry(() => fs.appendFile('tran.journal', contentToWrite))
      } else {
        const content = {
          operation: 'update',
          doc
        }
        if (originalDoc) {
          content.originalDoc = originalDoc
        }
        const contentToWrite = serialize(content, false) + '\n'

        await retry(() => fs.appendFile('tran.journal', contentToWrite))
      }
    },
    remove: async (doc, documents) => {
      if (doc.$entitySet === 'folders') {
        const removingDocs = collectDocsInHierarchy(doc, documents)
        removingDocs.reverse()

        let lines = ''
        for (const removingDoc of removingDocs) {
          const content = {
            operation: 'remove',
            doc: removingDoc
          }
          lines += serialize(content, false) + '\n'
        }
        await retry(() => fs.appendFile('tran.journal', lines))
      } else {
        const content = {
          operation: 'remove',
          doc
        }
        const contentToWrite = serialize(content, false) + '\n'

        await retry(() => fs.appendFile('tran.journal', contentToWrite))
      }
    },
    clean: () => {
      return retry(() => fs.remove('tran.journal'))
    }
  }
}
