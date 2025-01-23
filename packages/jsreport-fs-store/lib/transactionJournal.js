const { serialize, parse, infiniteRetry } = require('./customUtils')

function collectDocsInHierarchy (folder, store, singlelLevel = false) {
  const entities = [folder]
  function _collectDocsInHierarchy (folder, store) {
    for (const es in store.documents) {
      for (const doc of store.documents[es]) {
        if (doc.folder && doc.folder.shortid === folder.shortid) {
          entities.push(doc)
          if (doc.$entitySet === 'folders' && singlelLevel === false) {
            _collectDocsInHierarchy(doc, store)
          }
        }
      }
    }
  }
  _collectDocsInHierarchy(folder, store)
  return entities
}

module.exports = ({ persistence, fs, logger, commitedStore }) => {
  return {
    recover: () => {
      return infiniteRetry(async () => {
        if (await fs.exists('tran.journal')) {
          const journalContent = await fs.readFile('tran.journal')
          const lines = journalContent.toString().split('\n').slice().reverse()

          for (const line of lines) {
            if (line.trim().length === 0) {
              continue
            }

            let parsedLine
            try {
              parsedLine = parse(line)
            } catch (e) {
              logger.warn(`Data corruption in the transaction journal file, skipping entry ${line}`, e)
              continue
            }

            switch (parsedLine.operation) {
              case 'insert':
                await persistence.remove(parsedLine.doc, commitedStore.documents)
                break
              case 'update':
                await persistence.remove(parsedLine.doc, commitedStore.documents)
                await persistence.insert(parsedLine.originalDoc, commitedStore.documents)
                break
              case 'remove':
                await persistence.insert(parsedLine.doc, commitedStore.documents)
                break
            }
          }
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

      await fs.appendFile('tran.journal', contentToWrite)
    },
    update: async (doc, originalDoc) => {
      if (doc.$entitySet === 'folders' && (doc.folder?.shortid !== originalDoc.folder?.shortid || doc.name !== originalDoc.name)) {
        const updatingDocs = collectDocsInHierarchy(originalDoc, commitedStore, true)
        updatingDocs.reverse()
        for (const updatingDoc of updatingDocs) {
          const content = {
            operation: 'remove',
            doc: updatingDoc
          }
          const contentToWrite = serialize(content, false) + '\n'

          await fs.appendFile('tran.journal', contentToWrite)
        }
        const content = {
          operation: 'insert',
          doc: doc
        }
        const contentToWrite = serialize(content, false) + '\n'

        await fs.appendFile('tran.journal', contentToWrite)
      } else {
        const content = {
          operation: 'update',
          doc
        }
        if (originalDoc) {
          content.originalDoc = originalDoc
        }
        const contentToWrite = serialize(content, false) + '\n'

        await fs.appendFile('tran.journal', contentToWrite)
      }
    },
    remove: async (doc) => {
      if (doc.$entitySet === 'folders') {
        const removingDocs = collectDocsInHierarchy(doc, commitedStore)
        removingDocs.reverse()

        let lines = ''
        for (const removingDoc of removingDocs) {
          const content = {
            operation: 'remove',
            doc: removingDoc
          }
          lines += serialize(content, false) + '\n'
        }
        await fs.appendFile('tran.journal', lines)
      } else {
        const content = {
          operation: 'remove',
          doc
        }
        const contentToWrite = serialize(content, false) + '\n'

        await fs.appendFile('tran.journal', contentToWrite)
      }
    },
    clean: () => {
      return fs.remove('tran.journal')
    }
  }
}
