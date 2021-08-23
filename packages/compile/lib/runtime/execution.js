const util = require('util')
const path = require('path')
const fs = require('fs')
const defaultTmpDir = path.join(require('os').tmpdir(), 'jsreport')
const mkdirp = require('mkdirp')
const readFileAsync = util.promisify(fs.readFile)
const writeFileAsync = util.promisify(fs.writeFile)
const statAsync = util.promisify(fs.stat)
const chmodAsync = util.promisify(fs.chmod)
const lockfile = require('lockfile')

const lock = util.promisify(lockfile.lock.bind(lockfile))
const unlock = util.promisify(lockfile.unlock.bind(lockfile))

const mkdirpAsync = function (dir) {
  return new Promise((resolve, reject) => {
    mkdirp(dir, (err) => {
      if (err) {
        return reject(err)
      }

      resolve()
    })
  })
}

/**
 * Class used to resolve resources and modules inside bundle
 * The instance is accessible on jsreport.execution
 */
class Execution {
  constructor (originalProjectDir, resources, version, shortid, tempDirectory) {
    this.originalProjectDir = originalProjectDir
    this.resources = resources

    // path where are stored resources like phantomjs.exe
    this.tmpPath = path.join(tempDirectory != null ? tempDirectory : defaultTmpDir, 'compile', `jsreport-${version}-${shortid}`)
  }

  resourcePath (name) {
    const resource = this.resources[name]

    if (resource.script === true) {
      throw new Error(`Can not get path for resource "${name}" because it is a script`)
    }

    let pathToEvaluate

    if (resource.temp === true) {
      pathToEvaluate = resource.pathInProject
    } else {
      pathToEvaluate = resource.path
    }

    const currentProjectDir = path.dirname(process.pkg.defaultEntrypoint)

    const resourcePath = pathToEvaluate.replace(this.originalProjectDir, currentProjectDir)

    return resourcePath
  }

  /** get path into resource located in temp */
  resourceTempPath (name) {
    return path.join(this.tmpPath, name)
  }

  get tempDirectory () {
    return this.tmpPath
  }

  async ensureTmpResources () {
    const tempResources = Object.keys(this.resources).filter((r) => this.resources[r].temp)
    await mkdirpAsync(this.tmpPath)

    await lock(path.join(this.tmpPath, 'tmp-resources.lock'), {
      stale: 2000, retries: 20, retryWait: 100
    })

    try {
      await Promise.all(tempResources.map(async (r) => {
        const filePath = path.join(this.tmpPath, r)

        try {
          await statAsync(filePath)
        } catch (e) {
          await mkdirpAsync(path.dirname(filePath))

          const rContent = await readFileAsync(this.resourcePath(r))

          await writeFileAsync(filePath, rContent)
          await chmodAsync(filePath, 0o777)
        }
      }))
    } finally {
      await unlock(path.join(this.tmpPath, 'tmp-resources.lock'))
    }
  }
}

module.exports = Execution
