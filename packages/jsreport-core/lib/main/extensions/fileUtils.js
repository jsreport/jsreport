/*!
 * Copyright(c) 2014 Jan Blaha
 *
 */
const fs = require('fs')
const path = require('path')

exports.walkSync = (rootPath, fileName, excludePath) => {
  const results = []
  const queue = []
  let next = rootPath

  function dirname (f) {
    const parts = path.dirname(f).split(path.sep)
    return parts[parts.length - 1]
  }

  while (next) {
    let list
    try {
      list = fs.readdirSync(next)
    } catch (e) {
      // no permissions to read folder for example, just skip it
      list = []
    }
    list.forEach((i) => {
      const item = path.join(next, i)

      if (item.startsWith(excludePath)) {
        return
      }

      try {
        if (fs.statSync(item).isDirectory()) {
          queue.push(item)
          return
        }
      } catch (e) {

      }

      if (i === fileName) {
        const extensionsDirectoryName = dirname(item)
        const alreadyListedConfig = results.filter((f) => extensionsDirectoryName === dirname(f))

        if (!alreadyListedConfig.length) {
          results.push(item)
        }
      }
    })

    next = queue.shift()
  }

  return results
}
