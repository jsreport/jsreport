require('should')
const define = require('../lib/define.js')

const model = require('./model')

describe('define', function () {
  it('should create correct sql define object', function () {
    const def = define(model, 'mssql', '')

    const table = def[0]
    table.should.have.property('columns')
    table.columns.should.have.length(6)

    table.columns[0].name.should.be.eql('_id')
    table.columns[0].dataType.should.be.eql('varchar(max)')

    table.columns[1].name.should.be.eql('date')
    table.columns[1].dataType.should.be.eql('datetime2(2)')

    table.columns[2].name.should.be.eql('int')
    table.columns[2].dataType.should.be.eql('integer')

    table.columns[3].name.should.be.eql('bool')
    table.columns[3].dataType.should.be.eql('bit')

    table.columns[4].name.should.be.eql('address_street')
    table.columns[4].dataType.should.be.eql('varchar(max)')

    table.columns[5].name.should.be.eql('address_number')
    table.columns[5].dataType.should.be.eql('integer')
  })

  it('foo', function () {
    const def = define(model, 'mssql', '')
    const sql = require('jsreport-sql-2')
    sql.setDialect('mssql')

    sql.define(def[0]).create().toQuery().text.should.be.eql('CREATE TABLE [UserType] ([_id] varchar(max), [date] datetime2(2), [int] integer, [bool] bit, [address_street] varchar(max), [address_number] integer)')
  })
})
