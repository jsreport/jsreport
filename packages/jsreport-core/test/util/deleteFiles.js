const fs = require('fs')

/**
 * Recursively deletes files in folder
 */
function deleteFiles (path) {
  try {
    fs.rmdirSync(path, { recursive: true })
  } catch (e) {
  }
}

module.exports = deleteFiles
