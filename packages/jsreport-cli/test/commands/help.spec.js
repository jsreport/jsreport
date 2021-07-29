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

describe('help command', () => {
  const dirName = 'help-project'

  beforeEach(async () => {
    const customExtensionPath = getTempDir(`${dirName}/custom-extension`)
    await setup(dirName, [customExtensionPath])

    createTempDir(`${dirName}/custom-extension`)

    fs.writeFileSync(path.join(customExtensionPath, 'jsreport.config.js'), `
      module.exports = {
        name: 'custom',
        main: () => {},
        dependencies: []
      }
    `)

    fs.writeFileSync(path.join(customExtensionPath, 'index.js'), `
      const config = require('./jsreport.config')

      module.exports = function (options) {
        const newConfig = Object.assign({}, config)

        newConfig.options = options
        newConfig.main = () => {}
        newConfig.directory = __dirname

        return newConfig
      }
    `)

    const cliCustomExtensionPath = createTempDir(`${dirName}/custom-extension/cli`)

    fs.writeFileSync(path.join(cliCustomExtensionPath, 'main.js'), `
      module.exports = [{
        command: 'custom',
        description: 'custom command description',
        handler: () => {}
      }]
    `)
  })

  it('should return help usage (help -h)', async () => {
    const { stdout } = await exec(dirName, 'help -h')
    should(stdout).containEql('Prints information about a command or topic')
    should(stdout).containEql('Usage')
    should(stdout).containEql('Positionals')
    should(stdout).containEql('commandOrTopic')
    should(stdout).containEql('Examples')
  })

  it('should fail when missing commandOrTopic argument', () => {
    return should(exec(dirName, 'help')).be.rejectedWith(/"commandOrTopic" argument is required/)
  })

  it('should not print when command does not exists', async () => {
    const { stdout } = await exec(dirName, 'help unknown')
    should(stdout).containEql('no information found for command or topic "unknown"')
  })

  it('should print information of registered command (help <command>)', async () => {
    const { stdout } = await exec(dirName, 'help render')
    should(stdout).containEql('Invoke a rendering process')
    should(stdout).containEql('--request')
    should(stdout).containEql('--template')
  })

  it('should print information of jsreport configuration format (help config)', async () => {
    const { stdout } = await exec(dirName, 'help config')

    should(stdout).containEql('Configuration format description')
    should(stdout).containEql('"extensions": <object> {')
    should(stdout).containEql('"allowLocalFilesAccess": <boolean>')
    should(stdout).containEql('"tempDirectory": <string>')
  })

  it('should print information about itself (help help)', async () => {
    const { stdout } = await exec(dirName, 'help help')
    should(stdout).containEql('Prints information about a command or topic')
    should(stdout).containEql('Usage')
    should(stdout).containEql('Positionals')
    should(stdout).containEql('commandOrTopic')
    should(stdout).containEql('Examples')
  })

  it('should print information of command in extension (help <commandInExtension>)', async () => {
    const { stdout } = await exec(dirName, 'help custom')
    should(stdout).containEql('custom command description')
  })
})
