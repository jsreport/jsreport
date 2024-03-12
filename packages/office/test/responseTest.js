const should = require('should')
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

    const content = await response({
      previewOptions: { },
      officeDocumentType: 'docx',
      buffer: Buffer.from('hello'),
      logger: createFakeLogger()
    }, req, res)

    should(res.meta.contentType).be.eql('text/html')
    should(content.toString()).containEql('<html>')
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

    const content = await response({
      previewOptions: {
        publicUri: 'https://notexistingwebxxxyyyyy.com'
      },
      officeDocumentType: 'docx',
      buffer: Buffer.from('hello'),
      logger: createFakeLogger()
    }, req, res)

    should(content.toString()).be.eql('hello')
  })
})

function createFakeLogger () {
  return {
    debug: (m) => {
      console.log(m)
    },
    error: (m) => {
      console.error(m)
    }
  }
}
