const should = require('should')
const fs = require('fs')
const path = require('path')
const jsreport = require('@jsreport/jsreport-core')
const WordExtractor = require('word-extractor')
const { nodeListToArray, findChildNode } = require('../lib/utils')
const { getDocumentsFromDocxBuf, getTextNodesMatching } = require('./utils')
const { SUPPORTED_ELEMENTS, BLOCK_ELEMENTS, ELEMENTS } = require('../lib/postprocess/html/supportedElements')
const extractor = new WordExtractor()

describe.only('docx html embed', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      reportTimeout: 99999999,
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

  describe('basic - text', () => {
    it('block mode - text as root', async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-block.docx'))

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: 'Hello World'
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html}}')
      const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(1)

      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)

      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

      should(textNodes.length).eql(1)

      commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)

      should(textNodes[0].textContent).eql('Hello World')
    })

    it('block mode - unsupported element should fallback to inline element <unsupported>...<unsupported>', async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-block.docx'))

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: '<unsupported>Hello World</unsupported>'
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html}}')
      const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(1)

      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)

      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

      should(textNodes.length).eql(1)

      commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)

      should(textNodes[0].textContent).eql('Hello World')
    })

    it('inline mode - text as root', async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-inline.docx'))

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: 'Hello World'
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html inline=true}}')
      const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(1)

      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)

      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

      should(textNodes.length).eql(1)

      commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)

      should(textNodes[0].textContent).eql('Hello World')
    })

    it('inline mode - unsupported element should fallback to inline element <unsupported>...<unsupported>', async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-inline.docx'))

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: '<unsupported>Hello World</unsupported>'
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html inline=true}}')
      const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(1)

      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)

      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

      should(textNodes.length).eql(1)

      commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)

      should(textNodes[0].textContent).eql('Hello World')
    })
  })

  describe('basic - <span> tag', () => {
    const opts = {
      paragraphAssert: (paragraphNode, templateTextNodeForDocxHtml) => {
        commonHtmlParagraphAssertions(paragraphNode, templateTextNodeForDocxHtml.parentNode.parentNode)
      },
      textAssert: (textNode, templateTextNodeForDocxHtml) => {
        commonHtmlTextAssertions(textNode, templateTextNodeForDocxHtml.parentNode)
      }
    }

    runCommonTests(() => reporter, 'span', opts, commonWithText)
    runCommonTests(() => reporter, 'span', opts, commonWithInlineAndBlockSiblings)
    runCommonTests(() => reporter, 'span', opts, commonWithInlineBlockChildren)
    runCommonTests(() => reporter, 'span', opts, commonWithSameNestedChildren)
  })

  describe('basic - <p> tag', () => {
    const opts = {
      paragraphAssert: (paragraphNode, templateTextNodeForDocxHtml) => {
        commonHtmlParagraphAssertions(paragraphNode, templateTextNodeForDocxHtml.parentNode.parentNode)
      },
      textAssert: (textNode, templateTextNodeForDocxHtml) => {
        commonHtmlTextAssertions(textNode, templateTextNodeForDocxHtml.parentNode)
      }
    }

    runCommonTests(() => reporter, 'p', opts, commonWithText)
    runCommonTests(() => reporter, 'p', opts, commonWithInlineAndBlockSiblings)
    runCommonTests(() => reporter, 'p', opts, commonWithInlineBlockChildren)
    runCommonTests(() => reporter, 'p', opts, commonWithSameNestedChildren)
  })

  describe('<b> tag', () => {
    const opts = {
      paragraphAssert: (paragraphNode, templateTextNodeForDocxHtml) => {
        commonHtmlParagraphAssertions(paragraphNode, templateTextNodeForDocxHtml.parentNode.parentNode)
      },
      textAssert: (textNode) => {
        should(findChildNode('w:b', findChildNode('w:rPr', textNode.parentNode))).be.ok()
      }
    }

    runCommonTests(() => reporter, 'b', opts, commonWithText)
    runCommonTests(() => reporter, 'b', { ...opts, targetParent: ['block'] }, commonWithInlineAndBlockSiblings)
    runCommonTests(() => reporter, 'b', { ...opts, targetParent: ['block'] }, commonWithInlineBlockChildren)
    runCommonTests(() => reporter, 'b', { ...opts, targetParent: ['block'] }, commonWithSameNestedChildren)
  })

  describe('<i> tag', () => {
    const opts = {
      paragraphAssert: (paragraphNode, templateTextNodeForDocxHtml) => {
        commonHtmlParagraphAssertions(paragraphNode, templateTextNodeForDocxHtml.parentNode.parentNode)
      },
      textAssert: (textNode) => {
        should(findChildNode('w:i', findChildNode('w:rPr', textNode.parentNode))).be.ok()
      }
    }

    runCommonTests(() => reporter, 'i', opts, commonWithText)
    runCommonTests(() => reporter, 'i', { ...opts, targetParent: ['block'] }, commonWithInlineAndBlockSiblings)
    runCommonTests(() => reporter, 'i', { ...opts, targetParent: ['block'] }, commonWithInlineBlockChildren)
    runCommonTests(() => reporter, 'i', { ...opts, targetParent: ['block'] }, commonWithSameNestedChildren)
  })

  describe('<u> tag', () => {
    const opts = {
      paragraphAssert: (paragraphNode, templateTextNodeForDocxHtml) => {
        commonHtmlParagraphAssertions(paragraphNode, templateTextNodeForDocxHtml.parentNode.parentNode)
      },
      textAssert: (textNode) => {
        should(findChildNode('w:u', findChildNode('w:rPr', textNode.parentNode))).be.ok()
      }
    }

    runCommonTests(() => reporter, 'u', opts, commonWithText)
    runCommonTests(() => reporter, 'u', { ...opts, targetParent: ['block'] }, commonWithInlineAndBlockSiblings)
    runCommonTests(() => reporter, 'u', { ...opts, targetParent: ['block'] }, commonWithInlineBlockChildren)
    runCommonTests(() => reporter, 'u', { ...opts, targetParent: ['block'] }, commonWithSameNestedChildren)
  })

  describe('<b><i><u> tags', () => {
    it('block mode - combined <b><i><u>...</u></i></b>', async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-block.docx'))

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: 'Hello <b><i><u>World</u></i></b>'
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html}}')
      const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(1)

      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)

      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

      should(textNodes.length).eql(2)

      commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)

      should(textNodes[0].textContent).eql('Hello ')
      should(textNodes[1].textContent).eql('World')
      should(findChildNode('w:b', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
      should(findChildNode('w:i', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
      should(findChildNode('w:u', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
    })

    it('inline mode - combined <b><i><u>...</u></i></b>', async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-inline.docx'))

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: 'Hello <b><i><u>World</u></i></b>'
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html inline=true}}')
      const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(1)

      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)

      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

      should(textNodes.length).eql(2)

      commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)

      should(textNodes[0].textContent).eql('Hello ')
      should(textNodes[1].textContent).eql('World')
      should(findChildNode('w:b', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
      should(findChildNode('w:i', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
      should(findChildNode('w:u', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
    })
  })

  for (const headingLevel of ['1', '2', '3', '4', '5', '6']) {
    describe(`<h${headingLevel}> tag`, () => {
      const opts = {
        outputDocuments: ['word/styles.xml'],
        paragraphAssert: (paragraphNode, templateTextNodeForDocxHtml, extra) => {
          const mode = extra.mode

          if (mode === 'block') {
            const [stylesDoc] = extra.outputDocuments
            const pPrNode = findChildNode('w:pPr', paragraphNode)
            const pStyleNode = findChildNode('w:pStyle', pPrNode)
            const titleStyleId = pStyleNode.getAttribute('w:val')
            const titleLevel = parseInt(titleStyleId.match(/\w+(\d)$/)[1], 10)

            should(titleLevel).be.Number()
            should(titleLevel).be.eql(parseInt(headingLevel, 10))
            should(titleLevel).be.not.NaN()

            const titleStyleNode = findChildNode((n) => (
              n.nodeName === 'w:style' &&
              n.getAttribute('w:type') === 'paragraph' &&
              n.getAttribute('w:styleId') === titleStyleId
            ), stylesDoc.documentElement)

            should(titleStyleNode).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:name' &&
              n.getAttribute('w:val') === `heading ${titleLevel}`
            ), titleStyleNode)).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:basedOn' &&
              n.getAttribute('w:val') != null &&
              n.getAttribute('w:val') !== ''
            ), titleStyleNode)).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:next' &&
              n.getAttribute('w:val') != null &&
              n.getAttribute('w:val') !== ''
            ), titleStyleNode)).be.ok()

            const linkNode = findChildNode((n) => (
              n.nodeName === 'w:link' &&
              n.getAttribute('w:val') != null &&
              n.getAttribute('w:val') !== ''
            ), titleStyleNode)

            should(linkNode).be.ok()

            const titleCharStyleId = linkNode.getAttribute('w:val')

            should(findChildNode((n) => (
              n.nodeName === 'w:style' &&
              n.getAttribute('w:type') === 'character' &&
              n.getAttribute('w:styleId') === titleCharStyleId
            ), stylesDoc.documentElement)).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:uiPriority' &&
              n.getAttribute('w:val') != null &&
              n.getAttribute('w:val') !== ''
            ), titleStyleNode)).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:qFormat'
            ), titleStyleNode)).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:pPr'
            ), titleStyleNode)).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:rPr'
            ), titleStyleNode)).be.ok()
          } else {
            commonHtmlParagraphAssertions(paragraphNode, templateTextNodeForDocxHtml.parentNode.parentNode)
          }
        }
      }

      const customOptsForText = { ...opts }

      if (headingLevel !== '1') {
        customOptsForText.targetParent = [null]
      }

      // for h1 we run full tests, for h2 to h6 we want to run less tests
      runCommonTests(() => reporter, `h${headingLevel}`, customOptsForText, commonWithText)

      if (headingLevel === '1') {
        runCommonTests(() => reporter, `h${headingLevel}`, opts, commonWithInlineAndBlockSiblings)
        runCommonTests(() => reporter, `h${headingLevel}`, opts, commonWithInlineBlockChildren)
      }
    })
  }

  describe('<h1> - <h6> tags', () => {
    it('block mode - combined <h1>...</h1>...<h2>...</h2>...<h3>...</h3>...<h4>...</h4>...<h5>...</h5>...<h6>...</h6>...', async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-block.docx'))

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: [
            '<h1>Testing title</h1>',
            'another text',
            '<h2>Testing title2</h2>',
            'another text',
            '<h3>Testing title3</h3>',
            'another text',
            '<h4>Testing title4</h4>',
            'another text',
            '<h5>Testing title5</h5>',
            'another text',
            '<h6>Testing title6</h6>',
            'another text'
          ].join('')
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [doc, stylesDoc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/styles.xml'])

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(12)

      for (const [paragraphIdx, paragraphNode] of paragraphNodes.entries()) {
        const isOdd = paragraphIdx % 2 === 0
        const textNodes = nodeListToArray(paragraphNode.getElementsByTagName('w:t'))
        should(textNodes.length).eql(1)

        if (isOdd) {
          const pPrNode = findChildNode('w:pPr', paragraphNode)
          const pStyleNode = findChildNode('w:pStyle', pPrNode)
          const titleStyleId = pStyleNode.getAttribute('w:val')
          const titleLevel = parseInt(titleStyleId.match(/\w+(\d)$/)[1], 10)

          should(titleLevel).be.Number()
          should(titleLevel).be.not.NaN()
          should(textNodes[0].textContent).eql(`Testing title${titleLevel === 1 ? '' : titleLevel}`)

          const titleStyleNode = findChildNode((n) => (
            n.nodeName === 'w:style' &&
            n.getAttribute('w:type') === 'paragraph' &&
            n.getAttribute('w:styleId') === titleStyleId
          ), stylesDoc.documentElement)

          should(titleStyleNode).be.ok()

          should(findChildNode((n) => (
            n.nodeName === 'w:name' &&
            n.getAttribute('w:val') === `heading ${titleLevel}`
          ), titleStyleNode)).be.ok()

          should(findChildNode((n) => (
            n.nodeName === 'w:basedOn' &&
            n.getAttribute('w:val') != null &&
            n.getAttribute('w:val') !== ''
          ), titleStyleNode)).be.ok()

          should(findChildNode((n) => (
            n.nodeName === 'w:next' &&
            n.getAttribute('w:val') != null &&
            n.getAttribute('w:val') !== ''
          ), titleStyleNode)).be.ok()

          const linkNode = findChildNode((n) => (
            n.nodeName === 'w:link' &&
            n.getAttribute('w:val') != null &&
            n.getAttribute('w:val') !== ''
          ), titleStyleNode)

          should(linkNode).be.ok()

          const titleCharStyleId = linkNode.getAttribute('w:val')

          should(findChildNode((n) => (
            n.nodeName === 'w:style' &&
            n.getAttribute('w:type') === 'character' &&
            n.getAttribute('w:styleId') === titleCharStyleId
          ), stylesDoc.documentElement)).be.ok()

          should(findChildNode((n) => (
            n.nodeName === 'w:uiPriority' &&
            n.getAttribute('w:val') != null &&
            n.getAttribute('w:val') !== ''
          ), titleStyleNode)).be.ok()

          should(findChildNode((n) => (
            n.nodeName === 'w:qFormat'
          ), titleStyleNode)).be.ok()

          should(findChildNode((n) => (
            n.nodeName === 'w:pPr'
          ), titleStyleNode)).be.ok()

          should(findChildNode((n) => (
            n.nodeName === 'w:rPr'
          ), titleStyleNode)).be.ok()
        } else {
          should(textNodes[0].textContent).eql('another text')
        }
      }
    })

    it('inline mode - combined <h1>...</h1>...<h2>...</h2>...<h3>...</h3>...<h4>...</h4>...<h5>...</h5>...<h6>...</h6>...', async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-inline.docx'))

      const result = await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: [
            '<h1>Testing title</h1>',
            'another text',
            '<h2>Testing title2</h2>',
            'another text',
            '<h3>Testing title3</h3>',
            'another text',
            '<h4>Testing title4</h4>',
            'another text',
            '<h5>Testing title5</h5>',
            'another text',
            '<h6>Testing title6</h6>',
            'another text'
          ].join('')
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(1)

      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

      should(textNodes.length).eql(12)

      should(textNodes[0].textContent).eql('Testing title')
      should(textNodes[1].textContent).eql('another text')
      should(textNodes[2].textContent).eql('Testing title2')
      should(textNodes[3].textContent).eql('another text')
      should(textNodes[4].textContent).eql('Testing title3')
      should(textNodes[5].textContent).eql('another text')
      should(textNodes[6].textContent).eql('Testing title4')
      should(textNodes[7].textContent).eql('another text')
      should(textNodes[8].textContent).eql('Testing title5')
      should(textNodes[9].textContent).eql('another text')
      should(textNodes[10].textContent).eql('Testing title6')
      should(textNodes[11].textContent).eql('another text')
    })
  })

  describe('<ul> tag', () => {
    runCommonTests(() => reporter, 'ul', {}, commonWithText)
  })

  it.skip('block - <ul>, <li> tag', async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-block.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: [
          '<ul>',
          '<li>item1</li>',
          '<li>item2</li>',
          '<li>item3</li>',
          '</ul>'
        ].join('')
      }
    })

    // Write document for easier debugging
    // fs.writeFileSync('out.docx', result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(3)

    for (const [paragraphIdx, paragraphNode] of paragraphNodes.entries()) {

    }
  })
})

