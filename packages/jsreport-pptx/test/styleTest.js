const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const { nodeListToArray } = require('../lib/utils')
const { getDocumentsFromPptxBuf } = require('./utils')

const pptxDirPath = path.join(__dirname, './pptx')
const outputPath = path.join(__dirname, '../out.pptx')

describe('pptx style', () => {
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
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-textcolor.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [slideDoc] = await getDocumentsFromPptxBuf(result.content, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(slideDoc.getElementsByTagName('a:r'))

    aREls.should.matchEach((aREl, aIdx) => {
      const aRPrEl = aREl.getElementsByTagName('a:rPr')[0]
      const aSolidFill = aRPrEl != null ? aRPrEl.getElementsByTagName('a:solidFill')[0] : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:schemeClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl == null || aColorEl == null) {
        return
      }

      if (aTEl.textContent.includes('blue')) {
        aColorEl.getAttribute('val').should.be.eql(targetColors.one)
      } else if (aTEl.textContent.includes('red')) {
        aColorEl.getAttribute('val').should.be.eql(targetColors.two)
      } else if (
        aTEl.textContent.includes('This is heading') ||
        aTEl.textContent.includes('And this is some kind') ||
        aTEl.textContent.includes('Even with a list')
      ) {
        aColorEl.getAttribute('val').should.be.eql(targetColors.three)
      } else if (aTEl.textContent.includes('Greeen')) {
        aColorEl.getAttribute('val').should.be.eql('92D050')
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
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-backgroundcolor.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptxBuf(result.content, ['ppt/slides/slide1.xml'])
    const apEls = nodeListToArray(doc.getElementsByTagName('a:p'))

    apEls.should.matchEach((apEl) => {
      const arPrEl = apEl.getElementsByTagName('a:rPr')[0]
      const aHighlight = arPrEl != null ? arPrEl.getElementsByTagName('a:highlight')[0] : undefined
      const colorEl = aHighlight != null ? aHighlight.getElementsByTagName('a:schemeClr')[0] : undefined
      const text = nodeListToArray(apEl.getElementsByTagName('a:t')).map((tEl) => tEl.textContent).join(' ')

      if (text == null || colorEl == null) {
        return
      }

      if (text.includes('blue') || text.includes('red')) {
        colorEl.getAttribute('val').should.be.eql(targetColors.two)
      } else if (
        text.includes('This is heading') ||
        text.includes('And this is some kind') ||
        text.includes('Even with a list')
      ) {
        colorEl.getAttribute('val').should.be.eql(targetColors.three)
      } else if (text.includes('asd')) {
        colorEl.getAttribute('val').should.be.eql(targetColors.four)
      }
    })
  })

  it('style - textColor and backgroundColor', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000',
      three: 'AA5500',
      four: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-backgroundcolor-and-textcolor.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [slideDoc] = await getDocumentsFromPptxBuf(result.content, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(slideDoc.getElementsByTagName('a:r'))

    aREls.should.matchEach((aREl, aIdx) => {
      const aRPrEl = aREl.getElementsByTagName('a:rPr')[0]
      const aHighlight = aRPrEl != null ? aRPrEl.getElementsByTagName('a:highlight')[0] : undefined
      const aBackgroundColorEl = aHighlight != null ? aHighlight.getElementsByTagName('a:schemeClr')[0] : undefined
      const aSolidFill = aRPrEl != null ? aRPrEl.getElementsByTagName('a:solidFill')[0] : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:schemeClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl == null || (aColorEl == null && aBackgroundColorEl == null)) {
        return
      }

      if (aTEl.textContent.includes('blue')) {
        aColorEl.getAttribute('val').should.be.eql(targetColors.one)
        aBackgroundColorEl.getAttribute('val').should.be.eql(targetColors.two)
      } else if (aTEl.textContent.includes('red')) {
        aColorEl.getAttribute('val').should.be.eql(targetColors.two)
        aBackgroundColorEl.getAttribute('val').should.be.eql(targetColors.three)
      } else if (
        aTEl.textContent.includes('This is heading') ||
        aTEl.textContent.includes('And this is some kind') ||
        aTEl.textContent.includes('Even with a list')
      ) {
        aColorEl.getAttribute('val').should.be.eql(targetColors.three)
        aBackgroundColorEl.getAttribute('val').should.be.eql(targetColors.one)
      } else if (aTEl.textContent.includes('Greeen')) {
        aColorEl.getAttribute('val').should.be.eql('92D050')
      }
    })
  })
})
