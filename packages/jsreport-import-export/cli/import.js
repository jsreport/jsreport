const path = require('path')
const fs = require('fs')
const FormData = require('form-data')
const doRequest = require('./doRequest')
const normalizePath = require('./normalizePath')

const description = 'Import an export file with entities in the specified jsreport instance'
const command = 'import'
const positionalArgs = '[exportFile]'

exports.command = `${command} ${positionalArgs}`
exports.description = description

exports.configuration = {
  globalOptions: ['serverUrl', 'user', 'password']
}

exports.builder = (yargs) => {
  const examples = getExamples(`jsreport ${command}`)

  examples.forEach((example) => {
    yargs.example(example[0], example[1])
  })

  const commandOptions = {
    targetFolder: {
      alias: 't',
      description: 'The target folder shortid, the entities of the export file will be imported inside the specified folder',
      type: 'string',
      requiresArg: true
    },
    fullImport: {
      alias: 'f',
      description: 'Perform a full import, which means that after the import you will have only the entities that were present in the export file',
      type: 'boolean'
    },
    validation: {
      alias: 'd',
      description: 'Perform a just a validation, the import won\'t be done and the validation messages will be returned as the output',
      type: 'boolean'
    }
  }

  const options = Object.keys(commandOptions)

  return (
    yargs
      .usage(`${description}\n\n${getUsage(`jsreport ${command}`)}`)
      .positional('exportFile', {
        type: 'string',
        description: 'Absolute or relative path to the export file to import'
      })
      .group(options, 'Command options:')
      .options(commandOptions)
      .check((argv) => {
        if (!argv || !argv.exportFile) {
          throw new Error('"exportFile" argument is required')
        }

        if (!argv.exportFile.endsWith('.zip') && !argv.exportFile.endsWith('.jsrexport')) {
          throw new Error('"exportFile" argument should have .jsrexport or .zip extension')
        }

        argv.exportFile = normalizePath(argv.context.cwd, 'exportFile', argv.exportFile, {
          type: 'argument',
          read: false,
          strict: true
        })

        if (!fs.existsSync(argv.exportFile)) {
          throw new Error(`exportFile argument "${argv.exportFile}" points to a file that does not exists. make sure to specify an existing file`)
        }

        if (argv.user && !argv.serverUrl) {
          throw new Error('user option needs to be used with --serverUrl option')
        }

        if (argv.user && !argv.password) {
          throw new Error('user option needs to be used with --password option')
        }

        if (argv.password && !argv.user) {
          throw new Error('password option needs to be used with --user option')
        }

        if (argv.fullImport && argv.targetFolder != null) {
          throw new Error('fullImport option can\'t be used at the same time that the --targetFolder option')
        }

        return true
      })
  )
}

exports.handler = async (argv) => {
  const exportFilePath = argv.exportFile
  const context = argv.context
  const logger = context.logger
  const options = getOptions(argv)

  if (options.remote) {
    // connect to a remote server
    logger.info(`starting${options.import && options.import.validation ? ' validation' : ''} import${
      options.import && options.import.fullImport ? ' (full import)' : ''
    }${
      options.import && options.import.targetFolder ? ` (target folder: ${options.import.targetFolder})` : ''
    } in ${argv.serverUrl}..`)

    try {
      const result = await startImport(null, {
        logger,
        importOptions: options.import,
        input: exportFilePath,
        remote: options.remote
      })

      result.fromRemote = true

      return result
    } catch (e) {
      return onCriticalError(e)
    }
  }

  const cwd = context.cwd
  const getInstance = context.getInstance
  const initInstance = context.initInstance

  try {
    logger.debug('trying to start an instance in cwd:', cwd)

    const _instance = await getInstance(cwd)
    let jsreportInstance

    logger.debug('disabling express extension..')

    if (typeof _instance === 'function') {
      jsreportInstance = _instance()
    } else {
      jsreportInstance = _instance
    }

    jsreportInstance.options = jsreportInstance.options || {}
    jsreportInstance.options.extensions = jsreportInstance.options.extensions || {}
    jsreportInstance.options.extensions.express = { enabled: false }

    await initInstance(jsreportInstance)

    logger.info(`starting${options.import && options.import.validation ? ' validation' : ''} import${
      options.import && options.import.fullImport ? ' (full import)' : ''
    }${
      options.import && options.import.targetFolder ? ` (target folder: ${options.import.targetFolder})` : ''
    } in local instance..`)

    return (await startImport(jsreportInstance, {
      logger,
      importOptions: options.import,
      input: exportFilePath
    }))
  } catch (e) {
    return onCriticalError(e)
  }

  function onCriticalError (err) {
    err.message = `A critical error occurred while trying to execute the ${command} command: ${err.message}`
    throw err
  }
}

