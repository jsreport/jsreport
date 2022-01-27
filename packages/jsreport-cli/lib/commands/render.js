const util = require('util')
const fs = require('fs')
const jsreportClient = require('@jsreport/nodejs-client')
const normalizePathOptionOrArg = require('../utils/normalizePathOptionOrArg')

const writeFileAsync = util.promisify(fs.writeFile)

const description = 'Invoke a rendering process'
const command = 'render'

exports.command = command
exports.description = description

exports.builder = (yargs) => {
  const cwd = process.cwd()

  const commandOptions = {
    request: {
      alias: 'r',
      description: 'Specifies a path to a json file containing option for the entire rendering request',
      requiresArg: true
    },
    keepAlive: {
      alias: 'k',
      description: 'Specifies that the process should stay open (handled by the maintainer) for future renders',
      type: 'boolean'
    },
    template: {
      alias: 't',
      description: 'Specifies a path to a json file containing options for template input or you can specify singular options doing --template.[option_name] value',
      requiresArg: true
    },
    data: {
      alias: 'd',
      description: 'Specifies a path to a json file containing options for data input',
      requiresArg: true
    },
    out: {
      alias: 'o',
      description: 'Save rendering result into a file path',
      type: 'string',
      demandOption: true,
      requiresArg: true
    },
    meta: {
      alias: 'm',
      description: 'Save response meta information into a file path',
      type: 'string',
      demandOption: false,
      requiresArg: true
    }
  }

  const options = Object.keys(commandOptions)

  const examples = getExamples('jsreport ' + command)

  examples.forEach((examp) => {
    yargs.example(examp[0], examp[1])
  })

  return (
    yargs
      .usage(`${description}\n\n${getUsage('jsreport ' + command)}`)
      .group(options, 'Command options:')
      .options(commandOptions)
      .middleware((argv) => {
        if (argv.request != null) {
          argv.request = normalizePathOptionOrArg(cwd, 'request', argv.request, { json: true, strict: true })
        }

        if (argv.template != null) {
          if (typeof argv.template !== 'string') {
            if (argv.template.content != null) {
              argv.template.content = normalizePathOptionOrArg(cwd, 'template.content', argv.template.content, { strict: true })
            }

            if (argv.template.helpers != null) {
              argv.template.helpers = normalizePathOptionOrArg(cwd, 'template.helpers', argv.template.helpers, { strict: true })
            }
          } else {
            argv.template = normalizePathOptionOrArg(cwd, 'template', argv.template, { json: true, strict: true })
          }
        }

        if (argv.data != null) {
          argv.data = normalizePathOptionOrArg(cwd, 'data', argv.data, { json: true, strict: false })
        }

        if (argv.out != null) {
          argv.out = normalizePathOptionOrArg(cwd, 'out', argv.out, { read: false, strict: true })
        }

        if (argv.meta != null) {
          argv.meta = normalizePathOptionOrArg(cwd, 'meta', argv.meta, { read: false, strict: true })
        }
      }, true)
      .check((argv, hash) => {
        if (argv.user && !argv.serverUrl) {
          throw new Error('user option needs to be used with --serverUrl option')
        }

        if (argv.password && !argv.serverUrl) {
          throw new Error('password option needs to be used with --serverUrl option')
        }

        if (argv.user && !argv.password) {
          throw new Error('user option needs to be used with --password option')
        }

        if (argv.password && !argv.user) {
          throw new Error('password option needs to be used with --user option')
        }

        if (!argv.request && !argv.template) {
          throw new Error('render command need at least --request or --template option')
        }

        return true
      })
  )
}

exports.configuration = {
  globalOptions: ['serverUrl', 'user', 'password']
}

exports.handler = async (argv) => {
  const output = argv.out
  const meta = argv.meta
  const context = argv.context
  const logger = context.logger
  const verbose = argv.verbose
  const options = getOptions(argv)

  // connect to a remote server
  if (argv.serverUrl) {
    logger.info('starting rendering process in ' + argv.serverUrl + '..')

    try {
      const result = await startRender(null, {
        logger: logger,
        request: options.render,
        meta: meta,
        output: output,
        remote: options.remote
      })
      result.fromRemote = true
      return result
    } catch (e) {
      return onCriticalError(e)
    }
  }

  const cwd = context.cwd
  const sockPath = context.sockPath
  const workerSockPath = context.workerSockPath
  const getInstance = context.getInstance
  const initInstance = context.initInstance
  const daemonExec = context.daemonExec
  const daemonHandler = context.daemonHandler
  const keepAliveProcess = context.keepAliveProcess
  const findProcessByCWD = daemonHandler.findProcessByCWD

  // start a new daemonized process and then connect to it
  // to render
  if (argv.keepAlive) {
    logger.debug('looking for previously daemonized instance in:', workerSockPath, 'cwd:', cwd)

    // first, try to look up if there is an existing process
    // "daemonized" before in the CWD
    let processInfo

    try {
      processInfo = await findProcessByCWD(workerSockPath, cwd)
    } catch (processLookupErr) {
      return onCriticalError(processLookupErr)
    }

    // if process was found, just connect to it,
    // otherwise just continue processing
    if (processInfo) {
      logger.debug('using instance daemonized previously (pid: ' + processInfo.pid + ')..')

      const adminAuthentication = processInfo.adminAuthentication || {}

      try {
        const result = await startRender(null, {
          logger: logger,
          request: options.render,
          output: output,
          meta: meta,
          remote: {
            url: processInfo.url,
            user: adminAuthentication.username,
            password: adminAuthentication.password
          }
        })

        result.fromDaemon = true
        return result
      } catch (e) {
        return onCriticalError(e)
      }
    }

    logger.debug('there is no previously daemonized instance in:', workerSockPath, 'cwd:', cwd)

    let childProc

    try {
      // we try to start the daemon process
      processInfo = await keepAliveProcess({
        daemonExec: daemonExec,
        mainSockPath: sockPath,
        workerSockPath: workerSockPath,
        cwd: cwd,
        verbose: verbose
      })

      const remoteUrl = processInfo.url
      const adminAuthentication = processInfo.adminAuthentication || {}

      childProc = processInfo.proc

      logger.info(`instance has been daemonized and initialized successfully${childProc == null ? '*' : ''} (pid: ${processInfo.pid})`)

      const result = await startRender(null, {
        logger: logger,
        request: options.render,
        output: output,
        meta: meta,
        remote: {
          url: remoteUrl,
          user: adminAuthentication.username,
          password: adminAuthentication.password
        }
      })

      // make sure to unref() the child process after the first render
      // to allow the exit of the current process
      if (childProc) {
        childProc.unref()
      }

      if (childProc) {
        result.daemonProcess = processInfo
      }

      result.fromDaemon = true

      return result
    } catch (err) {
      if (childProc) {
        childProc.unref()
      }

      return onCriticalError(err)
    }
  }

  try {
    // look up for an instance in CWD
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
    jsreportInstance.options.extensions.express = Object.assign(
      {},
      jsreportInstance.options.extensions.express,
      { enabled: false }
    )

    await initInstance(jsreportInstance)

    logger.info('starting rendering process..')

    logger.debug('Output configured to:', output)

    if (meta) {
      logger.debug('Meta configured to:', meta)
    }

    return (await startRender(jsreportInstance, {
      logger: logger,
      request: options.render,
      output: output,
      meta: meta
    }))
  } catch (e) {
    return onCriticalError(e)
  }

  function onCriticalError (err) {
    const error = new Error(`A critical error occurred while trying to execute the ${command} command`)
    error.originalError = err
    throw error
  }
}

