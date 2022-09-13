require('should')
const define = require('../lib/define.js')
const count = require('../lib/count.js')
const model = require('./model')
const sql = require('jsreport-sql-2')

describe('count', function () {
  let table

  beforeEach(function () {
    const tables = define(model, 'mssql', '')
    sql.setDialect('mssql')
    table = sql.define(tables[0])
  })

  it('should support filtering and make AND from multiple properties on filter', function () {
    count(table, {
      $filter: { $or: [{ int: 1 }, { bool: true }] }
    }, 'users', model).text.should.be.eql('SELECT COUNT(*) AS [undefined_count] FROM [UserType] WHERE (([UserType].[int] = @1) OR ([UserType].[bool] = @2))')
  })
})
