module.exports.createFileChanges = createFileChanges

// keeps the changes to the files of the xlsx (additions, removals) requested while rendering
function createFileChanges (files) {
  const changes = new Map()

  const fileChanges = {
    // adds the file, when the file exists its content is replaced
    add (filePath, content) {
      changes.set(filePath, { type: 'add', content })
    },
    remove (filePath) {
      changes.set(filePath, { type: 'remove' })
    },
    // checks if the file exists, considering the changes requested
    exists (filePath) {
      const change = changes.get(filePath)

      if (change != null) {
        return change.type === 'add'
      }

      return files.some((f) => f.path === filePath)
    }
  }

  const applyFileChanges = () => {
    for (const [filePath, change] of changes) {
      const fileIdx = files.findIndex((f) => f.path === filePath)

      if (change.type === 'add') {
        // the content is used as it is (it is not serialized from a doc)
        const newFile = {
          path: filePath,
          data: change.content,
          serializeFromDoc: false
        }

        if (fileIdx !== -1) {
          files[fileIdx] = newFile
        } else {
          files.push(newFile)
        }
      } else if (fileIdx !== -1) {
        files.splice(fileIdx, 1)
      }
    }
  }

  return [fileChanges, applyFileChanges]
}