function commonWithText ({
  getReporter,
  tag,
  mode,
  parent,
  level,
  wrapWithLevel,
  IS_BLOCK_TAG,
  outputDocuments,
  paragraphAssert,
  textAssert
}) {
  repeatWithAlias(tag, (tag, alias) => {
    it(`${mode} mode - <${tag}>${alias} as ${level} ${wrapWithLevel(`<${tag}>...</${tag}>`)}`, async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

      const result = await getReporter().render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: wrapWithLevel(`<${tag}>Hello World</${tag}>`)
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
      const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

      const assertExtra = {
        mode,
        outputDocuments: restOfDocuments
      }

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(1)

      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)

      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

      should(textNodes.length).eql(1)

      textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[0].textContent).eql('Hello World')
    })
  })

  it(`${mode} mode - <${tag}> as ${level} preserve properties of element in template ${wrapWithLevel(`<${tag}>...</${tag}>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block-preserve-properties' : 'html-embed-inline-preserve-properties'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}>Hello World</${tag}>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(1)

    paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)

    const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(textNodes.length).eql(1)

    textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
    should(textNodes[0].textContent).eql('Hello World')
    should(findChildNode('w:b', findChildNode('w:rPr', textNodes[0].parentNode))).be.ok()
  })

  it(`${mode} mode - <${tag}> as ${level} and leading text sibling ${wrapWithLevel(`...<${tag}>...</${tag}>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`Hello<${tag}>World</${tag}>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(IS_BLOCK_TAG && mode === 'block' ? 2 : 1)

    if (IS_BLOCK_TAG && mode === 'block') {
      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      commonHtmlTextAssertions(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      should(textNodesInParagraph1[0].textContent).eql('Hello')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      textAssert(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph2[0].textContent).eql('World')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(2)
      commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodes[0].textContent).eql('Hello')
      textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[1].textContent).eql('World')
    }
  })

  it(`${mode} mode - <${tag}> as ${level} and trailing text sibling ${wrapWithLevel(`<${tag}>...</${tag}>...`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}>Hello</${tag}>World`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(IS_BLOCK_TAG && mode === 'block' ? 2 : 1)

    if (IS_BLOCK_TAG && mode === 'block') {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      textAssert(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph1[0].textContent).eql('Hello')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      commonHtmlTextAssertions(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodesInParagraph2[0].textContent).eql('World')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(2)
      textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[0].textContent).eql('Hello')
      commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodes[1].textContent).eql('World')
    }
  })

  it(`${mode} mode - <${tag}> as ${level} with leading and trailing text siblings ${wrapWithLevel(`...<${tag}>...</${tag}>...`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`Hello<${tag}>World</${tag}>Docx`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(IS_BLOCK_TAG && mode === 'block' ? 3 : 1)

    if (IS_BLOCK_TAG && mode === 'block') {
      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      commonHtmlParagraphAssertions(paragraphNodes[2], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      commonHtmlTextAssertions(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodesInParagraph1[0].textContent).eql('Hello')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      textAssert(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph2[0].textContent).eql('World')
      const textNodesInParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))
      should(textNodesInParagraph3.length).eql(1)
      commonHtmlTextAssertions(textNodesInParagraph3[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodesInParagraph3[0].textContent).eql('Docx')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(3)
      commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodes[0].textContent).eql('Hello')
      textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[1].textContent).eql('World')
      commonHtmlTextAssertions(textNodes[2], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodes[2].textContent).eql('Docx')
    }
  })

  it(`${mode} mode - <${tag}> as ${level} with leading text preserving space ${wrapWithLevel(`... <${tag}>...</${tag}>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`Hello <${tag}>World</${tag}>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(IS_BLOCK_TAG && mode === 'block' ? 2 : 1)

    if (IS_BLOCK_TAG && mode === 'block') {
      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      commonHtmlTextAssertions(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodesInParagraph1[0].textContent).eql('Hello ')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      textAssert(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph2[0].textContent).eql('World')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(2)
      commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodes[0].textContent).eql('Hello ')
      textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[1].textContent).eql('World')
    }
  })

  it(`${mode} mode - <${tag}> as ${level} with trailing text preserving space ${wrapWithLevel(`<${tag}>...</${tag}> ...`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}>Hello</${tag}> World`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(IS_BLOCK_TAG && mode === 'block' ? 2 : 1)

    if (IS_BLOCK_TAG && mode === 'block') {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      textAssert(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph1[0].textContent).eql('Hello')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      commonHtmlTextAssertions(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodesInParagraph2[0].textContent).eql(' World')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(2)
      textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[0].textContent).eql('Hello')
      commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodes[1].textContent).eql(' World')
    }
  })

  it(`${mode} mode - <${tag}> as ${level} with leading and trailing text preserving space ${wrapWithLevel(`... <${tag}>...</${tag}> ...`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`Hello <${tag}>World</${tag}> Docx`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(IS_BLOCK_TAG && mode === 'block' ? 3 : 1)

    if (IS_BLOCK_TAG && mode === 'block') {
      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      commonHtmlParagraphAssertions(paragraphNodes[2], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      commonHtmlTextAssertions(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodesInParagraph1[0].textContent).eql('Hello ')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      textAssert(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph2[0].textContent).eql('World')
      const textNodesInParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))
      should(textNodesInParagraph3.length).eql(1)
      commonHtmlTextAssertions(textNodesInParagraph3[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodesInParagraph3[0].textContent).eql(' Docx')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(3)
      commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodes[0].textContent).eql('Hello ')
      textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[1].textContent).eql('World')
      commonHtmlTextAssertions(textNodes[2], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodes[2].textContent).eql(' Docx')
    }
  })

  if (mode === 'inline' && parent == null) {
    it(`${mode} mode - <${tag}> as ${level} with leading text in docx ${wrapWithLevel(`<${tag}>...</${tag}>`)}`, async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-inline-with-leading-text.docx'))

      const result = await getReporter().render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: `<${tag}>Hello World</${tag}>`
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html inline=true}}')
      const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

      const assertExtra = {
        mode,
        outputDocuments: restOfDocuments
      }

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(1)

      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)

      const extractedDoc = await extractor.extract(result.content)
      extractedDoc.getBody().should.be.eql('Leading text Hello World\n')

      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      const textNode = textNodes.find((t) => t.textContent === 'Hello World')

      textAssert(textNode, templateTextNodesForDocxHtml[0], assertExtra)
    })

    it(`${mode} mode - <${tag}> as ${level} with trailing text in docx ${wrapWithLevel(`<${tag}>...</${tag}>`)}`, async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-inline-with-trailing-text.docx'))

      const result = await getReporter().render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: wrapWithLevel(`<${tag}>Hello World</${tag}>`)
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html inline=true}}')
      const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

      const assertExtra = {
        mode,
        outputDocuments: restOfDocuments
      }

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(1)

      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)

      const extractedDoc = await extractor.extract(result.content)
      extractedDoc.getBody().should.be.eql('Hello World Trailing text\n')

      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      const textNode = textNodes.find((t) => t.textContent === 'Hello World')

      textAssert(textNode, templateTextNodesForDocxHtml[0], assertExtra)
    })

    it(`${mode} mode - <${tag}> as ${level} with leading and trailing text in docx ${wrapWithLevel(`<${tag}>...</${tag}>`)}`, async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-inline-with-text.docx'))

      const result = await getReporter().render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: wrapWithLevel(`<${tag}>Hello World</${tag}>`)
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html inline=true}}')
      const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

      const assertExtra = {
        mode,
        outputDocuments: restOfDocuments
      }

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(1)

      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)

      const extractedDoc = await extractor.extract(result.content)
      extractedDoc.getBody().should.be.eql('Leading text Hello World and Trailing text\n')

      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      const textNode = textNodes.find((t) => t.textContent === 'Hello World')

      textAssert(textNode, templateTextNodesForDocxHtml[0], assertExtra)
    })
  }
}

