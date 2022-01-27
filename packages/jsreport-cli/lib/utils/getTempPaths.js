const path = require('path')
const fs = require('fs')
const os = require('os')

module.exports = () => {
  const useCustomTempDirectory = process.env.cli_tempDirectory != null
  const useCustomSocketDirectory = process.env.cli_socketsDirectory != null
  const ROOT_PATH = !useCustomTempDirectory ? path.join(os.tmpdir(), 'jsreport') : process.env.cli_tempDirectory
  const CLI_PATH = path.join(ROOT_PATH, 'cli')
  const MAIN_SOCK_PATH = !useCustomSocketDirectory ? path.join(CLI_PATH, 'sock') : process.env.cli_socketsDirectory
  const WORKER_SOCK_PATH = path.join(path.dirname(MAIN_SOCK_PATH), 'wSock')

  return {
    useCustomSocketDirectory,
    rootPath: ROOT_PATH,
    cliPath: CLI_PATH,
    mainSockPath: MAIN_SOCK_PATH,
    workerSockPath: WORKER_SOCK_PATH,
    createPaths: () => {
      if (!useCustomSocketDirectory) {
        tryCreate(ROOT_PATH)
        tryCreate(CLI_PATH)
      }

      tryCreate(MAIN_SOCK_PATH)
      tryCreate(WORKER_SOCK_PATH)
    }
  }
}

function tryCreate (dir) {
  try {
    fs.mkdirSync(dir, '0755')
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }
  }
}
