const os = require('os')
const path = require('path')
const core = require('../../index')
const should = require('should')

describe('minimum version validation', () => {
  let reporter

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  it('should throw when .requires information is not set in extension', async () => {
    reporter = core({
      discover: true,
      useExtensionsLocationCache: false,
      rootDirectory: path.join(__dirname, 'missingRequires'),
      tempCoreDirectory: os.tmpdir()
    })

    return should(reporter.init()).be.rejectedWith(/Missing "\.requires" information/)
  })

  it('should throw when minimal version spec format set in extension is wrong', async () => {
    reporter = core({
      discover: true,
      useExtensionsLocationCache: false,
      rootDirectory: path.join(__dirname, 'badRequires'),
      tempCoreDirectory: os.tmpdir()
    })

    return should(reporter.init()).be.rejectedWith(/Invalid format for minimal version/)
  })

  it('should throw when extension version is wrong', async () => {
    reporter = core({
      discover: true,
      useExtensionsLocationCache: false,
      rootDirectory: path.join(__dirname, 'validExtensions'),
      tempCoreDirectory: os.tmpdir()
    })

    reporter.coreVersion = 'd'

    return should(reporter.init()).be.rejectedWith(/Invalid format for version of "core"/)
  })

  it('should throw when minimal version spec does not match with extension version', async () => {
    reporter = core({
      discover: true,
      useExtensionsLocationCache: false,
      rootDirectory: path.join(__dirname, 'noMatchRequires'),
      tempCoreDirectory: os.tmpdir()
    })

    reporter.coreVersion = '1.0.0'

    return should(reporter.init()).be.rejectedWith(/does not match with version/)
  })

  it('should throw when minimal version spec does not match with external extension version', async () => {
    reporter = core({
      discover: true,
      useExtensionsLocationCache: false,
      rootDirectory: path.join(__dirname, 'noMatchExternalRequires'),
      tempCoreDirectory: os.tmpdir()
    })

    return should(reporter.init()).be.rejectedWith(/found in "ext2" does not match with version/)
  })

  it('should be ok when minimal version spec does match with extension version', async () => {
    reporter = core({
      discover: true,
      useExtensionsLocationCache: false,
      rootDirectory: path.join(__dirname, 'matchRequires'),
      tempCoreDirectory: os.tmpdir()
    })

    reporter.coreVersion = '1.0.0'

    return should(reporter.init()).not.be.rejected()
  })

  it('should be ok when minimal version spec does match with external extension version', async () => {
    reporter = core({
      discover: true,
      useExtensionsLocationCache: false,
      rootDirectory: path.join(__dirname, 'matchExternalRequires'),
      tempCoreDirectory: os.tmpdir()
    })

    return should(reporter.init()).not.be.rejected()
  })
})
