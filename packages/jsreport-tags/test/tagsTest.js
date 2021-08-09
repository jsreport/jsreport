require('should')
const jsreport = require('@jsreport/jsreport-core')
const reservedTagNamesExport = require('../shared/reservedTagNames')
const reservedTagNames = reservedTagNamesExport.default
const tagsGroupName = reservedTagNamesExport.tagsGroupName

describe('tags', function () {
  let reporter

  beforeEach(() => {
    reporter = jsreport().use(require('../')())
    return reporter.init()
  })

  it('should not allow creation with reserved tag names', async () => {
    for (const tagName of reservedTagNames) {
      await reporter.documentStore.collection('tags').insert({
        name: tagName,
        color: '#000000'
      }).should.be.rejected()
    }
  })

  it('should not allow creation without color', () => {
    return reporter.documentStore.collection('tags').insert({
      name: 'tag1'
    }).should.be.rejected()
  })

  it('should not allow creation with invalid color', () => {
    return reporter.documentStore.collection('tags').insert({
      name: 'tag1',
      color: 'testing'
    }).should.be.rejected()
  })

  it('should not allow updating with reserved tag name', async () => {
    await reporter.documentStore.collection('tags').insert({
      name: 'tag1',
      color: '#000000'
    })

    return reporter.documentStore.collection('tags').update({
      name: 'tag1'
    }, {
      $set: {
        name: tagsGroupName
      }
    }).should.be.rejected()
  })

  it('should not allow updating with invalid color', async () => {
    await reporter.documentStore.collection('tags').insert({
      name: 'tag1',
      color: '#000000'
    })

    return reporter.documentStore.collection('tags').update({
      name: 'tag1'
    }, {
      $set: {
        color: 'invalid'
      }
    }).should.be.rejected()
  })

  it('deleting should work', async () => {
    await reporter.documentStore.collection('tags').insert({
      color: '#000000',
      name: 'tag1'
    })

    await reporter.documentStore.collection('tags').remove({ name: 'tag1' })
    const list = await reporter.documentStore.collection('tags').find({})
    list.should.have.length(0)
  })
})
