require('should')
const insert = require('../lib/insert.js')
const define = require('../lib/define.js')
const model = require('./model')

describe('insert', function () {
  it('should create correct insert values', function () {
    define(model, 'mssql')
    const doc = insert({
      _id: 'foo',
      date: new Date(2012, 1, 1),
      int: 10,
      bool: true,
      address: { street: 'street' }
    }, 'users', model)

    doc._id.should.be.eql('foo')
    doc.date.should.be.eql(new Date(2012, 1, 1))
    doc.int.should.be.eql(10)
    doc.bool.should.be.eql(true)
    doc.address_street.should.be.eql('street')
  })
})
