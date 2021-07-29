const path = require('path')
const fs = require('fs')
const should = require('should')

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

describe('init command', function () {
  it('should initialize an empty directory', async function () {
    const dirName = 'init-empty'

    const fullPathToTempProject = getTempDir(`${dirName}/project`)

    await setup(dirName, [], getNpmInstallMock(fullPathToTempProject))

    createTempDir(`${dirName}/project`)

    const { stdout } = await exec(dirName, 'init', {
      cwd: fullPathToTempProject
    })

    should(stdout).containEql('installing jsreport the latest version')
    // should install jsreport package
    should(fs.existsSync(path.join(fullPathToTempProject, 'node_modules/jsreport'))).be.eql(true)
    // and generate default files
    should(fs.existsSync(path.join(fullPathToTempProject, 'server.js'))).be.eql(true)
    should(fs.existsSync(path.join(fullPathToTempProject, 'jsreport.config.json'))).be.eql(true)
    should(fs.existsSync(path.join(fullPathToTempProject, 'package.json'))).be.eql(true)

    const conf = JSON.parse(fs.readFileSync(path.join(fullPathToTempProject, 'jsreport.config.json')).toString())

    should(conf.encryption).be.Undefined()
  })

  it('should initialize with a specific jsreport version', async function () {
    const dirName = 'init-with-specific-version'
    const fullPathToTempProject = getTempDir(`${dirName}/project`)
    const versionToInstall = '2.5.0'

    await setup(dirName, [], getNpmInstallMock(fullPathToTempProject))

    createTempDir(`${dirName}/project`)

    const { stdout } = await exec(dirName, `init ${versionToInstall}`, {
      cwd: fullPathToTempProject
    })

    should(stdout).containEql(`installing jsreport@${versionToInstall} now`)

    // should install jsreport package
    should(fs.existsSync(path.join(fullPathToTempProject, 'node_modules/jsreport'))).be.eql(true)
    // and generate default files
    should(fs.existsSync(path.join(fullPathToTempProject, 'server.js'))).be.eql(true)
    should(fs.existsSync(path.join(fullPathToTempProject, 'jsreport.config.json'))).be.eql(true)
    should(fs.existsSync(path.join(fullPathToTempProject, 'package.json'))).be.eql(true)

    should(JSON.parse(
      fs.readFileSync(path.join(fullPathToTempProject, 'package.json')).toString()
    ).dependencies.jsreport).be.eql(versionToInstall)

    const conf = JSON.parse(fs.readFileSync(path.join(fullPathToTempProject, 'jsreport.config.json')).toString())

    should(conf.encryption).be.Undefined()
  })

  it('should initialize a directory that contains only package.json', async function () {
    const dirName = 'init-packagejson-only'
    const fullPathToTempProject = getTempDir(`${dirName}/project`)

    await setup(dirName, [], getNpmInstallMock(fullPathToTempProject))

    createTempDir(`${dirName}/project`)

    fs.writeFileSync(
      path.join(fullPathToTempProject, './package.json'),
      JSON.stringify({
        name: 'packagejson-only',
        dependencies: {
          jsreport: '*'
        }
      }, null, 2)
    )

    const { stdout } = await exec(dirName, `init`, {
      cwd: fullPathToTempProject
    })

    should(stdout).not.containEql('installing jsreport')

    // should generate default files
    should(fs.existsSync(path.join(fullPathToTempProject, 'server.js'))).be.eql(true)
    should(fs.existsSync(path.join(fullPathToTempProject, 'jsreport.config.json'))).be.eql(true)
    // and replace package.json in dir
    should(
      JSON.parse(
        fs.readFileSync(path.join(fullPathToTempProject, 'package.json')).toString()
      ).name
    ).be.eql('packagejson-only')

    const conf = JSON.parse(fs.readFileSync(path.join(fullPathToTempProject, 'jsreport.config.json')).toString())

    should(conf.encryption).be.Undefined()
  })

  it('should not override server.js file', async function () {
    const dirName = 'init-packagejson-with-server'
    const fullPathToTempProject = getTempDir(`${dirName}/project`)

    await setup(dirName, [], getNpmInstallMock(fullPathToTempProject))

    createTempDir(`${dirName}/project`)

    fs.writeFileSync(
      path.join(fullPathToTempProject, './package.json'),
      JSON.stringify({
        name: 'packagejson-with-server',
        dependencies: {
          jsreport: '*'
        }
      }, null, 2)
    )

    fs.writeFileSync(
      path.join(fullPathToTempProject, './server.js'),
      'require("jsreport")().init()'
    )

    const { stdout } = await exec(dirName, `init`, {
      cwd: fullPathToTempProject
    })

    should(stdout).not.containEql('installing jsreport')

    // should generate default files
    should(fs.existsSync(path.join(fullPathToTempProject, 'jsreport.config.json'))).be.eql(true)

    should(
      JSON.parse(
        fs.readFileSync(path.join(fullPathToTempProject, 'package.json')).toString()
      ).name
    ).be.eql('packagejson-with-server')

    should(
      fs.readFileSync(path.join(fullPathToTempProject, 'server.js')).toString().trim()
    ).be.eql('require("jsreport")().init()')
  })

  it('should not override jsreport.config.json file', async function () {
    const dirName = 'init-packagejson-with-config'
    const fullPathToTempProject = getTempDir(`${dirName}/project`)

    await setup(dirName, [], getNpmInstallMock(fullPathToTempProject))

    createTempDir(`${dirName}/project`)

    fs.writeFileSync(
      path.join(fullPathToTempProject, './package.json'),
      JSON.stringify({
        name: 'config',
        dependencies: {
          jsreport: '*'
        }
      }, null, 2)
    )

    fs.writeFileSync(
      path.join(fullPathToTempProject, './jsreport.config.json'),
      '{"store": { "provider": "fs" }}'
    )

    const { stdout } = await exec(dirName, `init`, {
      cwd: fullPathToTempProject
    })

    should(stdout).not.containEql('installing jsreport')

    // should generate default files
    should(fs.existsSync(path.join(fullPathToTempProject, 'jsreport.config.json'))).be.eql(true)
    should(fs.existsSync(path.join(fullPathToTempProject, 'server.js'))).be.eql(true)

    // not replace package.json in dir
    should(
      JSON.parse(
        fs.readFileSync(path.join(fullPathToTempProject, 'package.json')).toString()
      ).name
    ).be.eql('config')

    // and not replace jsreport.config.json
    should(
      fs.readFileSync(path.join(fullPathToTempProject, 'jsreport.config.json')).toString().trim()
    ).be.eql('{"store": { "provider": "fs" }}')
  })
})

