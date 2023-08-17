'use strict'

const should = require('should')
const serializator = require('../')

describe('serializator', () => {
  it('should serialize and parse object with standard JSON supported values', () => {
    const obj = {
      a: 1,
      b: 'string',
      c: true,
      d: null
    }

    const json = serializator.serialize(obj)

    should(json).be.eql('{"a":1,"b":"string","c":true,"d":null}')

    const result = serializator.parse(json)

    should(result).be.eql(obj)
  })

  it('should serialize and parse array with standard JSON supported values', () => {
    const arr = [{
      a: 1,
      b: 'string',
      c: true,
      d: null
    }]

    const json = serializator.serialize(arr)

    should(json).be.eql('[{"a":1,"b":"string","c":true,"d":null}]')

    const result = serializator.parse(json)

    should(result).be.eql(arr)
  })

  it('should serialize and parse object with undefined values', () => {
    const obj = {
      a: 1,
      b: 'string',
      c: true,
      d: undefined
    }

    const json = serializator.serialize(obj)

    should(json).be.eql('{"a":1,"b":"string","c":true,"d":null}')

    const result = serializator.parse(json)

    obj.d = null

    should(result).be.eql(obj)
  })

  it('should serialize and parse array with undefined values', () => {
    const arr = [1, 'string', undefined, { registration: undefined }]

    const json = serializator.serialize(arr)

    should(json).be.eql('[1,"string",null,{"registration":null}]')

    const result = serializator.parse(json)

    arr[2] = null
    arr[3].registration = null

    should(result).be.eql(arr)
  })

  it('should serialize and parse object with Date', () => {
    const obj = {
      a: 1,
      b: 'string',
      c: true,
      d: new Date('2018-01-01')
    }

    const json = serializator.serialize(obj)

    should(json).be.eql('{"a":1,"b":"string","c":true,"d":{"$$$date$$$":1514764800000}}')

    const result = serializator.parse(json)

    should(result).be.eql(obj)
  })

  it('should serialize and parse array with Date', () => {
    const arr = [1, 'string', new Date('2018-10-01'), { startDate: new Date('2018-04-01') }]

    const json = serializator.serialize(arr)

    should(json).be.eql('[1,"string",{"$$$date$$$":1538352000000},{"startDate":{"$$$date$$$":1522540800000}}]')

    const result = serializator.parse(json)

    should(result).be.eql(arr)
  })

  it('should serialize and parse object with Buffer', () => {
    const obj = {
      a: 1,
      b: 'string',
      c: true,
      d: Buffer.from('something')
    }

    const json = serializator.serialize(obj)

    should(json).be.eql('{"a":1,"b":"string","c":true,"d":{"$$$buffer$$$":"c29tZXRoaW5n"}}')

    const result = serializator.parse(json)

    obj.d = obj.d.toString()
    result.d = result.d.toString()

    should(result).be.eql(obj)
  })

  it('should serialize and parse array with Buffer', () => {
    const arr = [1, 'string', Buffer.from('something'), { binaryFormat: Buffer.from('binary') }]

    const json = serializator.serialize(arr)

    should(json).be.eql('[1,"string",{"$$$buffer$$$":"c29tZXRoaW5n"},{"binaryFormat":{"$$$buffer$$$":"YmluYXJ5"}}]')

    const result = serializator.parse(json)

    arr[2] = arr[2].toString()
    arr[3].binaryFormat = arr[3].binaryFormat.toString()
    result[2] = result[2].toString()
    result[3].binaryFormat = result[3].binaryFormat.toString()

    should(result).be.eql(arr)
  })

  it('should serialize and parse object with empty Buffer', () => {
    const obj = {
      a: 1,
      b: 'string',
      c: true,
      d: Buffer.from('')
    }

    const json = serializator.serialize(obj)

    should(json).be.eql('{"a":1,"b":"string","c":true,"d":{"$$$buffer$$$":""}}')

    const result = serializator.parse(json)

    obj.d = obj.d.toString()
    result.d = result.d.toString()

    should(result).be.eql(obj)
  })
})
