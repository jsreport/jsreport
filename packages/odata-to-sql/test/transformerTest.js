require('should')
const model = require('./model')
const transformator = require('../index')

describe('transformer msql', function () {
  let convertor

  beforeEach(function () {
    convertor = transformator(model, 'mssql')
  })

  it('should create ddl statements', function () {
    convertor.create()[0].text.should.be.eql("IF NOT EXISTS(SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UserType' AND TABLE_SCHEMA = 'dbo') BEGIN CREATE TABLE [UserType] ([_id] varchar(max), [date] datetime2(2), [int] integer, [bool] bit, [address_street] varchar(max), [address_number] integer) END")
  })

  it('should create insert statements', function () {
    const q = convertor.insert('users', { _id: 'foo' })
    q.text.should.be.eql('INSERT INTO [UserType] ([_id]) VALUES (@1)')
    q.values.should.have.length(1)
    q.values[0].should.be.eql('foo')
  })
})

describe('transformer oracle', function () {
  let convertor

  beforeEach(function () {
    convertor = transformator(model, 'oracle')
  })

  it('should create ddl statements', function () {
    convertor.create()[0].text.should.be.eql('BEGIN EXECUTE IMMEDIATE \'CREATE TABLE "UserType" ("_id" varchar2(4000), "date" timestamp, "int" number, "bool" number(1), "address_street" clob, "address_number" number)\'; EXCEPTION WHEN OTHERS THEN IF SQLCODE != -955 THEN RAISE; END IF; END;')
  })

  it('should create insert statements', function () {
    const q = convertor.insert('users', { _id: 'foo' })
    q.text.should.be.eql('INSERT INTO "UserType" ("_id") VALUES (:1)')
    q.values.should.have.length(1)
    q.values[0].should.be.eql('foo')
  })
})