function commonWithInlineAndBlockSiblings ({
  getReporter,
  tag,
  mode,
  level,
  wrapWithLevel,
  IS_BLOCK_TAG,
  outputDocuments,
  paragraphAssert,
  textAssert
}) {
  it(`${mode} mode - <${tag}> as ${level} and leading inline sibling ${wrapWithLevel(`<span>...</span><${tag}>...</${tag}>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<span>Hello</span><${tag}>World</${tag}>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(IS_BLOCK_TAG && mode === 'block' ? 2 : 1)

    if (IS_BLOCK_TAG && mode === 'block') {
      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      commonHtmlTextAssertions(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodesInParagraph1[0].textContent).eql('Hello')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      textAssert(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph2[0].textContent).eql('World')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(2)
      commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodes[0].textContent).eql('Hello')
      textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[1].textContent).eql('World')
    }
  })

  it(`${mode} mode - <${tag}> as ${level} and trailing inline sibling ${wrapWithLevel(`<${tag}>...</${tag}><span>...</span>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}>Hello</${tag}><span>World</span>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(IS_BLOCK_TAG && mode === 'block' ? 2 : 1)

    if (IS_BLOCK_TAG && mode === 'block') {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      textAssert(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph1[0].textContent).eql('Hello')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      commonHtmlTextAssertions(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodesInParagraph2[0].textContent).eql('World')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(2)
      textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[0].textContent).eql('Hello')
      commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodes[1].textContent).eql('World')
    }
  })

  repeatWithAlias(tag, (tag, alias) => {
    it(`${mode} mode - <${tag}>${alias} as ${level} with leading and trailing inline siblings ${wrapWithLevel(`<span>...</span><${tag}>...</${tag}><span>...</span>`)}`, async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

      const result = await getReporter().render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: wrapWithLevel(`<span>Hello</span><${tag}>World</${tag}><span>Docx</span>`)
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
      const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

      const assertExtra = {
        mode,
        outputDocuments: restOfDocuments
      }

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(IS_BLOCK_TAG && mode === 'block' ? 3 : 1)

      if (IS_BLOCK_TAG && mode === 'block') {
        commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
        paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
        commonHtmlParagraphAssertions(paragraphNodes[2], templateTextNodesForDocxHtml[0].parentNode.parentNode)
        const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
        should(textNodesInParagraph1.length).eql(1)
        commonHtmlTextAssertions(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodesInParagraph1[0].textContent).eql('Hello')
        const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
        should(textNodesInParagraph2.length).eql(1)
        textAssert(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0], assertExtra)
        should(textNodesInParagraph2[0].textContent).eql('World')
        const textNodesInParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))
        should(textNodesInParagraph3.length).eql(1)
        commonHtmlTextAssertions(textNodesInParagraph3[0], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodesInParagraph3[0].textContent).eql('Docx')
      } else {
        paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
        should(textNodes.length).eql(3)
        commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodes[0].textContent).eql('Hello')
        textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
        should(textNodes[1].textContent).eql('World')
        commonHtmlTextAssertions(textNodes[2], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodes[2].textContent).eql('Docx')
      }
    })
  })

  it(`${mode} mode - <${tag}> as ${level} and leading block sibling ${wrapWithLevel(`<p>...</p><${tag}>...</${tag}>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<p>Hello</p><${tag}>World</${tag}>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(mode === 'block' ? 2 : 1)

    if (mode === 'block') {
      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      commonHtmlTextAssertions(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodesInParagraph1[0].textContent).eql('Hello')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      textAssert(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph2[0].textContent).eql('World')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(2)
      commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodes[0].textContent).eql('Hello')
      textAssert(textNodes[1], templateTextNodesForDocxHtml[0].parentNode, assertExtra)
      should(textNodes[1].textContent).eql('World')
    }
  })

  it(`${mode} mode - <${tag}> as ${level} and trailing block sibling ${wrapWithLevel(`<${tag}>...</${tag}><p>...</p>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}>Hello</${tag}><p>World</p>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(mode === 'block' ? 2 : 1)

    if (mode === 'block') {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      textAssert(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph1[0].textContent).eql('Hello')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      commonHtmlTextAssertions(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodesInParagraph2[0].textContent).eql('World')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(2)
      textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[0].textContent).eql('Hello')
      commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)
      should(textNodes[1].textContent).eql('World')
    }
  })

  repeatWithAlias(tag, (tag, alias) => {
    it(`${mode} mode - <${tag}>${alias} as ${level} with leading and trailing block siblings ${wrapWithLevel(`<p>...</p><${tag}>...</${tag}><p>...</p>`)}`, async () => {
      const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

      const result = await getReporter().render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: docxTemplateBuf
            }
          }
        },
        data: {
          html: wrapWithLevel(`<p>Hello</p><${tag}>World</${tag}><p>Docx</p>`)
        }
      })

      // Write document for easier debugging
      fs.writeFileSync('out.docx', result.content)

      const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
      const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

      const assertExtra = {
        mode,
        outputDocuments: restOfDocuments
      }

      const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

      should(paragraphNodes.length).eql(mode === 'block' ? 3 : 1)

      if (mode === 'block') {
        commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
        paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
        commonHtmlParagraphAssertions(paragraphNodes[2], templateTextNodesForDocxHtml[0].parentNode.parentNode)
        const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
        should(textNodesInParagraph1.length).eql(1)
        commonHtmlTextAssertions(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodesInParagraph1[0].textContent).eql('Hello')
        const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
        should(textNodesInParagraph2.length).eql(1)
        textAssert(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0], assertExtra)
        should(textNodesInParagraph2[0].textContent).eql('World')
        const textNodesInParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))
        should(textNodesInParagraph3.length).eql(1)
        commonHtmlTextAssertions(textNodesInParagraph3[0], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodesInParagraph3[0].textContent).eql('Docx')
      } else {
        paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
        should(textNodes.length).eql(3)
        commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodes[0].textContent).eql('Hello')
        textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
        should(textNodes[1].textContent).eql('World')
        commonHtmlTextAssertions(textNodes[2], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodes[2].textContent).eql('Docx')
      }
    })
  })

  it(`${mode} mode - <${tag}> as ${level} with same as sibling ${wrapWithLevel(`<${tag}>...</${tag}><${tag}>...</${tag}>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}>Hello</${tag}><${tag}>World</${tag}>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(IS_BLOCK_TAG && mode === 'block' ? 2 : 1)

    if (IS_BLOCK_TAG && mode === 'block') {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      textAssert(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph1[0].textContent).eql('Hello')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      textAssert(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph2[0].textContent).eql('World')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(2)
      textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[0].textContent).eql('Hello')
      textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[1].textContent).eql('World')
    }
  })
}

