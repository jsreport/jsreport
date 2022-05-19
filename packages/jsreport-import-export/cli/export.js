const path = require('path')
const fs = require('fs')
const doRequest = require('./doRequest')
const normalizePath = require('./normalizePath')

const description = 'Export the entities of the specified jsreport instance into an export file'
const command = 'export'
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
    entitiesPath: {
      alias: 'f',
      description: 'Only include in the export the specified entities of this json file',
      type: 'string',
      requiresArg: true
    },
    entities: {
      alias: 'e',
      description: 'Only include in the export the specified entities',
      type: 'array',
      requiresArg: true
    }
  }

  const options = Object.keys(commandOptions)

  return (
    yargs
      .usage(`${description}\n\n${getUsage(`jsreport ${command}`)}`)
      .positional('exportFile', {
        type: 'string',
        description: 'Absolute or relative path to the export file that will be created as the result of the export'
      })
      .group(options, 'Command options:')
      .options(commandOptions)
      .check((argv) => {
        if (!argv || !argv.exportFile) {
          throw new Error('"exportFile" argument is required')
        }

        if (!argv.exportFile.endsWith('.jsrexport')) {
          throw new Error('"exportFile" argument should have .jsrexport extension')
        }

        argv.exportFile = normalizePath(argv.context.cwd, 'exportFile', argv.exportFile, {
          type: 'argument',
          read: false,
          strict: true
        })

        if (argv.user && !argv.serverUrl) {
          throw new Error('user option needs to be used with --serverUrl option')
        }

        if (argv.user && !argv.password) {
          throw new Error('user option needs to be used with --password option')
        }

        if (argv.password && !argv.user) {
          throw new Error('password option needs to be used with --user option')
        }

        if (argv.entitiesPath != null && argv.entities != null) {
          throw new Error('entitiesPath option can\'t be used at the same time that the --entities option')
        }

        if (argv.entities != null && !Array.isArray(argv.entities)) {
          throw new Error('entities option should be an array of entities id')
        }

        if (argv.entitiesPath != null) {
          argv.entitiesPath = normalizePath(argv.context.cwd, 'entitiesPath', argv.entitiesPath, {
            read: true,
            json: true,
            strict: true
          })

          if (!Array.isArray(argv.entitiesPath)) {
            throw new Error('entitiesPath option should specify a json file that contain an array of entities id')
          }
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
    logger.info(`starting export ${
      options.export && options.export.selection ? ` (entities: ${options.export.selection.join(', ')})` : '(all entities)'
    } in ${argv.serverUrl}..`)

    try {
      const result = await startExport(null, {
        logger,
        exportOptions: options.export,
        output: exportFilePath,
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

    logger.info(`starting export ${
      options.export && options.export.selection ? ` (entities: ${options.export.selection.join(', ')})` : '(all entities)'
    } in local instance..`)

    return (await startExport(jsreportInstance, {
      logger,
      exportOptions: options.export,
      output: exportFilePath
    }))
  } catch (e) {
    return onCriticalError(e)
  }

  function onCriticalError (err) {
    err.message = `A critical error occurred while trying to execute the ${command} command: ${err.message}`
    throw err
  }
}

async function startExport (jsreportInstance, { remote, exportOptions, output, logger }) {
  let result

  if (remote) {
    logger.debug('remote server options:')
    logger.debug(remote)
  }

  logger.debug('exporting with options:')
  logger.debug(JSON.stringify(exportOptions, null, 2))

  if (remote) {
    try {
      const baseUrl = new URL(remote.url)

      const reqOpts = {
        url: new URL(path.posix.join(baseUrl.pathname, 'api/export'), baseUrl).toString(),
        method: 'POST',
        data: exportOptions,
        responseType: 'stream'
      }

      if (remote.user || remote.password) {
        reqOpts.auth = {
          username: remote.user,
          password: remote.password
        }
      }

      const response = await doRequest(reqOpts)

      result = await saveResponse(logger, response.data, output)

      if (response.headers && response.headers['export-entities-count'] != null) {
        result.entitiesCount = JSON.parse(response.headers['export-entities-count'])
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
        throw onExportError(customError, logger)
      }

      throw err
    }
  } else {
    try {
      const exportResult = await jsreportInstance.export(exportOptions != null ? exportOptions.selection : undefined, jsreportInstance.Request({}))
      const exportResultIsStream = typeof exportResult === 'object' && typeof exportResult.pipe === 'function'

      // compatibility with older versions
      result = await saveResponse(logger, exportResultIsStream ? exportResult : exportResult.stream, output)

      if (!exportResultIsStream && exportResult.entitiesCount != null) {
        result.entitiesCount = exportResult.entitiesCount
      }
    } catch (err) {
      throw onExportError(err, logger)
    }
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
      logger.info(`exported by entitySet: ${entityCountPerSet.join(', ')}`)
    }

    logger.info(`total entities exported: ${count}`)
  }

  logger.info('export finished')

  return result
}

async function saveResponse (logger, stream, output) {
  const outputStream = writeFileFromStream(stream, output)

  return new Promise((resolve, reject) => {
    listenOutputStream(logger, outputStream, () => {
      return resolve({
        output: output
      })
    }, reject)
  })
}

function listenOutputStream (logger, outputStream, onFinish, onError) {
  outputStream.on('finish', () => {
    logger.info('exporting has finished successfully and saved in:', outputStream.path)
    onFinish()
  })

  outputStream.on('error', (err) => {
    onError(onExportError(err, logger))
  })
}

function writeFileFromStream (stream, output) {
  const outputStream = fs.createWriteStream(output)

  stream.pipe(outputStream)

  return outputStream
}

function onExportError (error, logger) {
  logger.error('exporting has finished with errors:')
  return error
}

function getOptions (argv) {
  const exportOpts = {}
  let remote = null

  if (argv.entities) {
    exportOpts.selection = argv.entities
  } else if (argv.entitiesPath) {
    exportOpts.selection = argv.entitiesPath
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
    export: exportOpts,
    remote
  }
}

function getUsage (command) {
  return [
    'Usage:\n',
    `${command} <exportFile>`,
    `${command} <exportFile> --serverUrl=<url>`,
    `${command} <exportFile> --serverUrl=<url> --user=<user> --password=<password>`,
    `${command} <exportFile> --entities entity1Id --entities entity2Id`,
    `${command} <exportFile> --entitiesPath entities.json`
  ].join('\n')
}

function getExamples (command) {
  return [
    [`${command} export.jsrexport`, 'Export all the entities of the local instance into an export file'],
    [`${command} export.jsrexport --serverUrl=http://jsreport-host.com`, 'Export all the entities of the jsreport instance at http://jsreport-host.com into an export file'],
    [`${command} export.jsrexport --serverUrl=http://jsreport-host.com --user admin --password xxxx`, 'Export all the entities of the authenticated jsreport instance at http://jsreport-host.com into an export file'],
    [`${command} export.jsrexport --entities entity1Id --entities entity2Id`, 'Export just the selected entities of the local instance into an export file'],
    [`${command} export.jsrexport --entitiesPath entities.json`, 'Export just the selected entities (specified in a json file) of the local instance into an export file']
  ]
}
