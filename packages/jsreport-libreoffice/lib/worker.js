const path = require('path')
const mime = require('mime')
const util = require('util')
const { spawn, exec } = require('child_process')
const execAsync = util.promisify(exec)
const url = require('url')
const fs = require('fs').promises

module.exports = function (reporter, definition) {
  reporter.beforeRenderListeners.insert(0, 'libreoffice', (req, res) => {
    // otherwise the output is html for office online
    if (req.template.libreOffice && req.template.libreOffice.enabled !== false && req.template.libreOffice.format) {
      req.options.preview = false
    }
  })

  let sofficePath
  let libreOfficeProfile

  reporter.afterRenderListeners.insert({ before: 'scripts' }, 'libreoffice', async (req, res) => {
    if (!req.template.libreOffice || req.template.libreOffice.enabled === false || (!req.template.libreOffice.format && !req.template.libreOffice.print) || req.context.isChildRequest) {
      return
    }

    await sofficeCommand({
      format: req.template.libreOffice.format,
      printer: req.template.libreOffice.print,
      source: { res }
    }, req)
  })

  reporter.extendProxy((proxy, req, { sandboxRequire }) => {
    proxy.libreOffice = {
      async convert (content, format) {
        return sofficeCommand({
          format,
          source: {
            content
          }
        }, req)
      },
      async print (content, printer) {
        return sofficeCommand({
          printer,
          source: {
            content
          }
        }, req)
      }
    }
  })

  async function sofficeCommand ({
    printer,
    format,
    source
  }, req) {
    const profilerEvent = reporter.profiler.emit({
      type: 'operationStart',
      subtype: 'libreoffice',
      name: 'libreoffice ' + (printer ? `print ${printer}` : `convert ${format}`),
      doDiffs: false
    }, req)

    if (sofficePath == null) {
      if (definition.options.sofficePath) {
        sofficePath = definition.options.sofficePath
      } else {
        reporter.logger.debug('Searching for soffice path', req)
        sofficePath = await getSofficePath()
      }
    }

    if (libreOfficeProfile == null) {
      libreOfficeProfile = path.join(reporter.options.tempDirectory, 'libreoffice', `profile-${reporter.workerId}`)
      try {
        reporter.logger.debug('Creating libreoffice profile at ' + libreOfficeProfile, req)
        await execAsync(`"${sofficePath}" --convert-to pdf ${reporter.options.tempDirectory} --headless -env:UserInstallation=${url.pathToFileURL(libreOfficeProfile)} --outdir ${reporter.options.tempDirectory}`)
      } catch (e) {
        // the first render always fail because of missing profile for some reason
      }
    }

    try {
      const fileExtension = source.fileExtension

      let outputFilename
      let pathToFile
      if (source.res) {
        pathToFile = (await source.res.output.writeToTempFile((uuid) => {
          outputFilename = uuid + '.' + format
          return `${uuid}.${fileExtension}`
        })).pathToFile
      } else {
        pathToFile = (await reporter.writeTempFile((uuid) => {
          outputFilename = uuid + '.' + format
          return `${uuid}.${fileExtension}`
        }, source.content)).pathToFile
      }

      await new Promise((resolve, reject) => {
        const stdout = []
        const stderr = []
        let failed = false

        const args = []

        if (printer) {
          args.push('--pt', printer)
        } else {
          args.push('--convert-to', format)
        }

        args.push(pathToFile)
        args.push('--headless')
        args.push(`-env:UserInstallation=${url.pathToFileURL(libreOfficeProfile)}`)

        if (!printer) {
          args.push('--outdir', path.dirname(pathToFile))
        }

        reporter.logger.debug(`libreoffice command ${sofficePath} ${args.join(' ')}`, req)
        const childProcess = spawn(sofficePath, args)

        childProcess.stdout.on('data', (data) => {
          stdout.push(data)
        })

        childProcess.stderr.on('data', (data) => {
          stderr.push(data)
        })

        childProcess.on('close', async (code) => {
          if (!failed) {
            if (stderr.length) {
              return reject(new Error(Buffer.concat(stderr).toString('utf8')))
            }
            resolve()
          }
        })

        childProcess.on('error', (err) => {
          failed = true
          reject(err)
        })

        return childProcess
      })

      reporter.profiler.emit({
        type: 'operationEnd',
        operationId: profilerEvent.operationId,
        doDiffs: false
      }, req)

      if (!printer) {
        if (source.res) {
          await source.res.output.update(path.join(path.dirname(pathToFile), outputFilename))

          source.res.meta.fileExtension = req.template.libreOffice.format
          source.res.meta.contentType = mime.getType(req.template.libreOffice.format)
        } else {
          return {
            content: await fs.readFile(path.join(path.dirname(pathToFile), outputFilename)),
            fileExtension: format
          }
        }
      }
    } catch (e) {
      throw reporter.createError('Error while executing LibreOffice', {
        original: e,
        weak: true
      })
    }
  }

  const getSofficePath = async () => {
    const getEnvVarKey = (key) => {
      const upperKey = key.toUpperCase()
      return Object.keys(process.env).find(k => k.toUpperCase() === upperKey)
    }

    const paths = (() => {
      switch (process.platform) {
        case 'darwin':
          return '/Applications/LibreOffice.app/Contents/MacOS/soffice'
        case 'linux':
          return [
            '/usr/bin/libreoffice',
            '/usr/bin/soffice',
            '/snap/bin/libreoffice',
            '/opt/libreoffice/program/soffice',
            '/opt/libreoffice7.6/program/soffice'
          ]
        case 'win32': {
          const programFilesEnvKey = getEnvVarKey('ProgramFiles')
          const programFilesX86EnvKey = getEnvVarKey('ProgramFiles(x86)')
          return [
            programFilesEnvKey ? path.join(process.env[programFilesEnvKey], 'LibreOffice/program/soffice.exe') : null,
            programFilesX86EnvKey ? path.join(process.env[programFilesX86EnvKey], 'LIBREO~1/program/soffice.exe') : null,
            programFilesX86EnvKey ? path.join(process.env[programFilesX86EnvKey], 'LibreOffice/program/soffice.exe') : null
          ]
        }
      }
    }
    )().filter(p => p)

    for (const p of paths) {
      try {
        await fs.access(p)
        return p
      } catch (e) {

      }
    }

    throw reporter.createError('Could not find soffice binary on paths ' + paths.join(', '), {
      weak: true
    })
  }
}