async function startRender (jsreportInstance, { remote, request, output, meta, logger }) {
  if (remote) {
    logger.debug('remote server options:')
    logger.debug(JSON.stringify(remote, null, 2))
  }

  logger.debug('rendering with options:')
  logger.debug(JSON.stringify(request, null, 2))

  if (remote) {
    try {
      const response = await jsreportClient(remote.url, remote.user, remote.password).render(request)
      return (await saveResponse(logger, response, response.headers, output, meta, remote))
    } catch (err) {
      let customError

      if (err.remoteStack) {
        // delete extra noise in the error message (the remoteStack is already on err.stack)
        delete err.remoteStack
      }

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
        throw onRenderingError(customError, logger)
      }

      throw onRenderingError(err, logger)
    }
  }

  try {
    const out = await jsreportInstance.render(request)
    return (await saveResponse(logger, out.stream, out.meta, output, meta))
  } catch (err) {
    throw onRenderingError(err, logger)
  }
}

async function saveResponse (logger, stream, metaData, output, meta, remote) {
  const outputStream = writeFileFromStream(stream, output)

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    listenOutputStream(outputStream, logger, () => {
      if (!meta) {
        return resolve({
          output: output
        })
      }

      const responseMeta = JSON.stringify(remote ? responseHeadersToMetaPOCO(metaData) : metaData)

      logger.debug('saving response meta: ' + responseMeta)

      writeFileAsync(meta, responseMeta, 'utf8').then(() => {
        resolve({
          output: output,
          meta: meta
        })
      }).catch(reject)
    }, reject)
  })
}

function responseHeadersToMetaPOCO (headers) {
  const meta = {}

  for (const property in headers) {
    if (Object.prototype.hasOwnProperty.call(headers, property)) {
      const val = headers[property]
      let p = property.replace(/-.{1}/g, (s) => s[1].toUpperCase())

      p = p[0].toLowerCase() + p.substring(1)
      meta[p] = val
    }
  }

  return meta
}

function listenOutputStream (outputStream, logger, onFinish, onError) {
  let writeFinished = false
  let error = false

  outputStream.on('finish', () => {
    writeFinished = true
  })

  outputStream.on('close', () => {
    if (writeFinished && !error) {
      logger.info('rendering has finished successfully and saved in:', outputStream.path)
      onFinish()
    }
  })

  outputStream.on('error', (err) => {
    error = true
    onError(onRenderingError(err, logger))
  })
}

function writeFileFromStream (stream, output) {
  const outputStream = fs.createWriteStream(output)

  stream.pipe(outputStream)

  return outputStream
}

function onRenderingError (error, logger) {
  logger.error('rendering has finished with errors:')
  return error
}

function getOptions (argv) {
  const renderingOpts = argv.request || {}
  let remote = null

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

  if (argv.template) {
    renderingOpts.template = Object.assign({}, renderingOpts.template, argv.template)
  }

  if (argv.data) {
    renderingOpts.data = Object.assign({}, renderingOpts.data, argv.data)
  }

  return {
    render: renderingOpts,
    remote: remote
  }
}

function getUsage (command) {
  return [
    `Usage:\n\n${command} --request <file> --out <file>`,
    `${command} --template <file> --out <file>`,
    `${command} --template <file> --data <file> --out <file>`,
    `${command} --template <file> --out <file> --meta <file>`
  ].join('\n')
}

function getExamples (command) {
  return [
    [`${command} --request request.json --out output.pdf`, 'Start rendering with options in request.json'],
    [`${command} --template template.json --out output.pdf`, 'Start rendering with options for template input in template.json'],
    [`${command} --template.recipe phantom-pdf --template.engine handlebars --template.content template.html --out output.pdf`, 'Start rendering with inline options for template input'],
    [`${command} --template template.json --data data.json --out output.pdf`, 'Start rendering with options for template and data input']
  ]
}
