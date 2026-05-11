const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const fsAsync = require('fs/promises')
const path = require('path')
const should = require('should')
const { nodeListToArray } = require('../lib/utils')
const { getDocumentsFromPptx } = require('./utils')

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

    await fsAsync.writeFile(outputPath, await result.output.getBuffer())

    const [slideDoc] = await getDocumentsFromPptx(result, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(slideDoc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aRPrEl = aREl.getElementsByTagName('a:rPr')[0]
      const aSolidFill = aRPrEl != null ? aRPrEl.getElementsByTagName('a:solidFill')[0] : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

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
    }

    should(matches).containEql('something blue')
    should(matches).containEql('don’t color me')
    should(matches).containEql('something red')
    should(matches).containEql('heading')
    should(matches).containEql('kind of paragraph.')
    should(matches).containEql('Even with a list')
    should(matches).containEql('With two items')
    should(matches).containEql('Greeen')
  })

  it('style - textColor nested', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-textcolor-nested.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(doc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aRPrEl = nodeListToArray(aREl.childNodes).find((node) => node.tagName === 'a:rPr')
      const aSolidFill = aRPrEl != null ? aRPrEl.getElementsByTagName('a:solidFill')[0] : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      switch (aTEl.textContent.trim()) {
        case 'a':
        case 'h':
        case 'i':
        case 'j':
        case 'o':
          should(aColorEl).be.not.ok()
          break
        case 'b':
        case 'c':
        case 'g':
        case 'k':
        case 'n':
          aColorEl.getAttribute('val').should.be.eql(targetColors.one)
          break
        case 'd':
        case 'e':
        case 'f':
        case 'l':
        case 'm':
          aColorEl.getAttribute('val').should.be.eql(targetColors.two)
          break
        default:
          throw new Error(`Unexpected text "${aTEl.textContent}"`)
      }
    }

    should(matches).containEql('a')
    should(matches).containEql('b')
    should(matches).containEql('c')
    should(matches).containEql('d')
    should(matches).containEql('e')
    should(matches).containEql('f')
    should(matches).containEql('g')
    should(matches).containEql('h')
    should(matches).containEql('i')
    should(matches).containEql('j')
    should(matches).containEql('k')
    should(matches).containEql('l')
    should(matches).containEql('m')
    should(matches).containEql('n')
    should(matches).containEql('o')
  })

  it('style - textColor across table cells', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-textcolor-across-cells.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(doc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aRPrEl = nodeListToArray(aREl.childNodes).find((node) => node.tagName === 'a:rPr')
      const aSolidFill = aRPrEl != null ? aRPrEl.getElementsByTagName('a:solidFill')[0] : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      switch (aTEl.textContent.trim()) {
        case 'a':
        case 'f':
          should(aColorEl).be.not.ok()
          break
        case 'b':
        case 'c':
        case 'd':
        case 'e':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${aTEl.textContent}"`)
      }
    }

    should(matches).containEql('a')
    should(matches).containEql('b')
    should(matches).containEql('c')
    should(matches).containEql('d')
    should(matches).containEql('e')
    should(matches).containEql('f')
  })

  it('style - textColor target paragraph', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-textcolor-target-paragraph.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(doc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aRPrEl = nodeListToArray(aREl.childNodes).find((node) => node.tagName === 'a:rPr')
      const aSolidFill = aRPrEl != null ? aRPrEl.getElementsByTagName('a:solidFill')[0] : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl == null || aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      switch (aTEl.textContent.trim()) {
        case 'c':
          should(aColorEl).be.not.ok()
          break
        case 'a':
        case 'b':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${aTEl.textContent}"`)
      }
    }

    should(matches).containEql('a')
    should(matches).containEql('b')
    should(matches).containEql('c')
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

    await fsAsync.writeFile(outputPath, await result.output.getBuffer())

    const [slideDoc] = await getDocumentsFromPptx(result, ['ppt/slides/slide1.xml'])
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

  it('style - textColor target shape', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-textcolor-target-shape.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result, ['ppt/slides/slide1.xml'])
    const pSpEl = nodeListToArray(doc.getElementsByTagName('p:sp'))

    should(pSpEl.length).be.eql(2)
    should(pSpEl[0].textContent).be.eql('demo')
    should(pSpEl[1].textContent).be.eql('Some textHere and here Another one')

    const aREls = nodeListToArray(pSpEl[1].getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aRPrEl = nodeListToArray(aREl.childNodes).find((node) => node.tagName === 'a:rPr')
      const aSolidFill = aRPrEl != null ? aRPrEl.getElementsByTagName('a:solidFill')[0] : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
    }

    should(matches).containEql('Some text')
    should(matches).containEql('Here and here')
    should(matches).containEql('Another one')
  })

  it('style - textColor target cell', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-textcolor-target-cell.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(doc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aRPrEl = nodeListToArray(aREl.childNodes).find((node) => node.tagName === 'a:rPr')
      const aSolidFill = aRPrEl != null ? aRPrEl.getElementsByTagName('a:solidFill')[0] : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      switch (aTEl.textContent.trim()) {
        case 'c':
          should(aColorEl).be.not.ok()
          break
        case 'a':
        case 'b':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${aTEl.textContent}"`)
      }
    }

    should(matches).containEql('a')
    should(matches).containEql('b')
    should(matches).containEql('c')
  })

  it('style - textColor target row', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-textcolor-target-row.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(doc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aRPrEl = nodeListToArray(aREl.childNodes).find((node) => node.tagName === 'a:rPr')
      const aSolidFill = aRPrEl != null ? aRPrEl.getElementsByTagName('a:solidFill')[0] : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      switch (aTEl.textContent.trim()) {
        case 'd':
        case 'e':
          should(aColorEl).be.not.ok()
          break
        case 'a':
        case 'b':
        case 'c':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${aTEl.textContent}"`)
      }
    }

    should(matches).containEql('a')
    should(matches).containEql('b')
    should(matches).containEql('c')
    should(matches).containEql('d')
    should(matches).containEql('e')
  })

  it('style - textColor target row with dynamic cells', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-textcolor-target-row-dynamic-cells.pptx'))
          }
        },
        helpers: `
          function getColor (rowIndex, colors) {
            if (rowIndex % 2 === 0) {
              return colors.one
            }

            return colors.two
          }
        `
      },
      data: {
        rowsItems: [
          ['Jan', 'jan.blaha@foo.com'],
          ['Boris', 'boris@foo.met'],
          ['Pavel', 'pavel@foo.met']
        ],
        columnsItems: ['Name', 'Email'],
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result.content, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(doc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aRPrEl = nodeListToArray(aREl.childNodes).find((node) => node.tagName === 'a:rPr')
      const aSolidFill = aRPrEl != null ? aRPrEl.getElementsByTagName('a:solidFill')[0] : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      switch (aTEl.textContent.trim()) {
        case '0-0':
        case '0-1':
        case '2-0':
        case '2-1':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
          break
        case '1-0':
        case '1-1':
        case '3-0':
        case '3-1':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.two)
          break
        default:
          throw new Error(`Unexpected text "${aTEl.textContent}"`)
      }
    }

    should(matches).containEql('0-0')
    should(matches).containEql('0-1')
    should(matches).containEql('1-0')
    should(matches).containEql('1-1')
    should(matches).containEql('2-0')
    should(matches).containEql('2-1')
    should(matches).containEql('3-0')
    should(matches).containEql('3-1')
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

    await fsAsync.writeFile(outputPath, await result.output.getBuffer())

    const [doc] = await getDocumentsFromPptx(result, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(doc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const arPrEl = aREl.getElementsByTagName('a:rPr')[0]
      const aHighlight = arPrEl != null ? arPrEl.getElementsByTagName('a:highlight')[0] : undefined
      const aColorEl = aHighlight != null ? aHighlight.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      switch (aTEl.textContent.trim()) {
        case 'something blue':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
          break
        case 'don’t color me':
        case 'Greeen':
          should(aColorEl).be.not.ok()
          break
        case 'something red':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.two)
          break
        case 'This':
        case 'is':
        case 'heading':
        case '1':
        case 'And this is some kind of paragraph.':
        case 'Even with a list':
        case 'With two items':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.three)
          break
        default:
          throw new Error(`Unexpected text "${aTEl.textContent}"`)
      }
    }

    should(matches).containEql('something blue')
    should(matches).containEql('don’t color me')
    should(matches).containEql('something red')
    should(matches).containEql('This')
    should(matches).containEql('is')
    should(matches).containEql('heading')
    should(matches).containEql('1')
    should(matches).containEql('And this is some kind of paragraph.')
    should(matches).containEql('Even with a list')
    should(matches).containEql('With two items')
    should(matches).containEql('Greeen')
  })

  it('style - backgroundColor nested', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-backgroundcolor-nested.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(doc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aRPrEl = nodeListToArray(aREl.childNodes).find((node) => node.tagName === 'a:rPr')
      const aHighlight = aRPrEl != null ? aRPrEl.getElementsByTagName('a:highlight')[0] : undefined
      const aColorEl = aHighlight != null ? aHighlight.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      switch (aTEl.textContent.trim()) {
        case 'a':
        case 'h':
        case 'i':
        case 'j':
        case 'o':
          should(aColorEl).be.not.ok()
          break
        case 'b':
        case 'c':
        case 'g':
        case 'k':
        case 'n':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
          break
        case 'd':
        case 'e':
        case 'f':
        case 'l':
        case 'm':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.two)
          break
        default:
          throw new Error(`Unexpected text "${aTEl.textContent}"`)
      }
    }

    should(matches).containEql('a')
    should(matches).containEql('b')
    should(matches).containEql('c')
    should(matches).containEql('d')
    should(matches).containEql('e')
    should(matches).containEql('f')
    should(matches).containEql('g')
    should(matches).containEql('h')
    should(matches).containEql('i')
    should(matches).containEql('j')
    should(matches).containEql('k')
    should(matches).containEql('l')
    should(matches).containEql('m')
    should(matches).containEql('n')
    should(matches).containEql('o')
  })

  it('style - backgroundColor across table cells', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-backgroundcolor-across-cells.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(doc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aRPrEl = nodeListToArray(aREl.childNodes).find((node) => node.tagName === 'a:rPr')
      const aHighlight = aRPrEl != null ? aRPrEl.getElementsByTagName('a:highlight')[0] : undefined
      const aColorEl = aHighlight != null ? aHighlight.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      switch (aTEl.textContent.trim()) {
        case 'a':
        case 'f':
          should(aColorEl).be.not.ok()
          break
        case 'b':
        case 'c':
        case 'd':
        case 'e':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${aTEl.textContent}"`)
      }
    }

    should(matches).containEql('a')
    should(matches).containEql('b')
    should(matches).containEql('c')
    should(matches).containEql('d')
    should(matches).containEql('e')
    should(matches).containEql('f')
  })

  it('style - backgroundColor target paragraph', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-backgroundcolor-target-paragraph.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(doc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aRPrEl = nodeListToArray(aREl.childNodes).find((node) => node.tagName === 'a:rPr')
      const aHighlight = aRPrEl != null ? aRPrEl.getElementsByTagName('a:highlight')[0] : undefined
      const aColorEl = aHighlight != null ? aHighlight.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      switch (aTEl.textContent.trim()) {
        case 'c':
          should(aColorEl).be.not.ok()
          break
        case 'a':
        case 'b':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${aTEl.textContent}"`)
      }
    }

    should(matches).containEql('a')
    should(matches).containEql('b')
    should(matches).containEql('c')
  })

  it('style - backgroundColor target shape', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-backgroundcolor-target-shape.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result, ['ppt/slides/slide1.xml'])
    const pSpEl = nodeListToArray(doc.getElementsByTagName('p:sp'))

    should(pSpEl.length).be.eql(2)
    should(pSpEl[0].textContent).be.eql('demo')
    should(pSpEl[1].textContent).be.eql('Some textHere and here Another one')

    const aREls = nodeListToArray(pSpEl[1].getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const pspPrEl = nodeListToArray(pSpEl[1].childNodes).find((node) => node.tagName === 'p:spPr')
      const aSolidFill = pspPrEl != null ? nodeListToArray(pspPrEl.childNodes).find((node) => node.tagName === 'a:solidFill') : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
    }

    should(matches).containEql('Some text')
    should(matches).containEql('Here and here')
    should(matches).containEql('Another one')
  })

  it('style - backgroundColor target cell', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-backgroundcolor-target-cell.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(doc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aTcPrEl = nodeListToArray(aREl.parentNode.parentNode.parentNode.childNodes).find((node) => node.tagName === 'a:tcPr')
      const aSolidFill = aTcPrEl != null ? nodeListToArray(aTcPrEl.childNodes).find((node) => node.tagName === 'a:solidFill') : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      switch (aTEl.textContent.trim()) {
        case 'c':
          should(aColorEl).be.not.ok()
          break
        case 'a':
        case 'b':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${aTEl.textContent}"`)
      }
    }

    should(matches).containEql('a')
    should(matches).containEql('b')
    should(matches).containEql('c')
  })

  it('style - backgroundColor target row', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-backgroundcolor-target-row.pptx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(doc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aTcPrEl = nodeListToArray(aREl.parentNode.parentNode.parentNode.childNodes).find((node) => node.tagName === 'a:tcPr')
      const aSolidFill = aTcPrEl != null ? nodeListToArray(aTcPrEl.childNodes).find((node) => node.tagName === 'a:solidFill') : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      switch (aTEl.textContent.trim()) {
        case 'd':
        case 'e':
          should(aColorEl).be.not.ok()
          break
        case 'a':
        case 'b':
        case 'c':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${aTEl.textContent}"`)
      }
    }

    should(matches).containEql('a')
    should(matches).containEql('b')
    should(matches).containEql('c')
    should(matches).containEql('d')
    should(matches).containEql('e')
  })

  it('style - backgroundColor target row with dynamic cells', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'style-backgroundcolor-target-row-dynamic-cells.pptx'))
          }
        },
        helpers: `
          function getColor (rowIndex, colors) {
            if (rowIndex % 2 === 0) {
              return colors.one
            }

            return colors.two
          }
        `
      },
      data: {
        rowsItems: [
          ['Jan', 'jan.blaha@foo.com'],
          ['Boris', 'boris@foo.met'],
          ['Pavel', 'pavel@foo.met']
        ],
        columnsItems: ['Name', 'Email'],
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromPptx(result, ['ppt/slides/slide1.xml'])
    const aREls = nodeListToArray(doc.getElementsByTagName('a:r'))

    const matches = []

    for (const aREl of aREls) {
      const aTcPrEl = nodeListToArray(aREl.parentNode.parentNode.parentNode.childNodes).find((node) => node.tagName === 'a:tcPr')
      const aSolidFill = aTcPrEl != null ? nodeListToArray(aTcPrEl.childNodes).find((node) => node.tagName === 'a:solidFill') : undefined
      const aColorEl = aSolidFill != null ? aSolidFill.getElementsByTagName('a:srgbClr')[0] : undefined
      const aTEl = aREl.getElementsByTagName('a:t')[0]

      if (aTEl.textContent?.trim() === '') {
        continue
      }

      matches.push(aTEl.textContent.trim())

      switch (aTEl.textContent.trim()) {
        case '0-0':
        case '0-1':
        case '2-0':
        case '2-1':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.one)
          break
        case '1-0':
        case '1-1':
        case '3-0':
        case '3-1':
          should(aColorEl.getAttribute('val')).be.eql(targetColors.two)
          break
        default:
          throw new Error(`Unexpected text "${aTEl.textContent}"`)
      }
    }

    should(matches).containEql('0-0')
    should(matches).containEql('0-1')
    should(matches).containEql('1-0')
    should(matches).containEql('1-1')
    should(matches).containEql('2-0')
    should(matches).containEql('2-1')
    should(matches).containEql('3-0')
    should(matches).containEql('3-1')
  })
})