function commonWithInlineBlockChildren ({
  getReporter,
  tag,
  mode,
  parent,
  level,
  wrapWithLevel,
  outputDocuments,
  paragraphAssert,
  textAssert
}) {
  it(`${mode} mode - <${tag}> as ${level} with leading inline child ${wrapWithLevel(`<${tag}><span>...</span>...</${tag}>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}><span>Hello</span>World</${tag}>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(1)

    paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
    const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
    should(textNodes.length).eql(2)
    textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
    should(textNodes[0].textContent).eql('Hello')
    textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
    should(textNodes[1].textContent).eql('World')
  })

  it(`${mode} mode - <${tag}> as ${level} with trailing inline child ${wrapWithLevel(`<${tag}>...<span>...</span></${tag}>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}>Hello<span>World</span></${tag}>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(1)

    paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
    const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
    should(textNodes.length).eql(2)
    textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
    should(textNodes[0].textContent).eql('Hello')
    textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
    should(textNodes[1].textContent).eql('World')
  })

  it(`${mode} mode - <${tag}> as ${level} with leading and trailing inline children ${wrapWithLevel(`<${tag}><span>...</span>...<span>...</span></${tag}>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}><span>Hello</span>World<span>Docx</span></${tag}>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(1)

    paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
    const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
    should(textNodes.length).eql(3)
    textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
    should(textNodes[0].textContent).eql('Hello')
    textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
    should(textNodes[1].textContent).eql('World')
    textAssert(textNodes[2], templateTextNodesForDocxHtml[0], assertExtra)
    should(textNodes[2].textContent).eql('Docx')
  })

  it(`${mode} mode - <${tag}> as ${level} with inline children ${wrapWithLevel(`<${tag}><span>...</span><span>...</span><span>...</span></${tag}>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}><span>Hello</span><span>World</span><span>Docx</span></${tag}>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(1)

    paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
    const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
    should(textNodes.length).eql(3)
    textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
    should(textNodes[0].textContent).eql('Hello')
    textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
    should(textNodes[1].textContent).eql('World')
    textAssert(textNodes[2], templateTextNodesForDocxHtml[0], assertExtra)
    should(textNodes[2].textContent).eql('Docx')
  })

  it(`${mode} mode - <${tag}> as ${level} with inline nested child ${wrapWithLevel(`<${tag}><span><span>...</span></span></${tag}>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}><span><span>Hello World</span></span></${tag}>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(1)

    paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)

    const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(textNodes.length).eql(1)

    textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
    should(textNodes[0].textContent).eql('Hello World')
  })

  it(`${mode} mode - <${tag}> as ${level} with leading block child ${wrapWithLevel(`<${tag}><p>...</p>...</${tag}>`, parent === 'block' ? 'div' : null)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}><p>Hello</p>World</${tag}>`, parent === 'block' ? 'div' : null)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(mode === 'block' ? 2 : 1)

    if (mode === 'block') {
      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      textAssert(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph1[0].textContent).eql('Hello')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      textAssert(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph2[0].textContent).eql('World')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(2)
      textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[0].textContent).eql('Hello')
      textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[1].textContent).eql('World')
    }
  })

  it(`${mode} mode - <${tag}> as ${level} with trailing block child ${wrapWithLevel(`<${tag}>...<p>...</p></${tag}>`, parent === 'block' ? 'div' : null)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}>Hello<p>World</p></${tag}>`, parent === 'block' ? 'div' : null)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(mode === 'block' ? 2 : 1)

    if (mode === 'block') {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      textAssert(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph1[0].textContent).eql('Hello')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      textAssert(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph2[0].textContent).eql('World')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(2)
      textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[0].textContent).eql('Hello')
      textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[1].textContent).eql('World')
    }
  })

  it(`${mode} mode - <${tag}> as ${level} with leading and trailing block children ${wrapWithLevel(`<${tag}><p>...</p>...<p>...</p></${tag}>`, parent === 'block' ? 'div' : null)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}><p>Hello</p>World<p>Docx</p></${tag}>`, parent === 'block' ? 'div' : null)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(mode === 'inline' ? 1 : 3)

    if (mode === 'inline') {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(3)
      textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[0].textContent).eql('Hello')
      textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[1].textContent).eql('World')
      textAssert(textNodes[2], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[2].textContent).eql('Docx')
    } else {
      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      commonHtmlParagraphAssertions(paragraphNodes[2], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      textAssert(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph1[0].textContent).eql('Hello')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      textAssert(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph2[0].textContent).eql('World')
      const textNodesInParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))
      should(textNodesInParagraph3.length).eql(1)
      textAssert(textNodesInParagraph3[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph3[0].textContent).eql('Docx')
    }
  })

  it(`${mode} mode - <${tag}> as ${level} with block children ${wrapWithLevel(`<${tag}><p>...</p><p>...</p><p>...</p></${tag}>`, parent === 'block' ? 'div' : null)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}><p>Hello</p><p>World</p><p>Docx</p></${tag}>`, parent === 'block' ? 'div' : null)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(mode === 'inline' ? 1 : 3)

    if (mode === 'inline') {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(3)
      textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[0].textContent).eql('Hello')
      textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[1].textContent).eql('World')
      textAssert(textNodes[2], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[2].textContent).eql('Docx')
    } else {
      commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      commonHtmlParagraphAssertions(paragraphNodes[2], templateTextNodesForDocxHtml[0].parentNode.parentNode)
      const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodesInParagraph1.length).eql(1)
      textAssert(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph1[0].textContent).eql('Hello')
      const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
      should(textNodesInParagraph2.length).eql(1)
      textAssert(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph2[0].textContent).eql('World')
      const textNodesInParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))
      should(textNodesInParagraph3.length).eql(1)
      textAssert(textNodesInParagraph3[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodesInParagraph3[0].textContent).eql('Docx')
    }
  })

  it(`${mode} mode - <${tag}> as ${level} with block nested child ${wrapWithLevel(`<${tag}><div><div>...</div></div></${tag}>`, parent === 'block' ? 'div' : null)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}><div><div>Hello World</div></div></${tag}>`, parent === 'block' ? 'div' : null)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(1)

    commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)

    const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(textNodes.length).eql(1)

    textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
    should(textNodes[0].textContent).eql('Hello World')
  })
}

