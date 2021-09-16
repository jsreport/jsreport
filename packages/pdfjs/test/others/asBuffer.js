const test = require('tape')
const fs   = require('fs')
const path = require('path')
const fixtures = require('../fixtures')
const pdf = require('../../lib')

const f = fixtures.create();

test('asBuffer', function(t) {
  let doc = new pdf.Document({
    font:       f.font.afm.regular,
    padding:    10,
    lineHeight: 1,
    properties: {
      creationDate: new Date(2015, 1, 19, 22, 33, 26),
      producer: 'pdfjs tests (github.com/rkusa/pdfjs)'
    }
  })
  doc.info.id = '42'
  doc.text(f.lorem.shorter)

  const expectationPath = path.join(__dirname, 'asBuffer.pdf')
  const resultPath = path.join(__dirname, 'asBuffer.result.pdf')
  const w = fs.createWriteStream(resultPath)
  doc.asBuffer()
    .then(data => {
      w.write(data)
      w.close(err => {
        if (err) {
          t.error(err)
          return
        }

        try {
          var result = fs.readFileSync(resultPath, 'binary')
          var expectation = fs.readFileSync(expectationPath, 'binary')
        } catch (err) {
          t.error(err)
        }

        t.ok(result === expectation, 'asBuffer')
        t.end()
      })
    })
    .catch(t.error)
})
