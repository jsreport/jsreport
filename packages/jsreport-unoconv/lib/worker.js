const path = require('path')
const mime = require('mime')
const util = require('util')
const fs = require('fs')
const readFile = util.promisify(fs.readFile)
const exec = util.promisify(require('child_process').exec)

module.exports = function (reporter, definition) {
  reporter.beforeRenderListeners.add('unoconv', (req, res) => {
    // otherwise the output is html for office online
    if (req.template.unoconv && req.template.unoconv.enabled !== false && req.template.unoconv.format) {
      req.options.preview = false
    }
  })

  reporter.afterRenderListeners.insert({ before: 'scripts' }, 'unoconv', async (req, res) => {
    if (!req.template.unoconv || req.template.unoconv.enabled === false || !req.template.unoconv.format || req.context.isChildRequest) {
      return
    }

    try {
      const fileExtension = res.meta.fileExtension
      const format = req.template.unoconv.format

      let outputFilename
      const { pathToFile } = await reporter.writeTempFile((uuid) => {
        outputFilename = `${uuid}.${format}`
        return `${uuid}.${fileExtension}`
      }, res.content)

      const command = `${definition.options.command} -f ${format} ${pathToFile}`
      reporter.logger.debug('Executing unoconv commmand ' + command, req)
      const { stdout, stderr } = await exec(command)
      res.content = await readFile(path.join(path.dirname(pathToFile), outputFilename))

      res.meta.fileExtension = req.template.unoconv.format
      res.meta.contentType = mime.getType(req.template.unoconv.format)
      if (stdout) {
        reporter.logger.debug(stdout, req)
      }

      if (stderr) {
        reporter.logger.error(stderr, req)
      }
    } catch (e) {
      throw reporter.createError('Error while executing unoconv', {
        original: e,
        weak: true
      })
    }
  })
}
