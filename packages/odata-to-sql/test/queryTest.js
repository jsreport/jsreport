require('should')
const define = require('../lib/define.js')
const query = require('../lib/query.js')
const model = require('./model')
const sql = require('jsreport-sql-2')

describe('query', function () {
  let table

  beforeEach(function () {
    const tables = define(model, 'mssql', '')
    sql.setDialect('mssql')
    table = sql.define(tables[0])
  })

  it('should create plain one', function () {
    query(table, {}, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType]')
  })

  it('should support paging', function () {
    query(table, {
      $skip: 5,
      $limit: 10,
      $sort: { _id: 1 }
    }, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType] ORDER BY [UserType].[_id] OFFSET @1 ROWS FETCH NEXT @2 ROWS ONLY')
  })

  it('should support filtering', function () {
    query(table, {
      $filter: { _id: 'foo' }
    }, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE ([UserType].[_id] = @1)')
  })

  it('should support filtering and make AND from multiple properties on filter', function () {
    query(table, {
      $filter: { int: 1, bool: true }
    }, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE (([UserType].[int] = @1) AND ([UserType].[bool] = @2))')
  })

  it('should support filtering and make AND when second property is $or', function () {
    query(table, {
      $filter: { int: 1, $or: [{ bool: true }] }
    }, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE (([UserType].[int] = @1) AND ([UserType].[bool] = @2))')
  })

  it('should support projection', function () {
    query(table, {
      $select: { int: 1 }
    }, 'users', model).text.should.be.eql('SELECT [UserType].[int] FROM [UserType]')
  })

  it('should support projection on complex props', function () {
    query(table, {
      $select: { address: 1 }
    }, 'users', model).text.should.be.eql('SELECT [UserType].[address_street], [UserType].[address_number] FROM [UserType]')
  })

  it('should support projection on multiple props', function () {
    query(table, {
      $select: { int: 1, address: 1 }
    }, 'users', model).text.should.be.eql('SELECT [UserType].[int], [UserType].[address_street], [UserType].[address_number] FROM [UserType]')
  })

  it('should support filter on complex props', function () {
    const r = query(table, {
      $filter: { address: { street: 'foo' } }
    }, 'users', model)

    r.text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE ([UserType].[address_street] = @1)')
    r.values[0].should.be.eql('foo')
  })

  it('should support is null filters', function () {
    query(table, {
      $filter: { int: null }
    }, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE ([UserType].[int] IS NULL)')
  })

  it('should support is null filters for undefined', function () {
    query(table, {
      $filter: { int: undefined }
    }, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE ([UserType].[int] IS NULL)')
  })

  it('should support is null filters for null on complex', function () {
    query(table, {
      $filter: { address: null }
    }, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE (([UserType].[address_street] IS NULL) AND ([UserType].[address_number] IS NULL))')
  })

  it('should support is null filters for undefined on complex', function () {
    query(table, {
      $filter: { address: undefined }
    }, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE (([UserType].[address_street] IS NULL) AND ([UserType].[address_number] IS NULL))')
  })

  it('should support $in', function () {
    const r = query(table, {
      $filter: { int: { $in: [1, 2] } }
    }, 'users', model)
    r.text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE ([UserType].[int] IN (@1, @2))')
    r.values[0].should.be.eql(1)
    r.values[1].should.be.eql(2)
  })

  it('should support $in with no values', function () {
    query(table, {
      $filter: { int: { $in: [] } }
    }, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE (1=0)')
  })

  it('should support $lt', function () {
    query(table, {
      $filter: { int: { $lt: 2 } }
    }, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE ([UserType].[int] < @1)')
  })

  it('should support $lte', function () {
    query(table, {
      $filter: { int: { $lte: 2 } }
    }, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE ([UserType].[int] <= @1)')
  })

  it('should support $gte', function () {
    query(table, {
      $filter: { int: { $gt: 2 } }
    }, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE ([UserType].[int] > @1)')
  })

  it('should support $gte', function () {
    query(table, {
      $filter: { int: { $gte: 2 } }
    }, 'users', model).text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE ([UserType].[int] >= @1)')
  })

  it('should support filter and lt on complex props', function () {
    const r = query(table, {
      $filter: { address: { number: { $lt: 1 } } }
    }, 'users', model)
    r.text.should.be.eql('SELECT [UserType].* FROM [UserType] WHERE ([UserType].[address_number] < @1)')
    r.values[0].should.be.eql(1)
  })
})
