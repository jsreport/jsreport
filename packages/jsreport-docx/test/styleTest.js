const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const { nodeListToArray } = require('../lib/utils')
const { getDocumentsFromDocxBuf } = require('./utils')

describe('docx style', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      store: {
        provider: 'memory'
      }
    })
      .use(require('../')())
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('@jsreport/jsreport-assets')())
      .use(jsreport.tests.listeners())
    return reporter.init()
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  it('style - textColor', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000',
      three: 'AA5500',
      four: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'style-textcolor.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    wREls.should.matchEach((wREl) => {
      const wRPrEl = wREl.getElementsByTagName('w:rPr')[0]
      const wColorEl = wRPrEl != null ? wRPrEl.getElementsByTagName('w:color')[0] : undefined
      const wTEl = wREl.getElementsByTagName('w:t')[0]

      if (wTEl == null || wColorEl == null) {
        return
      }

      if (wTEl.textContent.includes('blue')) {
        wColorEl.getAttribute('w:val').should.be.eql(targetColors.one)
      } else if (wTEl.textContent.includes('red')) {
        wColorEl.getAttribute('w:val').should.be.eql(targetColors.two)
      } else if (
        wTEl.textContent.includes('This is heading') ||
        wTEl.textContent.includes('And this is some kind') ||
        wTEl.textContent.includes('Even with a list')
      ) {
        wColorEl.getAttribute('w:val').should.be.eql(targetColors.three)
      } else if (wTEl.textContent.includes('Greeen')) {
        wColorEl.getAttribute('w:val').should.be.eql('92D050')
      } else if (wTEl.textContent.includes('asd')) {
        wColorEl.getAttribute('w:val').should.be.eql(targetColors.four)
      }
    })
  })

  it('style - backgroundColor', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000',
      three: 'AA5500',
      four: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'style-backgroundcolor.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wpEls = nodeListToArray(doc.getElementsByTagName('w:p'))

    wpEls.should.matchEach((wpEl) => {
      const wpPrEl = wpEl.getElementsByTagName('w:pPr')[0]
      const wshdEl = wpPrEl != null ? wpPrEl.getElementsByTagName('w:shd')[0] : undefined
      const text = nodeListToArray(wpEl.getElementsByTagName('w:t')).map((tEl) => tEl.textContent).join(' ')

      if (text == null || wshdEl == null) {
        return
      }

      if (text.includes('blue') || text.includes('red')) {
        wshdEl.getAttribute('w:fill').should.be.eql(targetColors.two)
      } else if (
        text.includes('This is heading') ||
        text.includes('And this is some kind') ||
        text.includes('Even with a list')
      ) {
        wshdEl.getAttribute('w:fill').should.be.eql(targetColors.three)
      } else if (text.includes('asd')) {
        wshdEl.getAttribute('w:fill').should.be.eql(targetColors.four)
      }
    })
  })

  it('style in document header', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000',
      three: 'AA5500',
      four: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'style-header.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const targetDocs = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml'])

    for (const targetDoc of targetDocs) {
      if (targetDoc == null) {
        continue
      }

      const wREls = nodeListToArray(targetDoc.getElementsByTagName('w:r'))

      wREls.should.matchEach((wREl) => {
        const wRPrEl = wREl.getElementsByTagName('w:rPr')[0]
        const wColorEl = wRPrEl != null ? wRPrEl.getElementsByTagName('w:color')[0] : undefined
        const wTEl = wREl.getElementsByTagName('w:t')[0]

        if (wTEl == null || wColorEl == null) {
          return
        }

        if (wTEl.textContent.includes('blue')) {
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.one)
        } else if (wTEl.textContent.includes('red')) {
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.two)
        } else if (
          wTEl.textContent.includes('This is heading') ||
          wTEl.textContent.includes('And this is some kind') ||
          wTEl.textContent.includes('Even with a list')
        ) {
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.three)
        } else if (wTEl.textContent.includes('Greeen')) {
          wColorEl.getAttribute('w:val').should.be.eql('92D050')
        } else if (wTEl.textContent.includes('asd')) {
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.four)
        }
      })
    }
  })

  it('style in document footer', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000',
      three: 'AA5500',
      four: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'style-footer.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const targetDocs = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'])

    for (const targetDoc of targetDocs) {
      if (targetDoc == null) {
        continue
      }

      const wREls = nodeListToArray(targetDoc.getElementsByTagName('w:r'))

      wREls.should.matchEach((wREl) => {
        const wRPrEl = wREl.getElementsByTagName('w:rPr')[0]
        const wColorEl = wRPrEl != null ? wRPrEl.getElementsByTagName('w:color')[0] : undefined
        const wTEl = wREl.getElementsByTagName('w:t')[0]

        if (wTEl == null || wColorEl == null) {
          return
        }

        if (wTEl.textContent.includes('blue')) {
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.one)
        } else if (wTEl.textContent.includes('red')) {
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.two)
        } else if (
          wTEl.textContent.includes('This is heading') ||
          wTEl.textContent.includes('And this is some kind') ||
          wTEl.textContent.includes('Even with a list')
        ) {
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.three)
        } else if (wTEl.textContent.includes('Greeen')) {
          wColorEl.getAttribute('w:val').should.be.eql('92D050')
        } else if (wTEl.textContent.includes('asd')) {
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.four)
        }
      })
    }
  })

  it('style in document header and footer', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000',
      three: 'AA5500',
      four: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'style-header-footer.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const targetDocs = await getDocumentsFromDocxBuf(result.content, [
      'word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
      'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'
    ])

    for (const targetDoc of targetDocs) {
      if (targetDoc == null) {
        continue
      }

      const wREls = nodeListToArray(targetDoc.getElementsByTagName('w:r'))

      wREls.should.matchEach((wREl) => {
        const wRPrEl = wREl.getElementsByTagName('w:rPr')[0]
        const wColorEl = wRPrEl != null ? wRPrEl.getElementsByTagName('w:color')[0] : undefined
        const wTEl = wREl.getElementsByTagName('w:t')[0]

        if (wTEl == null || wColorEl == null) {
          return
        }

        if (wTEl.textContent.includes('blue')) {
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.one)
        } else if (wTEl.textContent.includes('red')) {
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.two)
        } else if (
          wTEl.textContent.includes('This is heading') ||
          wTEl.textContent.includes('And this is some kind') ||
          wTEl.textContent.includes('Even with a list')
        ) {
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.three)
        } else if (wTEl.textContent.includes('Greeen')) {
          wColorEl.getAttribute('w:val').should.be.eql('92D050')
        } else if (wTEl.textContent.includes('asd')) {
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.four)
        }
      })
    }
  })
})
