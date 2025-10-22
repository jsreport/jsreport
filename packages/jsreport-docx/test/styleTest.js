const should = require('should')
const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const { nodeListToArray } = require('../lib/utils')
const { getDocumentsFromDocxBuf, getTextNodesMatching } = require('./utils')

const docxDirPath = path.join(__dirname, './docx')
const outputPath = path.join(__dirname, '../out.docx')

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
            content: fs.readFileSync(path.join(docxDirPath, 'style-textcolor.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
      const wColorEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find((node) => node.tagName === 'w:color') : undefined
      const wTEl = wREl.getElementsByTagName('w:t')[0]

      if (!wTEl || wTEl.textContent === '') {
        continue
      }

      if (wTEl.textContent.includes('blue')) {
        should(wColorEl.getAttribute('w:val')).be.eql(targetColors.one)
      } else if (wTEl.textContent.includes('red')) {
        should(wColorEl.getAttribute('w:val')).be.eql(targetColors.two)
      } else if (
        wTEl.textContent.includes('This is heading') ||
        wTEl.textContent.includes('And this is some kind') ||
        wTEl.textContent.includes('Even with a list')
      ) {
        should(wColorEl.getAttribute('w:val')).be.eql(targetColors.three)
      } else if (wTEl.textContent.includes('Greeen')) {
        should(wColorEl.getAttribute('w:val')).be.eql('92D050')
      } else if (wTEl.textContent.includes('asd')) {
        should(wColorEl.getAttribute('w:val')).be.eql(targetColors.four)
      }
    }
  })

  it('style - textColor nested', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-textcolor-nested.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
      const wColorEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find((node) => node.tagName === 'w:color') : undefined
      const wTEl = wREl.getElementsByTagName('w:t')[0]

      if (wTEl.textContent === '') {
        continue
      }

      switch (wTEl.textContent) {
        case 'a':
        case 'h':
        case 'i':
        case 'j':
        case 'o':
          should(wColorEl).be.not.ok()
          break
        case 'b':
        case 'c':
        case 'g':
        case 'k':
        case 'n':
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.one)
          break
        case 'd':
        case 'e':
        case 'f':
        case 'l':
        case 'm':
          wColorEl.getAttribute('w:val').should.be.eql(targetColors.two)
          break
        default:
          throw new Error(`Unexpected text "${wTEl.textContent}"`)
      }
    }
  })

  it('style - textColor across table cells', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-textcolor-across-cells.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
      const wColorEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find((node) => node.tagName === 'w:color') : undefined
      const wTEl = wREl.getElementsByTagName('w:t')[0]

      if (wTEl.textContent === '') {
        continue
      }

      switch (wTEl.textContent) {
        case 'a':
        case 'f':
          should(wColorEl).be.not.ok()
          break
        case 'b':
        case 'c':
        case 'd':
        case 'e':
          should(wColorEl.getAttribute('w:val')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${wTEl.textContent}"`)
      }
    }
  })

  it('style - textColor target paragraph', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-textcolor-target-paragraph.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
      const wcolorEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find((node) => node.tagName === 'w:color') : undefined
      const wTEl = wREl.getElementsByTagName('w:t')[0]

      if (wTEl.textContent === '') {
        continue
      }

      switch (wTEl.textContent) {
        case 'c':
          should(wcolorEl).be.not.ok()
          break
        case 'a':
        case 'b':
          should(wcolorEl.getAttribute('w:val')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${wTEl.textContent}"`)
      }
    }
  })

  it('style - textColor target shape', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-textcolor-target-shape.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wspEl = doc.getElementsByTagName('wps:wsp')[0]
    const wREls = nodeListToArray(wspEl.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
      const wcolorEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find((node) => node.tagName === 'w:color') : undefined
      should(wcolorEl.getAttribute('w:val')).be.eql(targetColors.one)
    }
  })

  it('style - textColor target cell', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-textcolor-target-cell.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
      const wcolorEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find((node) => node.tagName === 'w:color') : undefined
      const wTEl = wREl.getElementsByTagName('w:t')[0]

      if (wTEl.textContent === '') {
        continue
      }

      switch (wTEl.textContent) {
        case 'c':
          should(wcolorEl).be.not.ok()
          break
        case 'a':
        case 'b':
          should(wcolorEl.getAttribute('w:val')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${wTEl.textContent}"`)
      }
    }
  })

  it('style - textColor target row', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-textcolor-target-row.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
      const wcolorEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find((node) => node.tagName === 'w:color') : undefined
      const wTEl = wREl.getElementsByTagName('w:t')[0]

      if (wTEl.textContent === '') {
        continue
      }

      switch (wTEl.textContent) {
        case 'd':
        case 'e':
          should(wcolorEl).be.not.ok()
          break
        case 'a':
        case 'b':
        case 'c':
          should(wcolorEl.getAttribute('w:val')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${wTEl.textContent}"`)
      }
    }
  })

  it('style - textColor target row with dynamic cells', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-textcolor-target-row-dynamic-cells.docx'))
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

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const tcEL = wREl.parentNode.parentNode

      should(tcEL.tagName).be.eql('w:tc')

      const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
      const wcolorEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find((node) => node.tagName === 'w:color') : undefined
      const wpEl = wREl.parentNode

      if (wpEl.textContent === '') {
        continue
      }

      switch (wpEl.textContent) {
        case '0-0':
        case '0-1':
        case '2-0':
        case '2-1':
          should(wcolorEl.getAttribute('w:val')).be.eql(targetColors.one)
          break
        case '1-0':
        case '1-1':
        case '3-0':
        case '3-1':
          should(wcolorEl.getAttribute('w:val')).be.eql(targetColors.two)
          break
        default:
          throw new Error(`Unexpected text "${wpEl.textContent}"`)
      }
    }
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
            content: fs.readFileSync(path.join(docxDirPath, 'style-backgroundcolor.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const textCases = [
      'something blue',
      'color me',
      'something red',
      'heading 1',
      'this some kind of',
      'Even with a',
      'With two',
      'asdadas',
      'dasdasd'
    ]

    const checkBackgroundColor = (textEls, targetBg) => {
      for (const textEl of textEls) {
        const wREl = textEl.parentNode
        const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
        const wshdEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find(node => node.tagName === 'w:shd') : undefined

        if (targetBg != null) {
          should(wshdEl.getAttribute('w:fill')).be.eql(targetBg)
        } else {
          should(wshdEl).be.not.ok()
        }
      }
    }

    for (const textCase of textCases) {
      const textEls = getTextNodesMatching(doc, textCase)

      if (textEls.length === 0) {
        throw new Error(`Expected case "${textCase}" to have matching text elements`)
      }

      switch (textCase) {
        case 'something blue':
          checkBackgroundColor(textEls, targetColors.one)
          break
        case 'color me':
          checkBackgroundColor(textEls, null)
          break
        case 'something red':
          checkBackgroundColor(textEls, targetColors.two)
          break
        case 'heading 1':
        case 'this some kind of':
        case 'Even with a':
        case 'With two':
          checkBackgroundColor(textEls, targetColors.three)
          break
        case 'asdadas':
        case 'dasdasd':
          checkBackgroundColor(textEls, targetColors.four)
          break
        default:
          throw new Error(`Unexpected text case "${textCase}"`)
      }
    }
  })

  it('style - backgroundColor nested', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-backgroundcolor-nested.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
      const wshdEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find((node) => node.tagName === 'w:shd') : undefined
      const wTEl = wREl.getElementsByTagName('w:t')[0]

      if (wTEl.textContent === '') {
        continue
      }

      switch (wTEl.textContent) {
        case 'a':
        case 'h':
        case 'i':
        case 'j':
        case 'o':
          should(wshdEl).be.not.ok()
          break
        case 'b':
        case 'c':
        case 'g':
        case 'k':
        case 'n':
          should(wshdEl.getAttribute('w:fill')).be.eql(targetColors.one)
          break
        case 'd':
        case 'e':
        case 'f':
        case 'l':
        case 'm':
          should(wshdEl.getAttribute('w:fill')).be.eql(targetColors.two)
          break
        default:
          throw new Error(`Unexpected text "${wTEl.textContent}"`)
      }
    }
  })

  it('style - backgroundColor across table cells', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-backgroundcolor-across-cells.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
      const wshdEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find((node) => node.tagName === 'w:shd') : undefined
      const wTEl = wREl.getElementsByTagName('w:t')[0]

      if (wTEl.textContent === '') {
        continue
      }

      switch (wTEl.textContent) {
        case 'a':
        case 'f':
          should(wshdEl).be.not.ok()
          break
        case 'b':
        case 'c':
        case 'd':
        case 'e':
          should(wshdEl.getAttribute('w:fill')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${wTEl.textContent}"`)
      }
    }
  })

  it('style - backgroundColor target paragraph', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-backgroundcolor-target-paragraph.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const wpPrEl = nodeListToArray(wREl.parentNode.childNodes).find((node) => node.tagName === 'w:pPr')
      const wshdEl = wpPrEl != null ? nodeListToArray(wpPrEl.childNodes).find((node) => node.tagName === 'w:shd') : undefined
      const wTEl = wREl.getElementsByTagName('w:t')[0]

      if (wTEl.textContent === '') {
        continue
      }

      switch (wTEl.textContent) {
        case 'c':
          should(wshdEl).be.not.ok()
          break
        case 'a':
        case 'b':
          should(wshdEl.getAttribute('w:fill')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${wTEl.textContent}"`)
      }
    }
  })

  it('style - backgroundColor target shape', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-backgroundcolor-target-shape.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wspEl = doc.getElementsByTagName('wps:wsp')[0]
    const spPrEl = nodeListToArray(wspEl.childNodes).find((node) => node.tagName === 'wps:spPr')
    const solidFillEl = spPrEl != null ? nodeListToArray(spPrEl.childNodes).find((node) => node.tagName === 'a:solidFill') : undefined
    const srgbClrEl = solidFillEl != null ? nodeListToArray(solidFillEl.childNodes).find((node) => node.tagName === 'a:srgbClr') : undefined

    should(srgbClrEl).be.ok()
    should(srgbClrEl.getAttribute('val')).be.eql(targetColors.one)
  })

  it('style - backgroundColor target cell', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-backgroundcolor-target-cell.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const wtcPrEl = nodeListToArray(wREl.parentNode.parentNode.childNodes).find((node) => node.tagName === 'w:tcPr')
      const wshdEl = wtcPrEl != null ? nodeListToArray(wtcPrEl.childNodes).find((node) => node.tagName === 'w:shd') : undefined
      const wTEl = wREl.getElementsByTagName('w:t')[0]

      if (wTEl.textContent === '') {
        continue
      }

      switch (wTEl.textContent) {
        case 'c':
          should(wshdEl).be.not.ok()
          break
        case 'a':
        case 'b':
          should(wshdEl.getAttribute('w:fill')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${wTEl.textContent}"`)
      }
    }
  })

  it('style - backgroundColor target row', async () => {
    const targetColors = {
      one: '0000FF'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-backgroundcolor-target-row.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const wtcPrEl = nodeListToArray(wREl.parentNode.parentNode.childNodes).find((node) => node.tagName === 'w:tcPr')
      const wshdEl = wtcPrEl != null ? nodeListToArray(wtcPrEl.childNodes).find((node) => node.tagName === 'w:shd') : undefined
      const wTEl = wREl.getElementsByTagName('w:t')[0]

      if (wTEl.textContent === '') {
        continue
      }

      switch (wTEl.textContent) {
        case 'd':
        case 'e':
          should(wshdEl).be.not.ok()
          break
        case 'a':
        case 'b':
        case 'c':
          should(wshdEl.getAttribute('w:fill')).be.eql(targetColors.one)
          break
        default:
          throw new Error(`Unexpected text "${wTEl.textContent}"`)
      }
    }
  })

  it('style - backgroundColor target row with dynamic cells', async () => {
    const targetColors = {
      one: '0000FF',
      two: 'FF0000'
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'style-backgroundcolor-target-row-dynamic-cells.docx'))
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

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const wREls = nodeListToArray(doc.getElementsByTagName('w:r'))

    for (const wREl of wREls) {
      const tcEL = wREl.parentNode.parentNode

      should(tcEL.tagName).be.eql('w:tc')

      const tcPrEl = nodeListToArray(tcEL.childNodes).find((node) => node.tagName === 'w:tcPr')
      const wshdEl = tcPrEl != null ? nodeListToArray(tcPrEl.childNodes).find(node => node.tagName === 'w:shd') : undefined
      const wpEl = wREl.parentNode

      if (wpEl.textContent === '') {
        continue
      }

      switch (wpEl.textContent) {
        case '0-0':
        case '0-1':
        case '2-0':
        case '2-1':
          should(wshdEl.getAttribute('w:fill')).be.eql(targetColors.one)
          break
        case '1-0':
        case '1-1':
        case '3-0':
        case '3-1':
          should(wshdEl.getAttribute('w:fill')).be.eql(targetColors.two)
          break
        default:
          throw new Error(`Unexpected text "${wpEl.textContent}"`)
      }
    }
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
            content: fs.readFileSync(path.join(docxDirPath, 'style-header.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const targetDocs = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml'])

    const textCases = [
      'something blue',
      'color me',
      'something red',
      'heading 1',
      'this some kind of',
      'Even with a',
      'With two',
      'Greeen',
      'asdadas',
      'dasdasd'
    ]

    const checkTextColor = (textEls, targetTc) => {
      for (const textEl of textEls) {
        const wREl = textEl.parentNode
        const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
        const wshdEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find(node => node.tagName === 'w:color') : undefined

        if (targetTc != null) {
          should(wshdEl.getAttribute('w:val')).be.eql(targetTc)
        } else {
          should(wshdEl).be.not.ok()
        }
      }
    }

    for (const targetDoc of targetDocs) {
      if (targetDoc == null) {
        continue
      }

      for (const textCase of textCases) {
        const textEls = getTextNodesMatching(targetDoc, textCase)

        if (textEls.length === 0) {
          throw new Error(`Expected case "${textCase}" to have matching text elements`)
        }

        switch (textCase) {
          case 'something blue':
            checkTextColor(textEls, targetColors.one)
            break
          case 'color me':
            checkTextColor(textEls, null)
            break
          case 'something red':
            checkTextColor(textEls, targetColors.two)
            break
          case 'heading 1':
          case 'this some kind of':
          case 'Even with a':
          case 'With two':
            checkTextColor(textEls, targetColors.three)
            break
          case 'Greeen':
            checkTextColor(textEls, '92D050')
            break
          case 'asdadas':
          case 'dasdasd':
            checkTextColor(textEls, targetColors.four)
            break
          default:
            throw new Error(`Unexpected text case "${textCase}"`)
        }
      }
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
            content: fs.readFileSync(path.join(docxDirPath, 'style-footer.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const targetDocs = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'])

    for (const targetDoc of targetDocs) {
      if (targetDoc == null) {
        continue
      }

      const textCases = [
        'something blue',
        'color me',
        'something red',
        'heading 1',
        'this some kind of',
        'Even with a',
        'With two',
        'Greeen',
        'asdadas',
        'dasdasd'
      ]

      const checkTextColor = (textEls, targetTc) => {
        for (const textEl of textEls) {
          const wREl = textEl.parentNode
          const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
          const wshdEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find(node => node.tagName === 'w:color') : undefined

          if (targetTc != null) {
            should(wshdEl.getAttribute('w:val')).be.eql(targetTc)
          } else {
            should(wshdEl).be.not.ok()
          }
        }
      }

      for (const targetDoc of targetDocs) {
        if (targetDoc == null) {
          continue
        }

        for (const textCase of textCases) {
          const textEls = getTextNodesMatching(targetDoc, textCase)

          if (textEls.length === 0) {
            throw new Error(`Expected case "${textCase}" to have matching text elements`)
          }

          switch (textCase) {
            case 'something blue':
              checkTextColor(textEls, targetColors.one)
              break
            case 'color me':
              checkTextColor(textEls, null)
              break
            case 'something red':
              checkTextColor(textEls, targetColors.two)
              break
            case 'heading 1':
            case 'this some kind of':
            case 'Even with a':
            case 'With two':
              checkTextColor(textEls, targetColors.three)
              break
            case 'Greeen':
              checkTextColor(textEls, '92D050')
              break
            case 'asdadas':
            case 'dasdasd':
              checkTextColor(textEls, targetColors.four)
              break
            default:
              throw new Error(`Unexpected text case "${textCase}"`)
          }
        }
      }
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
            content: fs.readFileSync(path.join(docxDirPath, 'style-header-footer.docx'))
          }
        }
      },
      data: {
        colors: targetColors
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const targetDocs = await getDocumentsFromDocxBuf(result.content, [
      'word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
      'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'
    ])

    const textCases = [
      'something blue',
      'color me',
      'something red',
      'heading 1',
      'this some kind of',
      'Even with a',
      'With two',
      'Greeen',
      'asdadas',
      'dasdasd'
    ]

    const checkTextColor = (textEls, targetTc) => {
      for (const textEl of textEls) {
        const wREl = textEl.parentNode
        const wRPrEl = nodeListToArray(wREl.childNodes).find((node) => node.tagName === 'w:rPr')
        const wshdEl = wRPrEl != null ? nodeListToArray(wRPrEl.childNodes).find(node => node.tagName === 'w:color') : undefined

        if (targetTc != null) {
          should(wshdEl.getAttribute('w:val')).be.eql(targetTc)
        } else {
          should(wshdEl).be.not.ok()
        }
      }
    }

    for (const targetDoc of targetDocs) {
      if (targetDoc == null) {
        continue
      }

      for (const textCase of textCases) {
        const textEls = getTextNodesMatching(targetDoc, textCase)

        if (textEls.length === 0) {
          throw new Error(`Expected case "${textCase}" to have matching text elements`)
        }

        switch (textCase) {
          case 'something blue':
            checkTextColor(textEls, targetColors.one)
            break
          case 'color me':
            checkTextColor(textEls, null)
            break
          case 'something red':
            checkTextColor(textEls, targetColors.two)
            break
          case 'heading 1':
          case 'this some kind of':
          case 'Even with a':
          case 'With two':
            checkTextColor(textEls, targetColors.three)
            break
          case 'Greeen':
            checkTextColor(textEls, '92D050')
            break
          case 'asdadas':
          case 'dasdasd':
            checkTextColor(textEls, targetColors.four)
            break
          default:
            throw new Error(`Unexpected text case "${textCase}"`)
        }
      }
    }
  })
})
