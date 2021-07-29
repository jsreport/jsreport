const path = require('path')
const should = require('should')

const { setup, exec } = require('./testUtils')({
  cliModuleName: path.join(__dirname, '../'),
  baseDir: path.join(__dirname, './temp'),
  rootDirectory: path.join(__dirname, '../'),
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

describe('cli', () => {
  const dirName = 'cli'

  beforeEach(async () => {
    await setup(dirName)
  })

  it('should fail when passing unknown option', () => {
    return should(exec(dirName, '--unknown value')).be.rejectedWith(/Unknown argument/)
  })

  it('should fail when passing unknown dashed option', () => {
    return should(exec(dirName, '--unknown-arg value')).be.rejectedWith(/Unknown argument/)
  })

  it('should fail when receives unknown command', () => {
    return should(exec(dirName, 'unknown')).be.rejectedWith(/command not found/)
  })

  it('--version should return version', async () => {
    const { stdout } = await exec(dirName, '--version')
    return should(stdout).match(/cli version/)
  })

  it('--help should return message', async () => {
    const { stdout } = await exec(dirName, '--help')
    should(stdout).match(/Usage:\n\njsreport/)
  })

  it('should fail when command receives unknown option', () => {
    return should(exec(dirName, 'help --unknown value')).be.rejectedWith(/Unknown argument/)
  })

  it('should fail when command receives unknown dashed option', () => {
    return should(exec(dirName, 'help --unknown-args value')).be.rejectedWith(/Unknown argument/)
  })
})