async function startImport (jsreportInstance, { remote, importOptions, input, logger }) {
  const result = {}

  if (remote) {
    logger.debug('remote server options:')
    logger.debug(remote)
  }

  logger.debug('importing with options:')
  logger.debug(JSON.stringify(importOptions, null, 2))

  if (remote) {
    try {
      const form = new FormData()

      form.append('import.jsrexport', fs.createReadStream(input))

      const formHeaders = await new Promise((resolve, reject) => {
        form.getLength((err, length) => {
          if (err) {
            return reject(err)
          }

          const headers = Object.assign({ 'Content-Length': length }, form.getHeaders())
          resolve(headers)
        })
      })

      const baseUrl = new URL(remote.url)

      const reqOpts = {
        url: new URL(path.posix.join(baseUrl.pathname, importOptions.validation ? 'api/validate-import' : 'api/import'), baseUrl).toString(),
        method: 'POST',
        headers: {
          // this sets the Content-type: multipart/form-data
          ...formHeaders
        },
        params: importOptions,
        data: form
      }

      if (remote.user || remote.password) {
        reqOpts.auth = {
          username: remote.user,
          password: remote.password
        }
      }

      const response = await doRequest(reqOpts)

      result.importLog = response.data.log

      if (response.headers && response.headers['import-entities-count'] != null) {
        result.entitiesCount = JSON.parse(response.headers['import-entities-count'])
      }
    } catch (err) {
      let customError

      if (err.code === 'ECONNREFUSED') {
        customError = new Error(`Couldn't connect to remote jsreport server in: ${
          remote.url
        } , Please verify that a jsreport server is running`)
      }

      if (!customError && err.response && err.response.statusCode != null) {
        if (err.response.statusCode === 404) {
          customError = new Error(`Couldn't connect to remote jsreport server in: ${
            remote.url
          } , Please verify that a jsreport server is running`)
        } else if (err.response.statusCode === 401) {
          customError = new Error(`Couldn't connect to remote jsreport server in: ${
            remote.url
          } , Authentication error, Please pass correct --user and --password options`)
        }
      }

      if (customError) {
        customError.originalError = err
        throw onImportError(customError, logger)
      }

      throw err
    }
  } else {
    try {
      let importResult

      if (importOptions.validation) {
        importResult = await jsreportInstance.importValidation(input, importOptions, jsreportInstance.Request({}))
      } else {
        importResult = await jsreportInstance.import(input, importOptions, jsreportInstance.Request({}))
      }

      // compatibility with older versions
      if (typeof importResult === 'string') {
        result.importLog = importResult
      } else {
        result.importLog = importResult.log
      }

      if (importResult.entitiesCount != null) {
        result.entitiesCount = importResult.entitiesCount
      }
    } catch (err) {
      throw onImportError(err, logger)
    }
  }

  if (result.importLog) {
    logger.info(`import${importOptions.validation ? ' validation' : ''} logs:`)
    logger.info('--------------------')
    logger.info(result.importLog)
    logger.info('--------------------')
  }

  if (result.entitiesCount) {
    let count = 0
    const entityCountPerSet = []

    result.entitiesCount = Object.keys(result.entitiesCount).reduce((acu, entitySet) => {
      const entitySetCount = result.entitiesCount[entitySet]

      if (entitySetCount > 0) {
        entityCountPerSet.push(`${entitySet} ${entitySetCount}`)
        count += entitySetCount
        acu[entitySet] = entitySetCount
      }

      return acu
    }, {})

    if (entityCountPerSet.length > 0) {
      logger.info(`${!importOptions.validation ? 'imported by ' : ''}entitySet${importOptions.validation ? ' in export file' : ''}: ${entityCountPerSet.join(', ')}`)
    }

    logger.info(`total entities ${importOptions.validation ? 'in export file' : 'imported'}: ${count}`)
  }

  logger.info(`import${importOptions.validation ? ' validation' : ''} finished`)

  return result
}

function onImportError (error, logger) {
  logger.error('importing has finished with errors:')
  return error
}

function getOptions (argv) {
  const importOpts = {}
  let remote = null

  if (argv.validation) {
    importOpts.validation = argv.validation
  }

  if (argv.targetFolder) {
    importOpts.targetFolder = argv.targetFolder
  }

  if (argv.fullImport) {
    importOpts.fullImport = argv.fullImport
  }

  if (argv.serverUrl) {
    remote = {
      url: argv.serverUrl
    }
  }

  if (argv.user && argv.serverUrl) {
    remote.user = argv.user
  }

  if (argv.password && argv.serverUrl) {
    remote.password = argv.password
  }

  return {
    import: importOpts,
    remote
  }
}

function getUsage (command) {
  return [
    'Usage:\n',
    `${command} <exportFile>`,
    `${command} <exportFile> --serverUrl=<url>`,
    `${command} <exportFile> --serverUrl=<url> --user=<user> --password=<password>`
  ].join('\n')
}

function getExamples (command) {
  return [
    [`${command} export.jsrexport`, 'Import the export file into the local instance'],
    [`${command} export.jsrexport --serverUrl=http://jsreport-host.com`, 'Import the export file into the jsreport instance at http://jsreport-host.com'],
    [`${command} export.jsrexport --serverUrl=http://jsreport-host.com --user admin --password xxxx`, 'Import the export file into the authenticated jsreport instance at http://jsreport-host.com'],
    [`${command} export.jsrexport --fullImport`, 'Execute a full import into the local instance'],
    [`${command} export.jsrexport --targetFolder=folderShortid`, 'Execute an import into a target folder, the entities of the export file will be imported inside the specified folder'],
    [`${command} export.jsrexport --validation`, 'Execute an import validation of the export file into the local instance, the import won\'t be done']
  ]
}
