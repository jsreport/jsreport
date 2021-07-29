require('should')
var define = require('../lib/define.js')
var parse = require('../lib/parse.js')
var model = require('./model')

describe('parse', function () {
  beforeEach(function () {
    define(model, 'mssql')
  })

  it('should create parse one', function () {
    var parsedDoc = parse({ _id: 'foo' }, 'users', model)
    parsedDoc.should.have.property('_id')
    parsedDoc._id.should.be.eql('foo')

    parsedDoc.should.not.have.property('address')
  })

  it('should parse complex one', function () {
    var parsedDoc = parse({
      _id: 'foo',
      address_street: 'street'
    }, 'users', model)

    parsedDoc.should.have.property('address')
    parsedDoc.address.street.should.be.eql('street')
  })
})
