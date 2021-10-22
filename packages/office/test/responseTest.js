require('should')
const response = require('../lib/response')

describe('response', () => {
  it('should return iframe for preview', async () => {
    const req = {
      options: {
        preview: true
      }
    }
    const res = {
      meta: {}
    }
    await response({
      previewOptions: { },
      officeDocumentType: 'docx',
      buffer: Buffer.from('hello')
    }, req, res)

    res.meta.contentType.should.be.eql('text/html')
    res.content.toString().should.containEql('<html>')
  })

  it('should return content when preview upload fails', async () => {
    const req = {
      options: {
        preview: true
      }
    }
    const res = {
      meta: {}
    }
    await response({
      previewOptions: {
        publicUri: 'https://notexistingwebxxxyyyyy.com'
      },
      officeDocumentType: 'docx',
      buffer: Buffer.from('hello'),
      logger: {
        error: (m) => {
          console.error(m)
        }
      }
    }, req, res)

    res.content.toString().should.be.eql('hello')
  })
})
