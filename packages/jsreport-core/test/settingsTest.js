const assert = require('assert')
const should = require('should')
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

  it('add update get should result into updated value', async () => {
    await reporter.settings.add('test', 'val')
    await reporter.settings.set('test', 'modified')
    assert.strictEqual('modified', reporter.settings.get('test').value)
  })

  it('add and get should result into same value', async () => {
    await reporter.settings.add('test', 'val')
    assert.strictEqual('val', reporter.settings.get('test').value)
  })

  it('should remove incompatible settings during startup', async () => {
    await reporter.documentStore.collection('settings').insert({ key: 'foo', value: 'test' })
    await reporter.documentStore.collection('settings').insert({ key: 'foo2', value: JSON.stringify({ x: 'a' }) })
    await reporter.settings.init(reporter.documentStore)
    const val = await reporter.settings.findValue('foo')
    should.not.exist(val)
    const val2 = await reporter.settings.findValue('foo2')
    should(val2.x).be.eql('a')
  })
})
