const toArray = require('stream-to-array')
const yauzl = require('yauzl')
const archiver = require('archiver')

module.exports.unzipEntities = (zipFilePath) => {
  let zipFile

  return new Promise((resolve, reject) => {
    const entities = {}
    let metadata

    // using lazyEntries: true to keep memory usage under control with zip files with
    // a lot of files inside
    yauzl.open(zipFilePath, { lazyEntries: true }, (openZipErr, zipHandler) => {
      if (openZipErr) {
        return reject(openZipErr)
      }

      let hasError = false

      zipFile = zipHandler

      zipFile.readEntry()

      zipFile
        .on('error', (err) => {
          if (hasError) {
            return
          }

          hasError = true
          reject(err)
        }).on('entry', (entry) => {
          if (hasError) {
            return
          }

          if (/\/$/.test(entry.fileName)) {
            // if entry is a directory just continue with the next entry.
            return zipFile.readEntry()
          }

          zipFile.openReadStream(entry, (err, readStream) => {
            if (hasError) {
              return
            }

            if (err) {
              hasError = true
              return reject(err)
            }

            toArray(readStream, (err, arr) => {
              if (hasError) {
                return
              }

              if (err) {
                hasError = true
                return reject(err)
              }

              try {
                if (entry.fileName === 'metadata.json') {
                  metadata = JSON.parse(Buffer.concat(arr).toString())
                } else {
                  const es = entry.fileName.split('/')[0]
                  entities[es] = entities[es] || []
                  entities[es].push(JSON.parse(Buffer.concat(arr).toString()))
                }

                zipFile.readEntry()
              } catch (e) {
                hasError = true
                reject(
                  new Error(
                    `Unable to parse file "${
                      entry.fileName
                    }" inside zip, make sure to import zip created using jsreport export`
                  )
                )
              }
            })
          })
        }).on('close', () => {
          if (hasError) {
            // close event can may be emitted after an error
            // when releasing the zip file
            return
          }

          resolve({ entities, metadata })
        })
    })
  }).catch((err) => {
    if (zipFile && zipFile.isOpen) {
      // ensure closing the zip file in case of error
      zipFile.close()
    }

    throw err
  })
}

module.exports.zipEntities = (entities, metadata) => {
  const archive = archiver('zip')

  archive.append(JSON.stringify(metadata), { name: 'metadata.json' })

  Object.keys(entities).forEach((c) => {
    entities[c].forEach((e) => {
      archive.append(JSON.stringify(e), { name: c + '/' + (e.name ? (e.name + '-' + e._id) : e._id) + '.json' })
    })
  })

  archive.finalize()
  return archive
}

module.exports.parseMultipart = (reporter, multer) => (req, res, cb) => {
  multer.any()(req, res, (err) => {
    if (err) {
      return cb(reporter.createError('Unable to read export file key from multipart stream', {
        statusCode: 400,
        weak: true
      }))
    }

    function findFirstFile () {
      for (const f in req.files) {
        if (Object.prototype.hasOwnProperty.call(req.files, f)) {
          return req.files[f]
        }
      }
    }

    const file = findFirstFile()

    if (!file) {
      return cb(reporter.createError('Unable to read export file key from multipart stream', {
        statusCode: 400,
        weak: true
      }))
    }

    cb(null, file.path)
  })
}

module.exports.groupFoldersByLevel = (folders) => {
  // group folders by level
  const groups = {}

  folders.forEach((folder) => {
    let level = 0
    let currentFolder = folder

    while (currentFolder != null) {
      if (currentFolder.folder != null) {
        const foundFolder = folders.find((f) => f.shortid === currentFolder.folder.shortid)

        if (foundFolder != null) {
          level++
          currentFolder = foundFolder
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
    groups[level].push(folder)
  })

  return groups
}

module.exports.groupEntitiesByLevel = (entities, folderGroups) => {
  // group entities by level
  const groups = {}

  entities.forEach((entity) => {
    let level

    if (entity.folder != null) {
      level = -1

      for (const [levelKey, foldersInLevel] of Object.entries(folderGroups)) {
        const currentLevel = parseInt(levelKey, 10)
        const exists = foldersInLevel.find((f) => f.shortid === entity.folder.shortid) != null

        if (exists) {
          level = currentLevel + 1
          break
        }
      }
    } else {
      level = 0
    }

    groups[level] = groups[level] || []
    groups[level].push(entity)
  })

  return groups
}

module.exports.getEntityDisplay = (reporter, { entity, collectionName }) => {
  let entityDisplay
  let entityDisplayProperty

  if (entity.name) {
    entityDisplayProperty = 'name'
    entityDisplay = entity.name
  } else {
    entityDisplayProperty = '_id'
    entityDisplay = entity._id
  }

  return {
    entityDisplayProperty,
    entityDisplay
  }
}

module.exports.getEntityNameDisplay = async (reporter, { entity, allLocalEntities, collectionName, targetFolderPath, importByEntitySet, req }) => {
  let entityNameDisplay
  let entityNameDisplayProperty

  if (entity.name) {
    entityNameDisplayProperty = 'path'

    entityNameDisplay = await reporter.folders.resolveEntityPath(entity, collectionName, req, async (folderShortId) => {
      let folderFound

      if (allLocalEntities.folders) {
        folderFound = allLocalEntities.folders.find((e) => e.shortid === folderShortId)
      }

      return folderFound
    })

    if (importByEntitySet) {
      if (reporter.documentStore.model.entitySets[collectionName].splitIntoDirectories === true) {
        entityNameDisplay = `/${collectionName}/${entity.name}`
      } else {
        entityNameDisplay = `/${entity.name}`
      }
    }

    if (targetFolderPath != null) {
      entityNameDisplay = `${targetFolderPath}${entityNameDisplay}`
    }
  } else {
    entityNameDisplayProperty = '_id'
    entityNameDisplay = entity._id
  }

  return { entityNameDisplay, entityNameDisplayProperty }
}
