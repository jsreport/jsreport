const should = require('should')
const XlsxPopulate = require('xlsx-populate')
const Encryptor = require('xlsx-populate/lib/Encryptor')
const jsreport = require('@jsreport/jsreport-core')

describe('office-password', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      encryption: {
        secretKey: '1111111811111118'
      }
    }).use(require('../')())
      .use(require('@jsreport/jsreport-html-to-xlsx')())
    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('should produce office document with password', async () => {
    const password = 'foo'

    const t = await reporter.documentStore.collection('templates').insert({
      name: 'a',
      content: `
      <table>
        <tr>
          <td>Testing</td>
        </tr>
      </table>
      `,
      engine: 'none',
      recipe: 'html-to-xlsx',
      officePassword: {
        passwordRaw: password,
        enabled: true
      }
    })

    const result = await reporter.render({
      template: {
        shortid: t.shortid
      }
    })

    const encryptor = new Encryptor()

    const rawDoc = await encryptor.decryptAsync(result.content, password)

    // the decrypt does not fail but it produces corrupted document
    // in case you pass wrong password, so we try to read the doc and check for value
    const workbook = await XlsxPopulate.fromDataAsync(rawDoc)

    workbook.sheet(0).cell(1, 1).value().should.be.eql('Testing')
  })

  it('should use password when it is inline in the request', async () => {
    const password = 'foo'

    const result = await reporter.render({
      template: {
        content: `
        <table>
          <tr>
            <td>Testing</td>
          </tr>
        </table>
        `,
        engine: 'none',
        recipe: 'html-to-xlsx',
        officePassword: {
          password
        }
      }
    })

    const encryptor = new Encryptor()

    const rawDoc = await encryptor.decryptAsync(result.content, password)

    // the decrypt does not fail but it produces corrupted document
    // in case you pass wrong password, so we try to read the doc and check for value
    const workbook = await XlsxPopulate.fromDataAsync(rawDoc)

    workbook.sheet(0).cell(1, 1).value().should.be.eql('Testing')
  })

  it('should prefer inline password than stored one', async () => {
    const password = 'bar'

    const t = await reporter.documentStore.collection('templates').insert({
      name: 'a',
      content: `
      <table>
        <tr>
          <td>Testing</td>
        </tr>
      </table>
      `,
      engine: 'none',
      recipe: 'html-to-xlsx',
      officePassword: {
        passwordRaw: 'foo',
        enabled: true
      }
    })

    const result = await reporter.render({
      template: {
        shortid: t.shortid,
        officePassword: {
          password
        }
      }
    })

    const encryptor = new Encryptor()

    const rawDoc = await encryptor.decryptAsync(result.content, password)

    // the decrypt does not fail but it produces corrupted document
    // in case you pass wrong password, so we try to read the doc and check for value
    const workbook = await XlsxPopulate.fromDataAsync(rawDoc)

    workbook.sheet(0).cell(1, 1).value().should.be.eql('Testing')
  })

  it('should crypt password before insert', async () => {
    const res = await reporter.documentStore.collection('templates').insert({
      name: 'a',
      content: 'hello',
      engine: 'none',
      recipe: 'html',
      officePassword: {
        passwordRaw: 'foo'
      }
    })

    should(res.officePassword.passwordRaw).be.null()
    res.officePassword.passwordSecure.should.not.be.eql('foo')
    res.officePassword.passwordFilled.should.be.true()
  })

  it('should crypt password before update', async () => {
    await reporter.documentStore.collection('templates').insert({
      name: 'a',
      engine: 'none',
      recipe: 'html'
    })

    await reporter.documentStore.collection('templates').update({ name: 'a' }, {
      $set: {
        officePassword: {
          passwordRaw: 'foo'
        }
      }
    })

    const entity = await reporter.documentStore.collection('templates').findOne({
      name: 'a'
    })

    should(entity.officePassword.passwordRaw).be.null()
    entity.officePassword.passwordSecure.should.not.be.eql('foo')
    entity.officePassword.passwordFilled.should.be.true()
  })

  it('shoud not fail for none pdf recipe', async () => {
    await reporter.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'html',
        officePassword: {
          passwordRaw: 'foo',
          enabled: true
        }
      }
    })
  })
})
