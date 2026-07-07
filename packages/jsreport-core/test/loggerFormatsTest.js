const path = require('path')
const should = require('should')
const winston = require('winston')
const { MESSAGE } = require('triple-beam')
const { resolveFormat, loadCustomFormats, builtInFormats } = require('../lib/main/loggerFormats')
const createJsonLoggerFormat = require('../lib/main/createJsonLoggerFormat')

describe('loggerFormats', () => {
  const customFixturePath = path.join(__dirname, 'fixtures', 'customLoggerFormat.js')

  describe('builtInFormats', () => {
    it('should expose text, text-with-timestamp and json built-ins', () => {
      builtInFormats.should.have.property('text')
      builtInFormats.should.have.property('text-with-timestamp')
      builtInFormats.should.have.property('json')
    })
  })

  describe('resolveFormat', () => {
    it('should return null for null/undefined input', () => {
      should(resolveFormat(null)).be.Null()
      should(resolveFormat(undefined)).be.Null()
    })

    it('should resolve "json" to a winston format with a transform method', () => {
      const fmt = resolveFormat('json')
      should(fmt).not.be.Null()
      should(typeof fmt.transform).be.eql('function')
    })

    it('should resolve "text" and "text-with-timestamp" to winston formats', () => {
      should(typeof resolveFormat('text').transform).be.eql('function')
      should(typeof resolveFormat('text-with-timestamp').transform).be.eql('function')
    })

    it('should throw on unknown format names', () => {
      ;(() => resolveFormat('does-not-exist')).should.throw(/Unknown logger format "does-not-exist"/)
    })

    it('should prefer a custom format over a built-in with the same name', () => {
      const customs = {
        json: () => winston.format((info) => {
          info[MESSAGE] = 'custom-json-override'
          return info
        })()
      }

      const fmt = resolveFormat('json', customs)
      const out = fmt.transform({ level: 'info', message: 'x' })
      out[MESSAGE].should.eql('custom-json-override')
    })

    it('should instantiate a winston format constructor and return an instance', () => {
      const constructor = winston.format((info) => info)
      const fmt = resolveFormat(constructor)
      should(typeof fmt.transform).be.eql('function')
    })

    it('should accept and return a winston format instance as-is', () => {
      const instance = winston.format((info) => info)()
      const fmt = resolveFormat(instance)
      should(fmt).equal(instance)
    })

    it('should throw on non-string non-format input', () => {
      ;(() => resolveFormat(42)).should.throw(/must be a string name or a winston format/)
      ;(() => resolveFormat({})).should.throw(/must be a string name or a winston format/)
    })
  })

  describe('loadCustomFormats', () => {
    it('should return an empty object for null/undefined input', () => {
      loadCustomFormats(null).should.eql({})
      loadCustomFormats(undefined).should.eql({})
    })

    it('should throw if formats config is an array', () => {
      ;(() => loadCustomFormats([])).should.throw(/must be an object/)
    })

    it('should load a fixture format module and produce a callable factory', () => {
      const loaded = loadCustomFormats({
        mycustom: { module: customFixturePath, options: { prefix: 'XYZ' } }
      })

      loaded.should.have.property('mycustom')
      should(typeof loaded.mycustom).be.eql('function')

      const fmt = loaded.mycustom()
      should(typeof fmt.transform).be.eql('function')

      const out = fmt.transform({ level: 'info', message: 'hi' })
      out[MESSAGE].should.eql('XYZ: hi')
    })

    it('should default options to {} when omitted', () => {
      const loaded = loadCustomFormats({
        mycustom: { module: customFixturePath }
      })

      const fmt = loaded.mycustom()
      const out = fmt.transform({ level: 'info', message: 'hi' })
      // fixture defaults prefix to 'CUSTOM'
      out[MESSAGE].should.eql('CUSTOM: hi')
    })

    it('should throw on missing module string', () => {
      ;(() => loadCustomFormats({ bad: {} })).should.throw(/option "module" must be a non-empty string/)
    })

    it('should throw with a helpful message on module not found', () => {
      ;(() => loadCustomFormats({
        bad: { module: 'definitely-not-a-real-module-xyz' }
      })).should.throw(/module "definitely-not-a-real-module-xyz" not found/)
    })

    it('should throw if entry is null', () => {
      ;(() => loadCustomFormats({ bad: null })).should.throw(/must be an object/)
    })
  })

  describe('createJsonLoggerFormat', () => {
    it('should set info[MESSAGE] to a JSON string with level, message, timestamp', () => {
      const fmt = createJsonLoggerFormat()()
      const out = fmt.transform({
        level: 'info',
        message: 'hello',
        timestamp: 1700000000000
      })

      const parsed = JSON.parse(out[MESSAGE])
      parsed.should.have.property('level', 'info')
      parsed.should.have.property('message', 'hello')
      parsed.should.have.property('timestamp')
      // timestamp should be ISO formatted
      parsed.timestamp.should.match(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should preserve arbitrary metadata fields in the JSON payload', () => {
      const fmt = createJsonLoggerFormat()()
      const out = fmt.transform({
        level: 'warn',
        message: 'msg',
        templateName: 'invoice',
        operationId: 'op-1'
      })

      const parsed = JSON.parse(out[MESSAGE])
      parsed.should.have.property('templateName', 'invoice')
      parsed.should.have.property('operationId', 'op-1')
    })

    it('should not include the internal "userLevel" hint', () => {
      const fmt = createJsonLoggerFormat()()
      const out = fmt.transform({
        level: 'info',
        message: 'hello',
        userLevel: true
      })

      const parsed = JSON.parse(out[MESSAGE])
      parsed.should.not.have.property('userLevel')
    })

    it('should generate a timestamp if missing', () => {
      const fmt = createJsonLoggerFormat()()
      const info = { level: 'info', message: 'hello' }
      const out = fmt.transform(info)

      const parsed = JSON.parse(out[MESSAGE])
      parsed.should.have.property('timestamp')
      // info.timestamp should also be assigned (numeric)
      should(info.timestamp).be.a.Number()
    })
  })

  describe('integration with normalizeMeta + json format', () => {
    it('should pipe meta through normalize then JSON via winston.combine', () => {
      const createNormalizeMetaLoggerFormat = require('../lib/main/createNormalizeMetaLoggerFormat')
      const combined = winston.format.combine(
        createNormalizeMetaLoggerFormat()(),
        createJsonLoggerFormat()()
      )

      const out = combined.transform({
        level: 'info',
        message: 'hi',
        timestamp: 1700000000000
      })

      const parsed = JSON.parse(out[MESSAGE])
      parsed.should.have.property('level', 'info')
      parsed.should.have.property('message', 'hi')
    })
  })
})
