
const core = require('../../index')
require('should')

describe('blobStorageTest', () => {
  let reporter

  beforeEach(async () => {
    reporter = core({ discover: false })
    reporter.use(core.tests.listeners())
    await reporter.init()
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  it('write and read', async () => {
    reporter.tests.beforeRenderEval(async (req, res, { reporter, require }) => {
      await reporter.blobStorage.write('foo', Buffer.from('hula'))

      const content = await reporter.blobStorage.read('foo')
      require('should')(content.toString()).be.eql('hula')
    })

    await reporter.render({
      template: { engine: 'none', recipe: 'html', content: 'hello' }
    })
  })

  it('write remove read should fail', async () => {
    reporter.tests.beforeRenderEval(async (req, res, { reporter, require }) => {
      await reporter.blobStorage.write('foo', Buffer.from('hula'))
      await reporter.blobStorage.remove('foo')

      return require('should')(reporter.blobStorage.read('foo')).be.rejected()
    })

    await reporter.render({
      template: { engine: 'none', recipe: 'html', content: 'hello' }
    })
  })

  it('should work with folders and paths', async () => {
    reporter.tests.beforeRenderEval(async (req, res, { reporter, require }) => {
      await reporter.blobStorage.write('foldera/folderb/myblob.txt', Buffer.from('hula'))
      const buf = await reporter.blobStorage.read('foldera/folderb/myblob.txt')
      require('should')(buf.toString()).be.eql('hula')
    })

    await reporter.render({
      template: { engine: 'none', recipe: 'html', content: 'hello' }
    })
  })

  it('remove shouldnt fail for missing blob', async () => {
    reporter.tests.beforeRenderEval(async (req, res, { reporter }) => {
      await reporter.blobStorage.remove('foo')
    })

    await reporter.render({
      template: { engine: 'none', recipe: 'html', content: 'hello' }
    })
  })

  it('write should work with 1GB input', async () => {
    reporter.tests.beforeRenderEval(async (req, res, { reporter }) => {
      await reporter.blobStorage.write('test', Buffer.alloc(1073741824), req)
    })

    await reporter.render({
      template: { engine: 'none', recipe: 'html', content: 'hello' }
    })

    const content = await reporter.blobStorage.read('test')
    content.length.should.be.eql(1073741824)
  })
})
