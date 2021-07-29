const path = require('path')
const fs = require('fs')
const childProcess = require('child_process')
const should = require('should')

const IS_WINDOWS = process.platform === 'win32'

const { getTempDir, createTempDir, setup, exec } = require('../testUtils')({
  cliModuleName: path.join(__dirname, '../../'),
  baseDir: path.join(__dirname, '../temp'),
  rootDirectory: path.join(__dirname, '../../'),
  defaultExtensions: [
    'jsreport-fs-store'
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

describe('win-install command', function () {
  it('should not work on empty directory', async () => {
    const dirName = 'win-install-empty'

    const fullPathToTempProject = getTempDir(`${dirName}/project`)

    await setup(dirName)

    createTempDir(`${dirName}/project`)

    const installPromise = exec(dirName, 'win-install', {
      cwd: fullPathToTempProject
    })

    if (IS_WINDOWS) {
      return should(installPromise).be.rejected()
    }

    const { stdout } = await installPromise

    should(stdout).containEql('only works on windows platforms')
  })

  it('should not work on directory with package.json without name field', async () => {
    const dirName = 'win-install-packagejson-only'

    const fullPathToTempProject = getTempDir(`${dirName}/project`)

    await setup(dirName)

    createTempDir(`${dirName}/project`)

    fs.writeFileSync(
      path.join(fullPathToTempProject, './package.json'),
      JSON.stringify({
        description: 'example project'
      }, null, 2)
    )

    const installPromise = exec(dirName, 'win-install', {
      cwd: fullPathToTempProject
    })

    if (IS_WINDOWS) {
      return should(installPromise).be.rejected()
    }

    const { stdout } = await installPromise

    should(stdout).containEql('only works on windows platforms')
  })

  it('should not work on directory with package.json without main or scripts field', async () => {
    const dirName = 'win-install-packagejson-without-entry'

    const fullPathToTempProject = getTempDir(`${dirName}/project`)

    await setup(dirName)

    createTempDir(`${dirName}/project`)

    fs.writeFileSync(
      path.join(fullPathToTempProject, './package.json'),
      JSON.stringify({
        name: 'example project'
      }, null, 2)
    )

    const installPromise = exec(dirName, 'win-install', {
      cwd: fullPathToTempProject
    })

    if (IS_WINDOWS) {
      return should(installPromise).be.rejected()
    }

    const { stdout } = await installPromise

    should(stdout).containEql('only works on windows platforms')
  })

  it.skip('should install windows service', async () => {
    const dirName = 'win-install-packagejson-ok'

    const fullPathToTempProject = getTempDir(`${dirName}/project`)

    await setup(dirName)

    createTempDir(`${dirName}/project`)

    const serviceName = 'jsreport-server-for-cli-testing'

    fs.writeFileSync(
      path.join(fullPathToTempProject, './package.json'),
      JSON.stringify({
        name: serviceName,
        main: 'server.js'
      }, null, 2)
    )

    fs.writeFileSync(
      path.join(fullPathToTempProject, './server.js'),
      'setInterval(() => {}, 2000)'
    )

    if (IS_WINDOWS) {
      console.log(`ensuring windows service "${serviceName}" doest not exists first..`)

      await new Promise((resolve, reject) => {
        childProcess.exec(`sc stop "${serviceName}"`, {
          cwd: fullPathToTempProject
        }, () => {
          childProcess.exec(`sc delete "${serviceName}"`, {
            cwd: fullPathToTempProject
          }, function () {
            resolve()
          })
        })
      })
    }

    const installPromise = exec(dirName, 'win-install', {
      cwd: fullPathToTempProject
    })

    if (!IS_WINDOWS) {
      const { stdout } = await installPromise

      return should(stdout).containEql('only works on windows platforms')
    } else {
      await installPromise
    }

    const serviceStdout = await new Promise((resolve, reject) => {
      childProcess.exec(`sc query "${serviceName}"`, {
        cwd: fullPathToTempProject
      }, (error, stdout) => {
        if (error) {
          return reject(error)
        }
        resolve(stdout)
      })
    })

    if (serviceStdout) {
      should(serviceStdout.indexOf('RUNNING') !== -1).be.eql(true)
    } else {
      throw new Error(`Can't detect is service is running or not`)
    }

    console.log(`uninstalling service "${serviceName}" after test case has finished..`)

    await new Promise((resolve, reject) => {
      childProcess.exec(`sc stop "${serviceName}"`, {
        cwd: fullPathToTempProject
      }, () => {
        childProcess.exec(`sc delete "${serviceName}"`, {
          cwd: fullPathToTempProject
        }, function () {
          resolve()
        })
      })
    })
  })
})
