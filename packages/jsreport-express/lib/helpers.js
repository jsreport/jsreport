const yauzl = require('yauzl')
const toArray = require('stream-to-array')
const fs = require('fs')

module.exports.unzipFiles = (buf) => {
  let zipFile
  return new Promise((resolve, reject) => {
    const entities = {}

    // using lazyEntries: true to keep memory usage under control with zip files with
    // a lot of files inside
    yauzl.fromBuffer(buf, { lazyEntries: true, autoClose: true }, (openZipErr, zipFileHandler) => {
      if (openZipErr) {
        return reject(openZipErr)
      }

      let hasError = false

      zipFile = zipFileHandler

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

              entities[entry.fileName] = Buffer.concat(arr)
              zipFile.readEntry()
            })
          })
        }).on('end', () => {
          if (hasError) {
            // close event can may be emitted after an error
            // when releasing the zip file
            return
          }

          resolve(entities)
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

module.exports.parseMultipart = (multer) => (req, res) => {
  return new Promise((resolve, reject) => {
    multer.array('profile.jsrprofile')(req, res, (err) => {
      if (err) {
        return reject(new Error('Unable to read export file key from multipart stream'))
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
        return reject(new Error('Unable to read profile file key from multipart stream'))
      }

      fs.readFile(file.path, (err, content) => {
        if (err) {
          return reject(err)
        }

        resolve(content)
      })
    })
  })
}
