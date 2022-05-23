const path = require('path')
const fs = require('fs')
const should = require('should')

const { getTempDir, setup, exec } = require('../testUtils')({
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

describe('configure command', () => {
  const dirName = 'configure-project'

  it('should just print configuration', async () => {
    const answers = {
      env: 'dev',
      reportTimeout: 60000,
      trustUserCode: false,
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
      trustUserCode: false,
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
      },
      reportTimeout: 60000,
      workers: {
        numberOfWorkers: 2
      },
      extensions: {
        authentication: {
          cookieSession: {},
          admin: {
            username: 'admin',
            password: 'password'
          },
          enabled: false
        }
      }
    })
  })

  it('should generate simple configuration', async () => {
    const answers = {
      env: 'dev',
      reportTimeout: 60000,
      trustUserCode: false,
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
      trustUserCode: false,
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
      },
      reportTimeout: 60000,
      workers: {
        numberOfWorkers: 2
      },
      extensions: {
        authentication: {
          cookieSession: {},
          admin: {
            username: 'admin',
            password: 'password'
          },
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
      serverPort: 7500,
      serverAuthEnabled: true,
      serverAuthCookieSecret: '<<secret  here>>',
      serverAuthUsername: 'test',
      serverAuthPassword: 'test-pass',
      trustUserCode: true,
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
      trustUserCode: true,
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
      workers: {
        numberOfWorkers: 2
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
