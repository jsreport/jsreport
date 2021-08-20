const path = require('path')
const should = require('should')
const keepAliveProcess = require('../../lib/keepAliveProcess')

const { getTempDir, createTempDir, setup, exec } = require('../testUtils')({
  cliModuleName: path.join(__dirname, '../../'),
  baseDir: path.join(__dirname, '../temp'),
  rootDirectory: path.join(__dirname, '../../'),
  defaultExtensions: [
    '@jsreport/jsreport-fs-store'
  ],
  defaultOpts: {
    store: {
      provider: 'fs'
    }
  },
  deps: {
    extend: require('node.extend.without.arrays'),
    mkdirp: require('mkdirp'),
    rimraf: require('rimraf'),
    execa: require('execa')
  }
})

describe('kill command', () => {
  const dirName = 'kill-project'

  describe('when there is no daemon instance running', () => {
    beforeEach(async () => {
      await setup(dirName)
    })

    it('should fail searching daemon by current working directory', () => {
      return should(exec(dirName, 'kill')).be.rejectedWith(/there is no active daemon process in/)
    })

    it('should fail searching daemon by identifier', () => {
      return should(exec(dirName, 'kill zzzzzzzzzz')).be.rejectedWith(/there is no active daemon with id/)
    })
  })

  describe('when there is daemon instance running', () => {
    let localPathToSocketDir
    let childInfo
    let child

    beforeEach(async () => {
      await setup(dirName, ['@jsreport/jsreport-express'], undefined, {
        httpPort: 9487
      })

      console.log('spawning a daemon jsreport instance for the test suite..')

      const pathToTempProject = getTempDir(dirName)

      localPathToSocketDir = createTempDir(`${dirName}/sock`)

      const localPathToWorkerSocketDir = createTempDir(`${dirName}/wSock`)

      // needed for launching instance that read deps from jsreport-cli/node_modules
      // and if not found continue searching node_modules to top level folders
      process.env.cli_instance_lookup_fallback = 'enabled'

      const info = await keepAliveProcess({
        mainSockPath: localPathToSocketDir,
        workerSockPath: localPathToWorkerSocketDir,
        cwd: pathToTempProject
      })

      delete process.env.cli_instance_lookup_fallback

      console.log('daemonized jsreport instance is ready..')

      childInfo = info
      child = info.proc
    })

    afterEach(() => {
      if (child) {
        child.kill()
      }
    })

    it('should kill by current working directory', async () => {
      const { stdout } = await exec(dirName, 'kill', {
        env: {
          cli_socketsDirectory: localPathToSocketDir
        }
      })

      should(stdout).containEql(`daemon process (pid: ${childInfo.pid}) killed successfully`)
    })

    it('should kill once (and other calls fail) when concurrent calls are made', async () => {
      const concurrentCalls = 5
      const kills = []

      for (let i = 0; i < concurrentCalls; i++) {
        kills.push(
          exec(dirName, 'kill --verbose', {
            env: {
              cli_socketsDirectory: localPathToSocketDir
            }
          }).then((result) => {
            return { ok: result }
          }).catch((err) => {
            return { error: err }
          })
        )
      }

      const results = await Promise.all(kills)

      const failed = results.filter((r) => r.error != null)

      should(failed.length).be.eql(concurrentCalls - 1)
    })

    it('should kill by process id', async () => {
      const { stdout } = await exec(dirName, `kill ${childInfo.pid}`, {
        env: {
          cli_socketsDirectory: localPathToSocketDir
        }
      })

      should(stdout).containEql(`daemon process (pid: ${childInfo.pid}) killed successfully`)
    })

    it('should kill by uid', async () => {
      const { stdout } = await exec(dirName, `kill ${childInfo.uid}`, {
        env: {
          cli_socketsDirectory: localPathToSocketDir
        }
      })

      should(stdout).containEql(`searching for daemon process with id: ${childInfo.uid}`)
      should(stdout).containEql(`daemon process (pid: ${childInfo.pid}) killed successfully`)
    })
  })
})
