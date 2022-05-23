const path = require('path')
const fs = require('fs')
const os = require('os')
const jsreport = require('@jsreport/jsreport-core')
const tmpData = path.join(__dirname, 'tmpData')

describe('fileSystemBlobStorage', () => {
  describe('when options.trustUserCode=false', () => {
    let reporter

    beforeEach(async () => {
      if (fs.existsSync(tmpData)) {
        fs.rmSync(tmpData, { recursive: true })
      }

      reporter = jsreport({
        store: { provider: 'fs' },
        trustUserCode: false
      }).use(require('../')({
        dataDirectory: tmpData
      }))

      return reporter.init()
    })

    afterEach(async () => {
      if (reporter) {
        await reporter.close()
      }
      fs.rmSync(tmpData, { recursive: true })
    })

    jsreport.tests.blobStorage()(() => reporter.blobStorage)

    describe('should not allow writing outside storage directory', () => {
      it('write', async () => {
        return reporter.blobStorage.write('../foo', Buffer.from('hula')).should.be.rejectedWith(/blobName must be a relative path inside blobStorage directory/)
      })

      it('read', async () => {
        const exec = async () => reporter.blobStorage.read('../dir/foo')
        return exec().should.be.rejectedWith(/blobName must be a relative path inside blobStorage directory/)
      })

      it('remove', async () => {
        return reporter.blobStorage.remove('..//foo').should.be.rejectedWith(/blobName must be a relative path inside blobStorage directory/)
      })
    })
  })

  describe('when options.trustUserCode=true', () => {
    let reporter

    beforeEach(async () => {
      if (fs.existsSync(tmpData)) {
        fs.rmSync(tmpData, { recursive: true })
      }

      reporter = jsreport({
        store: { provider: 'fs' },
        trustUserCode: true
      }).use(require('../')({
        dataDirectory: tmpData
      }))

      return reporter.init()
    })

    afterEach(async () => {
      await reporter.close()
      fs.rmSync(tmpData, { recursive: true })
    })

    describe('should work with correct blobName', () => {
      it('write', async () => {
        const blobName = 'dir/foo'

        await reporter.blobStorage.write(blobName, Buffer.from('hula'))

        const targetPath = path.join(tmpData, 'storage', blobName)

        fs.existsSync(targetPath).should.be.True()
      })

      it('read', async () => {
        const blobName = 'dir/foo'

        await reporter.blobStorage.write(blobName, Buffer.from('hula'))

        const content = await reporter.blobStorage.read(blobName)
        content.toString().should.be.eql('hula')
      })

      it('remove', async () => {
        const blobName = 'dir/foo'

        await reporter.blobStorage.write(blobName, Buffer.from('hula'))

        const targetPath = path.join(tmpData, 'storage', blobName)

        fs.existsSync(targetPath).should.be.True()

        await reporter.blobStorage.remove(blobName)

        fs.existsSync(targetPath).should.be.False()
      })
    })
  })

  describe('with explicit blobStorage.dataDirectory', () => {
    let reporter
    const blobStorageDataDirectory = path.join(os.tmpdir(), 'jsreport', 'blobStorage')

    beforeEach(async () => {
      if (fs.existsSync(tmpData)) {
        fs.rmSync(tmpData, { recursive: true })
      }

      reporter = jsreport({
        store: { provider: 'fs' },
        blobStorage: { provider: 'fs', dataDirectory: blobStorageDataDirectory }
      }).use(require('../')({
        dataDirectory: tmpData
      }))

      return reporter.init()
    })

    afterEach(async () => {
      if (reporter) {
        await reporter.close()
      }
      fs.rmSync(tmpData, { recursive: true })
    })

    it('write', async () => {
      await reporter.blobStorage.write('someBlob', Buffer.from('hula'))
      fs.readFileSync(path.join(blobStorageDataDirectory, 'someBlob')).toString().should.be.eql('hula')
    })
  })
})
