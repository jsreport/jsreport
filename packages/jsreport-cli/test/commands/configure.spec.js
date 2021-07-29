const path = require('path')
const fs = require('fs')
const should = require('should')

const { getTempDir, setup, exec } = require('../testUtils')({
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

describe('configure command', () => {
  const dirName = 'configure-project'

  it('should just print configuration', async () => {
    const answers = {
      env: 'dev',
      reportTimeout: 60000,
      serverEnabled: false,
      store: 'memory',
      allowLocalFilesAccess: false,
      createExamples: false
    }

    await setup(dirName, [], `
      commander.on('command.configure.init', (argv) => {
        argv.context.answers = ${JSON.stringify(answers)}
      })
    `)

    const { stdout } = await exec(dirName, 'configure --print')

    const result = JSON.parse(stdout.slice(stdout.indexOf('{'), stdout.lastIndexOf('}') + 1))

    should(result).be.eql({
      allowLocalFilesAccess: false,
      store: {
        provider: 'memory'
      },
      blobStorage: {
        provider: 'memory'
      },
      logger: {
        console: { transport: 'console', level: 'debug' }
      },
      reportTimeout: 60000,
      extensions: {
        express: {
          enabled: false
        }
      }
    })
  })

  it('should generate simple configuration', async () => {
    const answers = {
      env: 'dev',
      reportTimeout: 60000,
      serverEnabled: false,
      store: 'memory',
      allowLocalFilesAccess: false,
      createExamples: false
    }

    await setup(dirName, [], `
      commander.on('command.configure.init', (argv) => {
        argv.context.answers = ${JSON.stringify(answers)}
      })
    `)

    const { stdout } = await exec(dirName, 'configure')

    should(stdout).containEql('config saved in')

    const expectedConfig = {
      allowLocalFilesAccess: false,
      store: {
        provider: 'memory'
      },
      blobStorage: {
        provider: 'memory'
      },
      logger: {
        console: { transport: 'console', level: 'debug' }
      },
      reportTimeout: 60000,
      extensions: {
        express: {
          enabled: false
        }
      }
    }

    const outputPath = path.join(getTempDir(dirName), 'jsreport.config.json')

    should(fs.existsSync(outputPath)).be.True()
    should(JSON.parse(fs.readFileSync(outputPath).toString())).be.eql(expectedConfig)
  })

  it('should generate configuration with web server enabled', async () => {
    const answers = {
      env: 'dev',
      reportTimeout: 60000,
      serverEnabled: true,
      serverProtocol: 'http',
      serverPort: 7500,
      serverAuthEnabled: true,
      serverAuthCookieSecret: '<<secret  here>>',
      serverAuthUsername: 'test',
      serverAuthPassword: 'test-pass',
      store: 'fs',
      allowLocalFilesAccess: true,
      createExamples: true,
      fastStrategies: true
    }

    await setup(dirName, [], `
      commander.on('command.configure.init', (argv) => {
        argv.context.answers = ${JSON.stringify(answers)}
      })
    `)

    const { stdout } = await exec(dirName, 'configure')

    should(stdout).containEql('config saved in')

    const expectedConfig = {
      httpPort: 7500,
      allowLocalFilesAccess: true,
      reportTimeout: 60000,
      extensions: {
        authentication: {
          cookieSession: {
            secret: '<<secret  here>>'
          },
          admin: { username: 'test', password: 'test-pass' },
          enabled: true
        },
        'sample-template': {
          createSamples: true
        }
      },
      store: {
        provider: 'fs'
      },
      blobStorage: {
        provider: 'fs'
      },
      logger: {
        console: { transport: 'console', level: 'debug' },
        file: { transport: 'file', level: 'info', filename: 'logs/reporter.log' },
        error: { transport: 'file', level: 'error', filename: 'logs/error.log' }
      }
    }

    const outputPath = path.join(getTempDir(dirName), 'jsreport.config.json')

    should(fs.existsSync(outputPath)).be.True()
    should(JSON.parse(fs.readFileSync(outputPath).toString())).be.eql(expectedConfig)
  })
})