function commonWithSameNestedChildren ({
  getReporter,
  tag,
  mode,
  parent,
  level,
  wrapWithLevel,
  IS_BLOCK_TAG,
  outputDocuments,
  paragraphAssert,
  textAssert
}) {
  // we only want to run it for the root level
  if (parent != null) {
    return
  }

  it(`${mode} mode - <${tag}> as ${level} with same nested children ${wrapWithLevel(`<${tag}>...<${tag}>...<${tag}>...<${tag}>...</$${tag}><${tag}>...</${tag}>...</${tag}>...</${tag}>...</${tag}>`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

    const result = await getReporter().render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxTemplateBuf
          }
        }
      },
      data: {
        html: wrapWithLevel(`<${tag}>Hello<${tag}>World<${tag}>from<${tag}>another</${tag}><${tag}>element</${tag}>nested</${tag}>of text</${tag}>in docx</${tag}>`)
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
    const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(IS_BLOCK_TAG && mode === 'block' ? 8 : 1)

    if (IS_BLOCK_TAG && mode === 'block') {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      paragraphAssert(paragraphNodes[2], templateTextNodesForDocxHtml[0], assertExtra)
      paragraphAssert(paragraphNodes[3], templateTextNodesForDocxHtml[0], assertExtra)
      paragraphAssert(paragraphNodes[4], templateTextNodesForDocxHtml[0], assertExtra)
      paragraphAssert(paragraphNodes[5], templateTextNodesForDocxHtml[0], assertExtra)
      paragraphAssert(paragraphNodes[6], templateTextNodesForDocxHtml[0], assertExtra)
      paragraphAssert(paragraphNodes[7], templateTextNodesForDocxHtml[0], assertExtra)

      const textNodesParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

      should(textNodesParagraph1.length).eql(1)

      textAssert(textNodesParagraph1[0], templateTextNodesForDocxHtml[0], assertExtra)

      should(textNodesParagraph1[0].textContent).eql('Hello')

      const textNodesParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))

      should(textNodesParagraph2.length).eql(1)

      textAssert(textNodesParagraph2[0], templateTextNodesForDocxHtml[0])

      should(textNodesParagraph2[0].textContent).eql('World', assertExtra)

      const textNodesParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))

      should(textNodesParagraph3.length).eql(1)

      textAssert(textNodesParagraph3[0], templateTextNodesForDocxHtml[0], assertExtra)

      should(textNodesParagraph3[0].textContent).eql('from')

      const textNodesParagraph4 = nodeListToArray(paragraphNodes[3].getElementsByTagName('w:t'))

      should(textNodesParagraph4.length).eql(1)

      textAssert(textNodesParagraph4[0], templateTextNodesForDocxHtml[0], assertExtra)

      should(textNodesParagraph4[0].textContent).eql('another')

      const textNodesParagraph5 = nodeListToArray(paragraphNodes[4].getElementsByTagName('w:t'))

      should(textNodesParagraph5.length).eql(1)

      textAssert(textNodesParagraph5[0], templateTextNodesForDocxHtml[0], assertExtra)

      should(textNodesParagraph5[0].textContent).eql('element')

      const textNodesParagraph6 = nodeListToArray(paragraphNodes[5].getElementsByTagName('w:t'))

      should(textNodesParagraph6.length).eql(1)

      textAssert(textNodesParagraph6[0], templateTextNodesForDocxHtml[0], assertExtra)

      should(textNodesParagraph6[0].textContent).eql('nested')

      const textNodesParagraph7 = nodeListToArray(paragraphNodes[6].getElementsByTagName('w:t'))

      should(textNodesParagraph7.length).eql(1)

      textAssert(textNodesParagraph7[0], templateTextNodesForDocxHtml[0], assertExtra)

      should(textNodesParagraph7[0].textContent).eql('of text')

      const textNodesParagraph8 = nodeListToArray(paragraphNodes[7].getElementsByTagName('w:t'))

      should(textNodesParagraph8.length).eql(1)

      textAssert(textNodesParagraph8[0], templateTextNodesForDocxHtml[0], assertExtra)

      should(textNodesParagraph8[0].textContent).eql('in docx')
    } else {
      paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
      should(textNodes.length).eql(8)

      textAssert(textNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[0].textContent).eql('Hello')

      textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[1].textContent).eql('World')

      textAssert(textNodes[2], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[2].textContent).eql('from')

      textAssert(textNodes[3], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[3].textContent).eql('another')

      textAssert(textNodes[4], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[4].textContent).eql('element')

      textAssert(textNodes[5], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[5].textContent).eql('nested')

      textAssert(textNodes[6], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[6].textContent).eql('of text')

      textAssert(textNodes[7], templateTextNodesForDocxHtml[0], assertExtra)
      should(textNodes[7].textContent).eql('in docx')
    }
  })
}

function runCommonTests (getReporter, tag, options = {}, testsSuiteFn) {
  if (!SUPPORTED_ELEMENTS.includes(tag)) {
    throw new Error(`${tag} is not supported`)
  }

  const ELEMENT = ELEMENTS.find((el) => el.tag === tag)
  const IS_BLOCK_TAG = BLOCK_ELEMENTS.includes(tag)
  const outputDocuments = options.outputDocuments || []
  // paragraphAssert, textAssert will be called for the nodes that are
  // containing the html tag evaluated and that are expected to contain the modified changes
  const paragraphAssert = options.paragraphAssert || (() => {})
  const textAssert = options.textAssert || (() => {})
  const targetMode = options.targetMode || ['block', 'inline']
  const targetParent = options.targetParent || [null, 'inline', 'block']

  for (const mode of targetMode) {
    for (const parent of targetParent) {
      const level = `${parent == null ? 'root' : `child of ${parent}`}`

      testsSuiteFn({
        getReporter,
        tag,
        mode,
        parent,
        level,
        wrapWithLevel: (...args) => wrapWithLevel(parent, ...args),
        ELEMENT,
        IS_BLOCK_TAG,
        outputDocuments,
        paragraphAssert,
        textAssert
      })
    }
  }
}

function commonHtmlParagraphAssertions (pNode, templatePNode) {
  if (templatePNode) {
    const templatePPropertiesEl = nodeListToArray(templatePNode.childNodes).find((n) => n.nodeName === 'w:pPr')
    const pPropertiesEl = nodeListToArray(pNode.childNodes).find((n) => n.nodeName === 'w:pPr')

    if (templatePPropertiesEl != null && pPropertiesEl != null) {
      // assert that we inherit paragraph properties
      should(templatePPropertiesEl.toString()).be.eql(pPropertiesEl.toString())
    }
  }
}

function commonHtmlTextAssertions (tNode, templateRNode) {
  if (templateRNode) {
    const templateRPropertiesEl = nodeListToArray(templateRNode.childNodes).find((n) => n.nodeName === 'w:rPr')
    const rPropertiesEl = nodeListToArray(tNode.parentNode.childNodes).find((n) => n.nodeName === 'w:rPr')

    if (templateRPropertiesEl != null && rPropertiesEl != null) {
      // assert that we inherit run properties
      should(templateRPropertiesEl.toString()).be.eql(rPropertiesEl.toString())
    }
  }

  // assert that we mark the xml text node as space preserve to be able to handle leading/trailing spaces
  should(tNode.getAttribute('xml:space')).be.eql('preserve')
}

function repeatWithAlias (tag, testFn) {
  const ELEMENT = ELEMENTS.find((el) => el.tag === tag)
  const withAliasTargets = [tag]

  if (ELEMENT.alias != null) {
    withAliasTargets.push(...ELEMENT.alias)
  }

  for (const currentTag of withAliasTargets) {
    const alias = `${ELEMENT.alias?.includes(currentTag) ? ` (alias of <${ELEMENT.tag}>)` : ''}`
    testFn(currentTag, alias)
  }
}

function wrapWithLevel (parent, html, customTag) {
  if (parent == null) {
    return html
  }

  let parentTag

  if (parent === 'inline') {
    parentTag = 'span'
  } else if (parent === 'block') {
    parentTag = 'p'
  }

  if (customTag != null) {
    parentTag = customTag
  }

  if (parentTag == null) {
    throw new Error(`Invalid parent "${parent}"`)
  }

  const newHtml = `<${parentTag}>${html}</${parentTag}>`

  return newHtml
}