function getNpmInstallMock (tempProject) {
  return `
    const path = require('path')
    const fs = require('fs')

    commander.on('command.init.init', (argv) => {
      argv.context.customInstall = (pkgName, opts, cb) => {
        const parsed = pkgName.split('@')
        const pkg = parsed[0]
        const pkgVersion = parsed[1]

        try {
          fs.mkdirSync(path.join(\`${escapePath(tempProject)}\`, 'node_modules'))
        } catch (e) {
          return cb(e)
        }

        const jsreportPath = path.join(\`${escapePath(tempProject)}\`, 'node_modules', pkg)

        try {
          fs.mkdirSync(jsreportPath)
        } catch (e) {
          return cb(e)
        }

        const version = pkgVersion != null ? pkgVersion : '2.4.0'

        try {
          if (!fs.existsSync(path.join(jsreportPath, 'package.json'))) {
            fs.writeFileSync(path.join(jsreportPath, 'package.json'), JSON.stringify({
              name: pkg,
              version
            }, null, 2))
          }

          if (fs.existsSync(path.join(\`${escapePath(tempProject)}\`, 'package.json'))) {
            const projectPkg = JSON.parse(fs.readFileSync(path.join(\`${escapePath(tempProject)}\`, 'package.json')).toString())

            if (!projectPkg.dependencies) {
              projectPkg.dependencies = {}
            }

            if (!projectPkg.dependencies[pkg]) {
              projectPkg.dependencies[pkg] = version
            }

            fs.writeFileSync(path.join(\`${escapePath(tempProject)}\`, 'package.json'), JSON.stringify(projectPkg, null, 2))
          }

          cb()
        } catch (e) {
          cb(e)
        }
      }
    })
  `
}

function escapePath (pathStr) {
  return pathStr.replace(/\\/g, '\\\\')
}
