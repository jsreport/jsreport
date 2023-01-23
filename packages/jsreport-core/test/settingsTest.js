require('should')
const core = require('../index')

describe('Settings', () => {
  let reporter

  beforeEach(async () => {
    reporter = core({ discover: false })
    await reporter.init()
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  it('add update findValue should result into updated value', async () => {
    await reporter.settings.add('test', 1)
    await reporter.settings.set('test', 2)
    const v = await reporter.settings.findValue('test')
    v.should.be.eql(2)
  })

  it('add and findValue should result into same value', async () => {
    await reporter.settings.add('test', { foo: 'a' })
    const v = await reporter.settings.findValue('test')
    v.foo.should.be.eql('a')
  })
})
