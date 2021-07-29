const path = require('path')
const should = require('should')

const { createTempDir, setup, exec } = require('../testUtils')({
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

describe('start command', () => {
  const dirName = 'start-project'

  beforeEach(async () => {
    await setup(dirName)
  })

  it('should handle errors', async () => {
    const fullPathToTempProject = createTempDir(`${dirName}/project`)

    try {
      await exec(dirName, 'start', {
        env: {
          cli_instance_lookup_fallback: false,
          noDefaultInstance: true
        },
        cwd: fullPathToTempProject
      })
    } catch (e) {
      should(e.stderr).containEql(`Couldn't find a jsreport installation`)
    }
  })

  it('should start a jsreport instance', async () => {
    const proc = exec(dirName, 'start')
    let initialized = false

    proc.stderr.on('data', (data) => {
      const msg = data.toString()

      if (msg.includes('reporter initialized')) {
        initialized = true
        proc.kill()
      }
    })

    try {
      await proc
    } catch (e) {}

    should(initialized).be.true()
  })

  it('should accept any cli options', async () => {
    const proc = exec(dirName, 'start --foo=bar --httpPort=7689')
    let initialized = false

    proc.stderr.on('data', (data) => {
      const msg = data.toString()

      if (msg.includes('reporter initialized')) {
        initialized = true
        proc.kill()
      }
    })

    try {
      await proc
    } catch (e) {}

    should(initialized).be.true()
  })
})
