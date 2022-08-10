const util = require('util')
const fs = require('fs')
const path = require('path')
const shortid = require('shortid')
const archiver = require('archiver')
const extract = require('extract-zip')
const renameAsync = util.promisify(fs.rename)

module.exports.compress = async (dir, out) => {
  const ws = fs.createWriteStream(out)

  return new Promise((resolve, reject) => {
    const archive = archiver('zip')
    archive.on('error', reject)
    archive.on('end', resolve)
    archive.pipe(ws)
    archive.directory(dir, false)
    archive.finalize()
  })
}

module.exports.decompress = async (zipPath, chromeExePath) => {
  const finalChromePath = path.join(path.dirname(zipPath), 'chrome')

  // we will write everything to a extract temp directory first
  // to ensure that parallel execution of the exe works
  const extractTmpPath = path.join(path.dirname(zipPath), `~chrome-${shortid()}`)

  if (fs.existsSync(extractTmpPath)) {
    throw new Error(`Temporary extract directory "${extractTmpPath}" exists`)
  }

  await extract(zipPath, { dir: extractTmpPath, defaultFileMode: 0o777 })

  await checkAndHandleRename(extractTmpPath, finalChromePath, chromeExePath)
}

async function checkAndHandleRename (sourcePath, targetPath, chromeExePath, tryCount = 0) {
  const maxRetries = 20

  // there is no need to rename because some other process may had had already extracted chrome
  // so we just cleanup
  if (fs.existsSync(chromeExePath)) {
    try {
      fs.rmSync(sourcePath, { recursive: true, force: true })
    } catch (e) {

    }
    return
  }

  try {
    fs.rmSync(targetPath, { recursive: true, force: true })
    await renameAsync(sourcePath, targetPath)
  } catch (e) {
    if (tryCount < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      await checkAndHandleRename(sourcePath, targetPath, chromeExePath, tryCount + 1)
    } else {
      throw e
    }
  }
}
