const description = 'Kill a daemon jsreport process'
const command = 'kill'
const positionalArgs = '[uidOrpid]'

exports.command = `${command} ${positionalArgs}`
exports.description = description

exports.builder = (yargs) => {
  return (
    yargs
      .usage(
        [
          `${description}\n`,
          `Usage:\n\njsreport ${command} [uidOrpid]\n`,
          'If uid or pid is not specified we will try to kill a daemon process that was started from CWD'
        ].join('\n')
      )
      .positional('uidOrpid', {
        type: 'string',
        description: 'Process id or uid of the instance to kill'
      })
  )
}

exports.handler = async (argv) => {
  const context = argv.context
  const logger = context.logger
  const cwd = context.cwd
  const workerSockPath = context.workerSockPath
  const daemonHandler = context.daemonHandler

  let identifier
  let processInfo

  if (argv && argv.uidOrpid != null) {
    identifier = argv.uidOrpid
  }

  if (!identifier) {
    logger.info('searching for daemon process in:', cwd)

    logger.debug('looking for previously daemonized process in:', workerSockPath, 'cwd:', cwd)

    processInfo = await daemonHandler.findProcessByCWD(workerSockPath, cwd)
  } else {
    logger.info('searching for daemon process with id:', identifier)

    processInfo = await daemonHandler.findProcessByUidOrPid(workerSockPath, identifier)
  }

  if (!processInfo) {
    let customError

    if (!identifier) {
      customError = new Error(`there is no active daemon process in: ${cwd}`)
    } else {
      customError = new Error(`there is no active daemon with id: ${identifier}`)
    }

    // makes the cli to print clean error (without stack trace)
    customError.cleanState = true

    throw customError
  }

  if (!identifier) {
    logger.debug('daemon process found in:', workerSockPath, 'cwd:', cwd, 'pid:', processInfo.pid)
  } else {
    logger.debug('daemon process found in:', workerSockPath, 'id:', identifier, 'pid:', processInfo.pid)
  }

  logger.debug('killing daemon process.. uid:', processInfo.uid, 'pid:', processInfo.pid)

  try {
    await daemonHandler.kill(processInfo)

    logger.info(`daemon process (pid: ${processInfo.pid}) killed successfully`)
  } catch (e) {
    const error = new Error('Error while trying to kill daemon process')
    error.originalError = e
    throw error
  }

  return processInfo
}
