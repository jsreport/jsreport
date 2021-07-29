const path = require('path')
const fs = require('fs')
const childProcess = require('child_process')
const should = require('should')
const Winser = require('winser-with-api').Winser

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

describe('win-uninstall command', function () {
  it('should not work on empty directory', async () => {
    const dirName = 'win-uninstall-empty'

    const fullPathToTempProject = getTempDir(`${dirName}/project`)

    await setup(dirName)

    createTempDir(`${dirName}/project`)

    const uninstallPromise = exec(dirName, 'win-uninstall', {
      cwd: fullPathToTempProject
    })

    if (IS_WINDOWS) {
      return should(uninstallPromise).be.rejected()
    }

    const { stdout } = await uninstallPromise

    should(stdout).containEql('only works on windows platforms')
  })

  it('should not work on directory with package.json without name field', async () => {
    const dirName = 'win-uninstall-packagejson-only'

    const fullPathToTempProject = getTempDir(`${dirName}/project`)

    await setup(dirName)

    createTempDir(`${dirName}/project`)

    fs.writeFileSync(
      path.join(fullPathToTempProject, './package.json'),
      JSON.stringify({
        description: 'example project'
      }, null, 2)
    )

    const uninstallPromise = exec(dirName, 'win-uninstall', {
      cwd: fullPathToTempProject
    })

    if (IS_WINDOWS) {
      return should(uninstallPromise).be.rejected()
    }

    const { stdout } = await uninstallPromise

    should(stdout).containEql('only works on windows platforms')
  })

  it.skip('should uninstall windows service', async () => {
    const dirName = 'win-uninstall-packagejson-ok'

    const fullPathToTempProject = getTempDir(`${dirName}/project`)

    await setup(dirName)

    createTempDir(`${dirName}/project`)

    const serviceName = 'jsreport-server-for-cli-uninstall'

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

    if (!IS_WINDOWS) {
      return
    }

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

    console.log('installing app in', fullPathToTempProject, 'as windows service for the test case..')

    const winser = Winser()

    await new Promise((resolve, reject) => {
      winser.install({
        path: fullPathToTempProject
      }, (error) => {
        if (error) {
          error.message = `Error while trying to install windows service: ${error.message}`
          return reject(error)
        }

        resolve()
      })
    })

    const { stdout } = await exec(dirName, 'win-uninstall', {
      cwd: fullPathToTempProject
    })

    should(stdout).containEql(`Windows service "${serviceName}" uninstalled`)

    await new Promise((resolve, reject) => {
      childProcess.exec(`sc query "${serviceName}"`, {
        cwd: fullPathToTempProject
      }, (error, stdout) => {
        if (error) {
          return resolve()
        }

        return reject(new Error(`service ${serviceName} should have been uninstalled`))
      })
    })
  })
})
