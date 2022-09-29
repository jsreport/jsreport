const should = require('should')
const fs = require('fs')
const path = require('path')
const jsreport = require('@jsreport/jsreport-core')
const WordExtractor = require('word-extractor')
const { nodeListToArray, findChildNode } = require('../lib/utils')
const { getDocumentsFromDocxBuf, getTextNodesMatching } = require('./utils')
const { SUPPORTED_ELEMENTS, BLOCK_ELEMENTS, ELEMENTS } = require('../lib/postprocess/html/supportedElements')
const extractor = new WordExtractor()

describe('docx html embed', () => {
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

  describe('<br> tag', () => {
    for (const mode of ['block', 'inline']) {
      const templateStr = '<br />'

      it(`${mode} mode - <br> ${templateStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateStr, [])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)

        const runNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:r'))

        should(runNodes.length).eql(1)

        should(findChildNode('w:br', runNodes[0])).be.ok()

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(0)
      })

      const templateMultipleStr = '<br /><br />'

      it(`${mode} mode - <br> ${templateMultipleStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateMultipleStr, [])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)

        const runNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:r'))

        should(runNodes.length).eql(2)

        should(findChildNode('w:br', runNodes[0])).be.ok()
        should(findChildNode('w:br', runNodes[1])).be.ok()

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(0)
      })

      const templateTextStr = '...<br />...'

      it(`${mode} mode - <br> with text ${templateTextStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateTextStr, ['Hello', 'World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)

        const runNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:r'))

        should(runNodes.length).eql(3)

        should(findChildNode('w:br', runNodes[1])).be.ok()

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(2)

        should(textNodes[0].textContent).eql('Hello')
        should(textNodes[1].textContent).eql('World')
      })
    }
  })

  describe('<sub> tag', () => {
    const opts = {
      paragraphAssert: (paragraphNode, templateTextNodeForDocxHtml) => {
        commonHtmlParagraphAssertions(paragraphNode, templateTextNodeForDocxHtml.parentNode.parentNode)
      },
      textAssert: (textNode) => {
        should(findChildNode((n) => (
          n.nodeName === 'w:vertAlign' &&
          n.getAttribute('w:val') === 'subscript'
        ), findChildNode('w:rPr', textNode.parentNode))).be.ok()
      }
    }

    runCommonTests(() => reporter, 'sub', opts, commonWithText)
    runCommonTests(() => reporter, 'sub', { ...opts, targetParent: ['block'] }, commonWithInlineAndBlockSiblings)
    runCommonTests(() => reporter, 'sub', { ...opts, targetParent: ['block'] }, commonWithInlineBlockChildren)
    runCommonTests(() => reporter, 'sub', { ...opts, targetParent: ['block'] }, commonWithSameNestedChildren)
  })

  describe('<sup> tag', () => {
    const opts = {
      paragraphAssert: (paragraphNode, templateTextNodeForDocxHtml) => {
        commonHtmlParagraphAssertions(paragraphNode, templateTextNodeForDocxHtml.parentNode.parentNode)
      },
      textAssert: (textNode) => {
        should(findChildNode((n) => (
          n.nodeName === 'w:vertAlign' &&
          n.getAttribute('w:val') === 'superscript'
        ), findChildNode('w:rPr', textNode.parentNode))).be.ok()
      }
    }

    runCommonTests(() => reporter, 'sup', opts, commonWithText)
    runCommonTests(() => reporter, 'sup', { ...opts, targetParent: ['block'] }, commonWithInlineAndBlockSiblings)
    runCommonTests(() => reporter, 'sup', { ...opts, targetParent: ['block'] }, commonWithInlineBlockChildren)
    runCommonTests(() => reporter, 'sup', { ...opts, targetParent: ['block'] }, commonWithSameNestedChildren)
  })

  describe('<s> tag', () => {
    const opts = {
      paragraphAssert: (paragraphNode, templateTextNodeForDocxHtml) => {
        commonHtmlParagraphAssertions(paragraphNode, templateTextNodeForDocxHtml.parentNode.parentNode)
      },
      textAssert: (textNode) => {
        should(findChildNode('w:strike', findChildNode('w:rPr', textNode.parentNode))).be.ok()
      }
    }

    runCommonTests(() => reporter, 's', opts, commonWithText)
    runCommonTests(() => reporter, 's', { ...opts, targetParent: ['block'] }, commonWithInlineAndBlockSiblings)
    runCommonTests(() => reporter, 's', { ...opts, targetParent: ['block'] }, commonWithInlineBlockChildren)
    runCommonTests(() => reporter, 's', { ...opts, targetParent: ['block'] }, commonWithSameNestedChildren)
  })

  describe('<code> tag', () => {
    const opts = {
      paragraphAssert: (paragraphNode, templateTextNodeForDocxHtml) => {
        commonHtmlParagraphAssertions(paragraphNode, templateTextNodeForDocxHtml.parentNode.parentNode)
      },
      textAssert: (textNode) => {
        should(findChildNode((n) => (
          n.nodeName === 'w:highlight' &&
          n.getAttribute('w:val') === 'lightGray'
        ), findChildNode('w:rPr', textNode.parentNode))).be.ok()
      }
    }

    runCommonTests(() => reporter, 'code', opts, commonWithText)
    runCommonTests(() => reporter, 'code', { ...opts, targetParent: ['block'] }, commonWithInlineAndBlockSiblings)
    runCommonTests(() => reporter, 'code', { ...opts, targetParent: ['block'] }, commonWithInlineBlockChildren)
    runCommonTests(() => reporter, 'code', { ...opts, targetParent: ['block'] }, commonWithSameNestedChildren)
  })

  describe('<a> tag', () => {
    const opts = {
      outputDocuments: ['word/styles.xml', 'word/_rels/document.xml.rels'],
      paragraphAssert: (paragraphNode, templateTextNodeForDocxHtml) => {
        commonHtmlParagraphAssertions(paragraphNode, templateTextNodeForDocxHtml.parentNode.parentNode)
      },
      textAssert: (textNode, templateTextNodeForDocxHtml, extra) => {
        const rStyle = findChildNode('w:rStyle', findChildNode('w:rPr', textNode.parentNode))

        should(rStyle).be.ok()

        const linkStyleId = rStyle.getAttribute('w:val')

        const [stylesDoc, documentRelsDoc] = extra.outputDocuments

        should(findChildNode((n) => (
          n.nodeName === 'w:style' &&
          n.getAttribute('w:type') === 'character' &&
          n.getAttribute('w:styleId') === linkStyleId &&
          findChildNode((cN) => cN.nodeName === 'w:name' && cN.getAttribute('w:val') === 'Hyperlink', n) != null
        ), stylesDoc.documentElement)).be.ok()

        const hyperlinkEl = textNode.parentNode.parentNode

        should(hyperlinkEl.nodeName).eql('w:hyperlink')

        const linkRelVal = hyperlinkEl.getAttribute('r:id')

        should(linkRelVal).be.ok()
        should(linkRelVal !== '').be.True()

        should(findChildNode((n) => (
          n.nodeName === 'Relationship' &&
          n.getAttribute('Id') === linkRelVal &&
          n.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink'
        ), documentRelsDoc.documentElement)).be.ok()
      }
    }

    runCommonTests(() => reporter, 'a', opts, commonWithText)
    runCommonTests(() => reporter, 'a', { ...opts, targetParent: ['block'] }, commonWithInlineAndBlockSiblings)
    runCommonTests(() => reporter, 'a', { ...opts, targetParent: ['block'] }, commonWithInlineBlockChildren)

    const outputDocuments = opts.outputDocuments
    const paragraphAssert = opts.paragraphAssert
    const textAssert = opts.textAssert

    for (const mode of ['block', 'inline']) {
      const templateStr = 'some <a href="https://jsreport.net">link</a>'

      it(`${mode} mode - <a> with href ${templateStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateStr, [])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', ...outputDocuments])
        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        const assertExtra = {
          mode,
          outputDocuments: restOfDocuments
        }

        const documentRelsDoc = restOfDocuments[1]

        should(paragraphNodes.length).eql(1)

        paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(2)

        commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodes[0].textContent).eql('some ')

        textAssert(textNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
        should(textNodes[1].textContent).eql('link')

        const hyperlinkEl = textNodes[1].parentNode.parentNode

        should(hyperlinkEl.nodeName).eql('w:hyperlink')

        const linkRelVal = hyperlinkEl.getAttribute('r:id')

        should(findChildNode((n) => (
          n.nodeName === 'Relationship' &&
          n.getAttribute('Id') === linkRelVal &&
          n.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink' &&
          n.getAttribute('Target') === 'https://jsreport.net' &&
          n.getAttribute('TargetMode') === 'External'
        ), documentRelsDoc.documentElement)).be.ok()
      })
    }
  })

  describe('<pre> tag', () => {
    const opts = {
      textAssert: (textNode) => {
        should(findChildNode((n) => (
          n.nodeName === 'w:rFonts' &&
          n.getAttribute('w:ascii') === 'Courier' &&
          n.getAttribute('w:hAnsi') === 'Courier'
        ), findChildNode('w:rPr', textNode.parentNode))).be.ok()
      }
    }

    runCommonTests(() => reporter, 'pre', opts, commonWithText)
    runCommonTests(() => reporter, 'pre', opts, commonWithInlineAndBlockSiblings)
    runCommonTests(() => reporter, 'pre', opts, commonWithInlineBlockChildren)

    for (const mode of ['block', 'inline']) {
      const templateStr = '<pre>\nText in a pre element\nis displayed in a fixed-width\nfont, and it preserves\nboth      spaces and\nline breaks\n</pre>'

      it(`${mode} mode - <pre> text with line breaks ${templateStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateStr, [])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)

        const runNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:r'))

        should(runNodes.length).eql(10)

        should(findChildNode('w:br', runNodes[1])).be.ok()
        should(findChildNode('w:br', runNodes[3])).be.ok()
        should(findChildNode('w:br', runNodes[5])).be.ok()
        should(findChildNode('w:br', runNodes[7])).be.ok()
        should(findChildNode('w:br', runNodes[9])).be.ok()

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(5)

        should(textNodes[0].textContent).eql('Text in a pre element')
        should(textNodes[1].textContent).eql('is displayed in a fixed-width')
        should(textNodes[2].textContent).eql('font, and it preserves')
        should(textNodes[3].textContent).eql('both      spaces and')
        should(textNodes[4].textContent).eql('line breaks')
      })
    }
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

  for (const listTag of ['ul', 'ol']) {
    describe(`<${listTag}>, <li> tag`, () => {
      const opts = {
        outputDocuments: ['word/styles.xml', 'word/numbering.xml'],
        getOpenCloseTags: () => [`<${listTag}><li>`, `</li></${listTag}>`],
        paragraphAssert: (paragraphNode, templateTextNodeForDocxHtml, extra) => {
          const mode = extra.mode

          if (mode === 'block') {
            const [stylesDoc, numberingDoc] = extra.outputDocuments
            const pPrNode = findChildNode('w:pPr', paragraphNode)
            const pStyleNode = findChildNode('w:pStyle', pPrNode)
            const listParagraphStyleId = pStyleNode.getAttribute('w:val')

            const listParagraphStyleNode = findChildNode((n) => (
              n.nodeName === 'w:style' &&
              n.getAttribute('w:type') === 'paragraph' &&
              n.getAttribute('w:styleId') === listParagraphStyleId
            ), stylesDoc.documentElement)

            should(listParagraphStyleNode).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:name' &&
              n.getAttribute('w:val') === 'List Paragraph'
            ), listParagraphStyleNode)).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:basedOn' &&
              n.getAttribute('w:val') != null &&
              n.getAttribute('w:val') !== ''
            ), listParagraphStyleNode)).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:uiPriority' &&
              n.getAttribute('w:val') != null &&
              n.getAttribute('w:val') !== ''
            ), listParagraphStyleNode)).be.ok()

            should(findChildNode('w:qFormat', listParagraphStyleNode)).be.ok()

            should(findChildNode('w:pPr', listParagraphStyleNode)).be.ok()

            const numPrNode = findChildNode('w:numPr', pPrNode)

            should(numPrNode).be.ok()

            const ilvlNode = findChildNode('w:ilvl', numPrNode)

            should(ilvlNode).be.ok()

            const ilvlVal = ilvlNode.getAttribute('w:val')

            should(parseInt(ilvlVal, 10)).be.not.NaN()

            const numIdNode = findChildNode('w:numId', numPrNode)

            should(numIdNode).be.ok()

            const numId = numIdNode.getAttribute('w:val')
            should(parseInt(numId, 10)).be.not.NaN()

            should(numberingDoc).be.ok()

            const numberingNumNode = findChildNode((n) => (
              n.nodeName === 'w:num' &&
              n.getAttribute('w:numId') === numId
            ), numberingDoc.documentElement)

            should(numberingNumNode).be.ok()

            const numberingAbstractNumIdNode = findChildNode('w:abstractNumId', numberingNumNode)

            should(numberingAbstractNumIdNode).be.ok()
            should(parseInt(numberingAbstractNumIdNode.getAttribute('w:val'), 10)).be.not.NaN()

            const abstractNumId = numberingAbstractNumIdNode.getAttribute('w:val')

            const numberingAbstractNumNode = findChildNode((n) => (
              n.nodeName === 'w:abstractNum' &&
              n.getAttribute('w:abstractNumId') === abstractNumId
            ), numberingDoc.documentElement)

            should(numberingAbstractNumNode).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:multiLevelType' &&
              n.getAttribute('w:val') === 'hybridMultilevel'
            ), numberingAbstractNumNode)).be.ok()

            const lvlNode = findChildNode((n) => (
              n.nodeName === 'w:lvl' &&
              n.getAttribute('w:ilvl') === ilvlVal
            ), numberingAbstractNumNode)

            should(lvlNode).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:start' &&
              n.getAttribute('w:val') != null &&
              n.getAttribute('w:val') !== ''
            ), lvlNode)).be.ok()

            const expectedFmt = listTag === 'ol' ? 'decimal' : 'bullet'

            should(findChildNode((n) => (
              n.nodeName === 'w:numFmt' &&
              n.getAttribute('w:val') === expectedFmt
            ), lvlNode)).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:lvlText' &&
              n.getAttribute('w:val') != null &&
              n.getAttribute('w:val') !== ''
            ), lvlNode)).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:lvlJc' &&
              n.getAttribute('w:val') === 'left'
            ), lvlNode)).be.ok()

            should(findChildNode('w:pPr', lvlNode)).be.ok()

            if (listTag === 'ul') {
              should(findChildNode('w:rPr', lvlNode)).be.ok()
            }
          } else {
            commonHtmlParagraphAssertions(paragraphNode, templateTextNodeForDocxHtml.parentNode.parentNode)
          }
        }
      }

      runCommonTests(() => reporter, listTag, opts, commonWithText)
      runCommonTests(() => reporter, listTag, opts, commonWithInlineAndBlockSiblings)
      runCommonTests(() => reporter, listTag, opts, commonWithInlineBlockChildren)

      const outputDocuments = opts.outputDocuments
      const paragraphAssert = opts.paragraphAssert

      for (const mode of ['block', 'inline']) {
        const templateStr = `<${listTag}><li>...</li><li>...</li><li>...</li></${listTag}>`

        it(`${mode} mode - <${listTag}> with multiple items ${templateStr}`, async () => {
          const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
              html: createHtml(templateStr, ['item1', 'item2', 'item3'])
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

          const numberingDoc = restOfDocuments[1]

          const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

          should(paragraphNodes.length).eql(mode === 'block' ? 3 : 1)

          if (mode === 'block') {
            paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[2], templateTextNodesForDocxHtml[0], assertExtra)

            const numberingNumNodes = findChildNode((n) => (
              n.nodeName === 'w:num'
            ), numberingDoc.documentElement, true)

            should(numberingNumNodes.length).eql(1)

            const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
            should(textNodesInParagraph1.length).eql(1)
            should(textNodesInParagraph1[0].textContent).eql('item1')
            const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
            should(textNodesInParagraph2.length).eql(1)
            should(textNodesInParagraph2[0].textContent).eql('item2')
            const textNodesInParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))
            should(textNodesInParagraph3.length).eql(1)
            should(textNodesInParagraph3[0].textContent).eql('item3')
          } else {
            paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
            const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
            should(textNodes.length).eql(3)
            should(textNodes[0].textContent).eql('item1')
            should(textNodes[1].textContent).eql('item2')
            should(textNodes[2].textContent).eql('item3')
          }
        })

        const templateNestedStr = `<${listTag}><li>...</li><li>...<${listTag}><li>...</li><li>...</li></${listTag}></li><li>...</li></${listTag}>`

        it(`${mode} mode - <${listTag}> with nested same list ${templateNestedStr}`, async () => {
          const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
              html: createHtml(templateNestedStr, ['item1', 'item2', 'nested item1', 'nested item2', 'item3'])
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

          const numberingDoc = restOfDocuments[1]

          const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

          should(paragraphNodes.length).eql(mode === 'block' ? 5 : 1)

          if (mode === 'block') {
            paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[2], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[3], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[4], templateTextNodesForDocxHtml[0], assertExtra)

            const numberingNumNodes = findChildNode((n) => (
              n.nodeName === 'w:num'
            ), numberingDoc.documentElement, true)

            should(numberingNumNodes.length).eql(2)

            should(findChildNode((n) => (
              n.nodeName === 'w:ilvl' &&
              n.getAttribute('w:val') === '1'
            ), findChildNode('w:numPr', findChildNode('w:pPr', paragraphNodes[2])))).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:ilvl' &&
              n.getAttribute('w:val') === '1'
            ), findChildNode('w:numPr', findChildNode('w:pPr', paragraphNodes[3])))).be.ok()

            const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
            should(textNodesInParagraph1.length).eql(1)
            should(textNodesInParagraph1[0].textContent).eql('item1')
            const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
            should(textNodesInParagraph2.length).eql(1)
            should(textNodesInParagraph2[0].textContent).eql('item2')
            const textNodesInParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))
            should(textNodesInParagraph3.length).eql(1)
            should(textNodesInParagraph3[0].textContent).eql('nested item1')
            const textNodesInParagraph4 = nodeListToArray(paragraphNodes[3].getElementsByTagName('w:t'))
            should(textNodesInParagraph4.length).eql(1)
            should(textNodesInParagraph4[0].textContent).eql('nested item2')
            const textNodesInParagraph5 = nodeListToArray(paragraphNodes[4].getElementsByTagName('w:t'))
            should(textNodesInParagraph5.length).eql(1)
            should(textNodesInParagraph5[0].textContent).eql('item3')
          } else {
            paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
            const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
            should(textNodes.length).eql(5)
            should(textNodes[0].textContent).eql('item1')
            should(textNodes[1].textContent).eql('item2')
            should(textNodes[2].textContent).eql('nested item1')
            should(textNodes[3].textContent).eql('nested item2')
            should(textNodes[4].textContent).eql('item3')
          }
        })

        const templateNestedDifferentStr = `<${listTag}><li>...</li><li>...<${listTag === 'ol' ? 'ul' : 'ol'}><li>...</li><li>...</li></${listTag === 'ol' ? 'ul' : 'ol'}></li><li>...</li></${listTag}>`

        it(`${mode} mode - <${listTag}> with nested different list ${templateNestedDifferentStr}`, async () => {
          const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
              html: createHtml(templateNestedDifferentStr, ['item1', 'item2', 'nested item1', 'nested item2', 'item3'])
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

          const numberingDoc = restOfDocuments[1]

          const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

          should(paragraphNodes.length).eql(mode === 'block' ? 5 : 1)

          if (mode === 'block') {
            paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[4], templateTextNodesForDocxHtml[0], assertExtra)

            const numberingNumNodes = findChildNode((n) => (
              n.nodeName === 'w:num'
            ), numberingDoc.documentElement, true)

            should(numberingNumNodes.length).eql(2)

            const expectedFmt = listTag === 'ol' ? 'decimal' : 'bullet'

            const abstractNumIdNodeForN1 = findChildNode('w:abstractNumId', numberingNumNodes[0])

            const numFmtNodeForN1 = findChildNode('w:numFmt', findChildNode((n) => (
              n.nodeName === 'w:lvl' &&
              n.getAttribute('w:ilvl') === '0'
            ), findChildNode((n) => (
              n.nodeName === 'w:abstractNum' &&
              n.getAttribute('w:abstractNumId') === abstractNumIdNodeForN1.getAttribute('w:val')
            ), numberingDoc.documentElement)))

            should(numFmtNodeForN1).be.ok()
            should(numFmtNodeForN1.getAttribute('w:val')).eql(expectedFmt)

            const expectedFmt2 = listTag === 'ol' ? 'bullet' : 'decimal'

            const abstractNumIdNodeForN2 = findChildNode('w:abstractNumId', numberingNumNodes[1])

            const numFmtNodeForN2 = findChildNode('w:numFmt', findChildNode((n) => (
              n.nodeName === 'w:lvl' &&
              n.getAttribute('w:ilvl') === '0'
            ), findChildNode((n) => (
              n.nodeName === 'w:abstractNum' &&
              n.getAttribute('w:abstractNumId') === abstractNumIdNodeForN2.getAttribute('w:val')
            ), numberingDoc.documentElement)))

            should(numFmtNodeForN2).be.ok()
            should(numFmtNodeForN2.getAttribute('w:val')).eql(expectedFmt2)

            should(findChildNode((n) => (
              n.nodeName === 'w:ilvl' &&
              n.getAttribute('w:val') === '1'
            ), findChildNode('w:numPr', findChildNode('w:pPr', paragraphNodes[2])))).be.ok()

            should(findChildNode((n) => (
              n.nodeName === 'w:ilvl' &&
              n.getAttribute('w:val') === '1'
            ), findChildNode('w:numPr', findChildNode('w:pPr', paragraphNodes[3])))).be.ok()

            const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
            should(textNodesInParagraph1.length).eql(1)
            should(textNodesInParagraph1[0].textContent).eql('item1')
            const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
            should(textNodesInParagraph2.length).eql(1)
            should(textNodesInParagraph2[0].textContent).eql('item2')
            const textNodesInParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))
            should(textNodesInParagraph3.length).eql(1)
            should(textNodesInParagraph3[0].textContent).eql('nested item1')
            const textNodesInParagraph4 = nodeListToArray(paragraphNodes[3].getElementsByTagName('w:t'))
            should(textNodesInParagraph4.length).eql(1)
            should(textNodesInParagraph4[0].textContent).eql('nested item2')
            const textNodesInParagraph5 = nodeListToArray(paragraphNodes[4].getElementsByTagName('w:t'))
            should(textNodesInParagraph5.length).eql(1)
            should(textNodesInParagraph5[0].textContent).eql('item3')
          } else {
            paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
            const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
            should(textNodes.length).eql(5)
            should(textNodes[0].textContent).eql('item1')
            should(textNodes[1].textContent).eql('item2')
            should(textNodes[2].textContent).eql('nested item1')
            should(textNodes[3].textContent).eql('nested item2')
            should(textNodes[4].textContent).eql('item3')
          }
        })

        const templateTextChildStr = `<${listTag}>...<li>...</li><li>...</li></${listTag}>`

        it(`${mode} mode - <${listTag}> with text child directly in <${listTag}> ${templateTextChildStr}`, async () => {
          const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
              html: createHtml(templateTextChildStr, ['text', 'item1', 'item2'])
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

          const numberingDoc = restOfDocuments[1]

          const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

          should(paragraphNodes.length).eql(mode === 'block' ? 3 : 1)

          if (mode === 'block') {
            commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
            paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[2], templateTextNodesForDocxHtml[0], assertExtra)

            const numberingNumNodes = findChildNode((n) => (
              n.nodeName === 'w:num'
            ), numberingDoc.documentElement, true)

            should(numberingNumNodes.length).eql(1)

            const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
            should(textNodesInParagraph1.length).eql(1)
            should(textNodesInParagraph1[0].textContent).eql('text')
            const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
            should(textNodesInParagraph2.length).eql(1)
            should(textNodesInParagraph2[0].textContent).eql('item1')
            const textNodesInParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))
            should(textNodesInParagraph3.length).eql(1)
            should(textNodesInParagraph3[0].textContent).eql('item2')
          } else {
            paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
            const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
            should(textNodes.length).eql(3)
            should(textNodes[0].textContent).eql('text')
            should(textNodes[1].textContent).eql('item1')
            should(textNodes[2].textContent).eql('item2')
          }
        })

        const templateSiblingAndMultipleItemsStr = `<${listTag}><li>...</li><li>...</li><li>...</li></${listTag}><${listTag}><li>...</li><li>...</li><li>...</li></${listTag}>`

        it(`${mode} mode - <${listTag}> with sibling list and multiple items <${listTag}> ${templateSiblingAndMultipleItemsStr}`, async () => {
          const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
              html: createHtml(templateSiblingAndMultipleItemsStr, ['l1 item1', 'l1 item2', 'l1 item3', 'l2 item1', 'l2 item2', 'l2 item3'])
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

          const numberingDoc = restOfDocuments[1]

          const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

          should(paragraphNodes.length).eql(mode === 'block' ? 6 : 1)

          if (mode === 'block') {
            paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[1], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[2], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[3], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[4], templateTextNodesForDocxHtml[0], assertExtra)
            paragraphAssert(paragraphNodes[5], templateTextNodesForDocxHtml[0], assertExtra)

            const numberingNumNodes = findChildNode((n) => (
              n.nodeName === 'w:num'
            ), numberingDoc.documentElement, true)

            should(numberingNumNodes.length).eql(2)

            const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
            should(textNodesInParagraph1.length).eql(1)
            should(textNodesInParagraph1[0].textContent).eql('l1 item1')
            const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
            should(textNodesInParagraph2.length).eql(1)
            should(textNodesInParagraph2[0].textContent).eql('l1 item2')
            const textNodesInParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))
            should(textNodesInParagraph3.length).eql(1)
            should(textNodesInParagraph3[0].textContent).eql('l1 item3')
            const textNodesInParagraph4 = nodeListToArray(paragraphNodes[3].getElementsByTagName('w:t'))
            should(textNodesInParagraph4.length).eql(1)
            should(textNodesInParagraph4[0].textContent).eql('l2 item1')
            const textNodesInParagraph5 = nodeListToArray(paragraphNodes[4].getElementsByTagName('w:t'))
            should(textNodesInParagraph5.length).eql(1)
            should(textNodesInParagraph5[0].textContent).eql('l2 item2')
            const textNodesInParagraph6 = nodeListToArray(paragraphNodes[5].getElementsByTagName('w:t'))
            should(textNodesInParagraph6.length).eql(1)
            should(textNodesInParagraph6[0].textContent).eql('l2 item3')
          } else {
            paragraphAssert(paragraphNodes[0], templateTextNodesForDocxHtml[0], assertExtra)
            const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
            should(textNodes.length).eql(6)
            should(textNodes[0].textContent).eql('l1 item1')
            should(textNodes[1].textContent).eql('l1 item2')
            should(textNodes[2].textContent).eql('l1 item3')
            should(textNodes[3].textContent).eql('l2 item1')
            should(textNodes[4].textContent).eql('l2 item2')
            should(textNodes[5].textContent).eql('l2 item3')
          }
        })
      }
    })
  }

  describe('white space handling in html input', () => {
    for (const mode of ['block', 'inline']) {
      const templateSpaceStr = '<p>      ...      ...     </p>'

      it(`${mode} mode - ignore space ${templateSpaceStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateSpaceStr, ['Hello', 'World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
        should(textNodes.length).eql(1)
        commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodes[0].textContent).eql('Hello World')
      })

      const templateSpaceMultipleBlocksStr = '<div>  ...  </div>\n\n   <div>  ...  </div>\n'

      it(`${mode} mode - ignore space in multiple blocks ${templateSpaceMultipleBlocksStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateSpaceMultipleBlocksStr, ['Hello', 'World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(mode === 'block' ? 2 : 1)

        if (mode === 'block') {
          const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
          should(textNodesInParagraph1.length).eql(1)
          commonHtmlTextAssertions(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)
          should(textNodesInParagraph1[0].textContent).eql('Hello')
          const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
          should(textNodesInParagraph2.length).eql(1)
          commonHtmlTextAssertions(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)
          should(textNodesInParagraph2[0].textContent).eql('World')
        } else {
          const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
          should(textNodes.length).eql(2)
          commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
          should(textNodes[0].textContent).eql('Hello')
          should(textNodes[1].textContent).eql('World')
        }
      })

      const templateLineBreakStr = '\n<p>\n...</p>\n'

      it(`${mode} mode - ignore line break ${templateLineBreakStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateLineBreakStr, ['Hello'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
        should(textNodes.length).eql(1)
        commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodes[0].textContent).eql('Hello')
      })

      const templateSpaceTabLineBreakWithInlineStr = '<p>   ... \n\t\t\t\t<span> ...</span>\t  </p>'

      it(`${mode} mode - ignore space with inline element ${templateSpaceTabLineBreakWithInlineStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateSpaceTabLineBreakWithInlineStr, ['Hello', 'World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
        should(textNodes.length).eql(2)
        commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodes[0].textContent).eql('Hello ')
        should(textNodes[1].textContent).eql('World')
      })

      const templateLeadingSpaceInlineStr = '... <span>...</span>'

      it(`${mode} mode - preserve leading space with text and inline element ${templateLeadingSpaceInlineStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateLeadingSpaceInlineStr, ['Hello', 'World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
        should(textNodes.length).eql(2)
        commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodes[0].textContent).eql('Hello ')
        should(textNodes[1].textContent).eql('World')
      })

      const templateLeadingSpaceBlockStr = '... <p>...</p>'

      it(`${mode} mode - preserve leading space with text and block element ${templateLeadingSpaceBlockStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateLeadingSpaceBlockStr, ['Hello', 'World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(mode === 'block' ? 2 : 1)

        if (mode === 'block') {
          const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
          should(textNodesInParagraph1.length).eql(1)
          commonHtmlTextAssertions(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)
          should(textNodesInParagraph1[0].textContent).eql('Hello')
          const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
          should(textNodesInParagraph2.length).eql(1)
          commonHtmlTextAssertions(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)
          should(textNodesInParagraph2[0].textContent).eql('World')
        } else {
          const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
          should(textNodes.length).eql(2)
          commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
          should(textNodes[0].textContent).eql('Hello ')
          should(textNodes[1].textContent).eql('World')
        }
      })

      const templateTrailingSpaceInlineStr = '<span>...</span> ...'

      it(`${mode} mode - preserve trailing space with text and inline element ${templateTrailingSpaceInlineStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateTrailingSpaceInlineStr, ['Hello', 'World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
        should(textNodes.length).eql(2)
        commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodes[0].textContent).eql('Hello')
        should(textNodes[1].textContent).eql(' World')
      })

      const templateTrailingSpaceBlockStr = '<p>...</p> ...'

      it(`${mode} mode - preserve trailing space with text and block element ${templateTrailingSpaceBlockStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateTrailingSpaceBlockStr, ['Hello', 'World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(mode === 'block' ? 2 : 1)

        if (mode === 'block') {
          const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
          should(textNodesInParagraph1.length).eql(1)
          commonHtmlTextAssertions(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)
          should(textNodesInParagraph1[0].textContent).eql('Hello')
          const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
          should(textNodesInParagraph2.length).eql(1)
          commonHtmlTextAssertions(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)
          should(textNodesInParagraph2[0].textContent).eql('World')
        } else {
          const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
          should(textNodes.length).eql(2)
          commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
          should(textNodes[0].textContent).eql('Hello')
          should(textNodes[1].textContent).eql(' World')
        }
      })

      const templateLeadingTrailingSpaceInlineStr = '... <span>...</span> ...'

      it(`${mode} mode - preserve leading and trailing space with text and inline element ${templateLeadingTrailingSpaceInlineStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateLeadingTrailingSpaceInlineStr, ['Hello', 'World', 'Docx'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
        should(textNodes.length).eql(3)
        commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
        should(textNodes[0].textContent).eql('Hello ')
        should(textNodes[1].textContent).eql('World')
        should(textNodes[2].textContent).eql(' Docx')
      })

      const templateLeadingTrailingSpaceBlockStr = '... <p>...</p> ...'

      it(`${mode} mode - preserve leading and trailing space with text and block element ${templateLeadingTrailingSpaceBlockStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateLeadingTrailingSpaceBlockStr, ['Hello', 'World', 'Docx'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
        const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=html${mode === 'block' ? '' : ' inline=true'}}}`)
        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(mode === 'block' ? 3 : 1)

        if (mode === 'block') {
          const textNodesInParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
          should(textNodesInParagraph1.length).eql(1)
          commonHtmlTextAssertions(textNodesInParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)
          should(textNodesInParagraph1[0].textContent).eql('Hello')
          const textNodesInParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))
          should(textNodesInParagraph2.length).eql(1)
          commonHtmlTextAssertions(textNodesInParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)
          should(textNodesInParagraph2[0].textContent).eql('World')
          const textNodesInParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))
          should(textNodesInParagraph3.length).eql(1)
          commonHtmlTextAssertions(textNodesInParagraph3[0], templateTextNodesForDocxHtml[0].parentNode)
          should(textNodesInParagraph3[0].textContent).eql('Docx')
        } else {
          const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
          should(textNodes.length).eql(3)
          commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
          should(textNodes[0].textContent).eql('Hello ')
          should(textNodes[1].textContent).eql('World')
          should(textNodes[2].textContent).eql(' Docx')
        }
      })

      const templateTextWithSpaceInMiddleOfBlockStr = '<p><b>...</b>...<b>...</b></p>'

      it(`${mode} mode - preserve text with leading and trailing space in the middle of block element children ${templateTextWithSpaceInMiddleOfBlockStr}`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateTextWithSpaceInMiddleOfBlockStr, ['jsreport', ' is a ', 'javascript reporting server'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
        should(textNodes.length).eql(3)
        should(textNodes[0].textContent).eql('jsreport')
        should(textNodes[1].textContent).eql(' is a ')
        should(textNodes[2].textContent).eql('javascript reporting server')
      })
    }
  })

  describe('styles', () => {
    for (const mode of ['block', 'inline']) {
      const templateFontSizeStr = '<p style="font-size: 32px">...</p>'

      it(`${mode} mode - font size`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateFontSizeStr, ['Hello World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(1)

        findChildNode((n) => (
          n.nodeName === 'w:sz' &&
          n.getAttribute('w:val') != null && n.getAttribute('w:val') !== ''
        ), findChildNode('w:rPr', textNodes[0].parentNode)).should.be.ok()

        findChildNode((n) => (
          n.nodeName === 'w:szCs' &&
          n.getAttribute('w:val') != null && n.getAttribute('w:val') !== ''
        ), findChildNode('w:rPr', textNodes[0].parentNode)).should.be.ok()

        should(textNodes[0].textContent).eql('Hello World')
      })

      const templateFontFamilyStr = '<p style="font-family: Tahoma">...</p>'

      it(`${mode} mode - font family`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateFontFamilyStr, ['Hello World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(1)

        findChildNode((n) => (
          n.nodeName === 'w:rFonts' &&
          n.getAttribute('w:ascii') === 'Tahoma' &&
          n.getAttribute('w:hAnsi') === 'Tahoma'
        ), findChildNode('w:rPr', textNodes[0].parentNode)).should.be.ok()

        should(textNodes[0].textContent).eql('Hello World')
      })

      const templateFontFamily2Str = '<p style=\'font-family: "Times New Roman"\'>...</p>'

      it(`${mode} mode - font family with ""`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateFontFamily2Str, ['Hello World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(1)

        findChildNode((n) => (
          n.nodeName === 'w:rFonts' &&
          n.getAttribute('w:ascii') === 'Times New Roman' &&
          n.getAttribute('w:hAnsi') === 'Times New Roman'
        ), findChildNode('w:rPr', textNodes[0].parentNode)).should.be.ok()

        should(textNodes[0].textContent).eql('Hello World')
      })

      const templateColorStr = '<p style="color: red">...</p>'

      it(`${mode} mode - color`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateColorStr, ['Hello World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(1)

        findChildNode((n) => (
          n.nodeName === 'w:color' &&
          n.getAttribute('w:val') != null && n.getAttribute('w:val') !== ''
        ), findChildNode('w:rPr', textNodes[0].parentNode)).should.be.ok()

        should(textNodes[0].textContent).eql('Hello World')
      })

      const templateColor2Str = '<p style="color: #FF0000">...</p>'

      it(`${mode} mode - color #hex`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateColor2Str, ['Hello World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(1)

        findChildNode((n) => (
          n.nodeName === 'w:color' &&
          n.getAttribute('w:val') != null && n.getAttribute('w:val') !== ''
        ), findChildNode('w:rPr', textNodes[0].parentNode)).should.be.ok()

        should(textNodes[0].textContent).eql('Hello World')
      })

      const templateBackgroundColorStr = '<p style="background-color: blue">...</p>'

      it(`${mode} mode - background color`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateBackgroundColorStr, ['Hello World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(1)

        if (mode === 'block') {
          findChildNode((n) => (
            n.nodeName === 'w:shd' &&
            n.getAttribute('w:fill') != null && n.getAttribute('w:fill') !== ''
          ), findChildNode('w:pPr', textNodes[0].parentNode.parentNode)).should.be.ok()
        }

        findChildNode((n) => (
          n.nodeName === 'w:shd' &&
          n.getAttribute('w:fill') != null && n.getAttribute('w:fill') !== ''
        ), findChildNode('w:rPr', textNodes[0].parentNode)).should.be.ok()

        should(textNodes[0].textContent).eql('Hello World')
      })

      const templateBackgroundColor2Str = '<p style="background-color: #0000FF">...</p>'

      it(`${mode} mode - background color #hex`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateBackgroundColor2Str, ['Hello World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(1)

        if (mode === 'block') {
          findChildNode((n) => (
            n.nodeName === 'w:shd' &&
            n.getAttribute('w:fill') != null && n.getAttribute('w:fill') !== ''
          ), findChildNode('w:pPr', textNodes[0].parentNode.parentNode)).should.be.ok()
        }

        findChildNode((n) => (
          n.nodeName === 'w:shd' &&
          n.getAttribute('w:fill') != null && n.getAttribute('w:fill') !== ''
        ), findChildNode('w:rPr', textNodes[0].parentNode)).should.be.ok()

        should(textNodes[0].textContent).eql('Hello World')
      })

      const templateTextDecorationUnderlineStr = '<p style="text-decoration: underline">...</p>'

      it(`${mode} mode - text decoration underline`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateTextDecorationUnderlineStr, ['Hello World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(1)

        findChildNode((n) => (
          n.nodeName === 'w:u' &&
          n.getAttribute('w:val') === 'single'
        ), findChildNode('w:rPr', textNodes[0].parentNode)).should.be.ok()

        should(textNodes[0].textContent).eql('Hello World')
      })

      const templateTextDecorationLineThroughStr = '<p style="text-decoration: line-through">...</p>'

      it(`${mode} mode - text decoration line-through`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateTextDecorationLineThroughStr, ['Hello World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(1)

        findChildNode('w:strike', findChildNode('w:rPr', textNodes[0].parentNode)).should.be.ok()

        should(textNodes[0].textContent).eql('Hello World')
      })

      for (const textAlign of ['left', 'center', 'right', 'justify']) {
        const templateTextAlignStr = `<p style="text-align: ${textAlign}">...</p>`

        it(`${mode} mode - text align ${textAlign}`, async () => {
          const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
              html: createHtml(templateTextAlignStr, ['Hello World'])
            }
          })

          // Write document for easier debugging
          fs.writeFileSync('out.docx', result.content)

          const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

          const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

          should(paragraphNodes.length).eql(1)

          const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

          should(textNodes.length).eql(1)

          const targetVal = textAlign === 'justify' ? 'both' : textAlign

          if (mode === 'block') {
            findChildNode((n) => (
              n.nodeName = 'w:jc' &&
              n.getAttribute('w:val') === targetVal
            ), findChildNode('w:pPr', textNodes[0].parentNode.parentNode)).should.be.ok()
          }

          should(textNodes[0].textContent).eql('Hello World')
        })
      }

      for (const prop of ['padding', 'margin']) {
        for (const side of ['left', 'right', 'top', 'bottom']) {
          const templateStr = `<p style="padding-${side}: 50px">...</p>`

          it(`${mode} mode - ${prop} ${side}`, async () => {
            const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
                html: createHtml(templateStr, ['Hello World'])
              }
            })

            // Write document for easier debugging
            fs.writeFileSync('out.docx', result.content)

            const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

            const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

            should(paragraphNodes.length).eql(1)

            const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

            should(textNodes.length).eql(1)

            const targetCases = {
              left: (n) => (
                n.nodeName = 'w:ind' &&
                n.getAttribute('w:left') != null && n.getAttribute('w:left') !== ''
              ),
              right: (n) => (
                n.nodeName = 'w:ind' &&
                n.getAttribute('w:right') != null && n.getAttribute('w:right') !== ''
              ),
              top: (n) => (
                n.nodeName = 'w:spacing' &&
                n.getAttribute('w:before') != null && n.getAttribute('w:before') !== ''
              ),
              bottom: (n) => (
                n.nodeName = 'w:spacing' &&
                n.getAttribute('w:after') != null && n.getAttribute('w:after') !== ''
              )
            }

            if (mode === 'block') {
              findChildNode(targetCases[side], findChildNode('w:pPr', textNodes[0].parentNode.parentNode)).should.be.ok()
            }

            should(textNodes[0].textContent).eql('Hello World')
          })
        }

        const templateShorthandStr = `<p style="${prop}: 50px">...</p>`

        it(`${mode} mode - ${prop} shorthand`, async () => {
          const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
              html: createHtml(templateShorthandStr, ['Hello World'])
            }
          })

          // Write document for easier debugging
          fs.writeFileSync('out.docx', result.content)

          const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

          const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

          should(paragraphNodes.length).eql(1)

          const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

          should(textNodes.length).eql(1)

          if (mode === 'block') {
            findChildNode((n) => (
              n.nodeName = 'w:ind' &&
              n.getAttribute('w:left') != null && n.getAttribute('w:left') !== '' &&
              n.getAttribute('w:right') != null && n.getAttribute('w:right') !== ''
            ), findChildNode('w:pPr', textNodes[0].parentNode.parentNode)).should.be.ok()

            findChildNode((n) => (
              n.nodeName = 'w:spacing' &&
              n.getAttribute('w:before') != null && n.getAttribute('w:before') !== '' &&
              n.getAttribute('w:after') != null && n.getAttribute('w:after') !== ''
            ), findChildNode('w:pPr', textNodes[0].parentNode.parentNode)).should.be.ok()
          }

          should(textNodes[0].textContent).eql('Hello World')
        })
      }

      const templateBreakBeforePageStr = '<p style="break-before: page">...</p>'

      it(`${mode} mode - break before page`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateBreakBeforePageStr, ['Hello World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(1)

        findChildNode((n) => (
          n.nodeName === 'w:br' &&
          n.getAttribute('w:type') === 'page'
        ), textNodes[0].parentNode.previousSibling).should.be.ok()

        should(textNodes[0].textContent).eql('Hello World')
      })

      const templateBreakAfterPageStr = '<p style="break-after: page">...</p>'

      it(`${mode} mode - break after page`, async () => {
        const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block' : 'html-embed-inline'}.docx`))

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
            html: createHtml(templateBreakAfterPageStr, ['Hello World'])
          }
        })

        // Write document for easier debugging
        fs.writeFileSync('out.docx', result.content)

        const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

        const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

        should(paragraphNodes.length).eql(1)

        const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

        should(textNodes.length).eql(1)

        findChildNode((n) => (
          n.nodeName === 'w:br' &&
          n.getAttribute('w:type') === 'page'
        ), textNodes[0].parentNode.nextSibling).should.be.ok()

        should(textNodes[0].textContent).eql('Hello World')
      })
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
  createTagTemplate,
  IS_BLOCK_TAG,
  outputDocuments,
  paragraphAssert,
  textAssert
}) {
  repeatWithAlias(tag, (tag, alias) => {
    const templateStr = wrapWithLevel(createTagTemplate(tag, '...'))

    it(`${mode} mode - <${tag}>${alias} as ${level} ${templateStr}`, async () => {
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
          html: createHtml(templateStr, ['Hello World'])
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

  it(`${mode} mode - <${tag}> as ${level} preserve properties of element in template ${wrapWithLevel(createTagTemplate(tag, '...'))}`, async () => {
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
        html: createHtml(wrapWithLevel(createTagTemplate(tag, '...')), ['Hello World'])
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

  it(`${mode} mode - <${tag}> as ${level} and leading text sibling ${wrapWithLevel(`...${createTagTemplate(tag, '...')}`)}`, async () => {
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
        html: createHtml(wrapWithLevel(`...${createTagTemplate(tag, '...')}`), ['Hello', 'World'])
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

  it(`${mode} mode - <${tag}> as ${level} and trailing text sibling ${wrapWithLevel(`${createTagTemplate(tag, '...')}...`)}`, async () => {
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
        html: createHtml(wrapWithLevel(`${createTagTemplate(tag, '...')}...`), ['Hello', 'World'])
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

  it(`${mode} mode - <${tag}> as ${level} with leading and trailing text siblings ${wrapWithLevel(`...${createTagTemplate(tag, '...')}...`)}`, async () => {
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
        html: createHtml(wrapWithLevel(`...${createTagTemplate(tag, '...')}...`), ['Hello', 'World', 'Docx'])
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

  if (mode === 'inline' && parent == null) {
    it(`${mode} mode - <${tag}> as ${level} with leading text in docx ${wrapWithLevel(createTagTemplate(tag, '...'))}`, async () => {
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
          html: createHtml(wrapWithLevel(createTagTemplate(tag, '...')), ['Hello World'])
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

    it(`${mode} mode - <${tag}> as ${level} with trailing text in docx ${wrapWithLevel(createTagTemplate(tag, '...'))}`, async () => {
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
          html: createHtml(wrapWithLevel(createTagTemplate(tag, '...')), ['Hello World'])
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

    it(`${mode} mode - <${tag}> as ${level} with leading and trailing text in docx ${wrapWithLevel(createTagTemplate(tag, '...'))}`, async () => {
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
          html: createHtml(wrapWithLevel(createTagTemplate(tag, '...')), ['Hello World'])
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

  it(`${mode} mode - <${tag}> as ${level} in document header ${wrapWithLevel(`...${createTagTemplate(tag, '...')}`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block-header' : 'html-embed-inline-header'}.docx`))

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
        html: createHtml(wrapWithLevel(`...${createTagTemplate(tag, '...')}`), ['Hello', 'World']),
        headerHtml: createHtml(wrapWithLevel(`...${createTagTemplate(tag, '...')}`), ['Hello', 'World'])
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc, header1TemplateDoc, header2TemplateDoc, header3TemplateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml'])
    const [doc, header1Doc, header2Doc, header3Doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const targetDocs = [{ doc, templateDoc }]

    const headerInfos = [
      { doc: header1Doc, templateDoc: header1TemplateDoc },
      { doc: header2Doc, templateDoc: header2TemplateDoc },
      { doc: header3Doc, templateDoc: header3TemplateDoc }
    ]

    for (const headerInfo of headerInfos) {
      if (headerInfo.doc == null) {
        continue
      }

      const paragraphNodes = nodeListToArray(headerInfo.doc.getElementsByTagName('w:p'))

      if (paragraphNodes.length === 0) {
        continue
      }

      const textNodesInFirstParagraph = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

      if (textNodesInFirstParagraph.length === 0) {
        continue
      }

      targetDocs.push(headerInfo)
    }

    should(targetDocs.length).be.greaterThan(1)

    for (const [idx, { doc, templateDoc }] of targetDocs.entries()) {
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=${idx === 0 ? 'html' : 'headerHtml'}${mode === 'block' ? '' : ' inline=true'}}}`)
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
    }
  })

  it(`${mode} mode - <${tag}> as ${level} in document footer ${wrapWithLevel(`...${createTagTemplate(tag, '...')}`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block-footer' : 'html-embed-inline-footer'}.docx`))

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
        html: createHtml(wrapWithLevel(`...${createTagTemplate(tag, '...')}`), ['Hello', 'World']),
        footerHtml: createHtml(wrapWithLevel(`...${createTagTemplate(tag, '...')}`), ['Hello', 'World'])
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc, footer1TemplateDoc, footer2TemplateDoc, footer3TemplateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml', 'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'])
    const [doc, footer1Doc, footer2Doc, footer3Doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const targetDocs = [{ doc, templateDoc }]

    const footerInfos = [
      { doc: footer1Doc, templateDoc: footer1TemplateDoc },
      { doc: footer2Doc, templateDoc: footer2TemplateDoc },
      { doc: footer3Doc, templateDoc: footer3TemplateDoc }
    ]

    for (const footerInfo of footerInfos) {
      if (footerInfo.doc == null) {
        continue
      }

      const paragraphNodes = nodeListToArray(footerInfo.doc.getElementsByTagName('w:p'))

      if (paragraphNodes.length === 0) {
        continue
      }

      const textNodesInFirstParagraph = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

      if (textNodesInFirstParagraph.length === 0) {
        continue
      }

      targetDocs.push(footerInfo)
    }

    should(targetDocs.length).be.greaterThan(1)

    for (const [idx, { doc, templateDoc }] of targetDocs.entries()) {
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=${idx === 0 ? 'html' : 'footerHtml'}${mode === 'block' ? '' : ' inline=true'}}}`)
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
    }
  })

  it(`${mode} mode - <${tag}> as ${level} in document header and footer ${wrapWithLevel(`...${createTagTemplate(tag, '...')}`)}`, async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, `${mode === 'block' ? 'html-embed-block-header-footer' : 'html-embed-inline-header-footer'}.docx`))

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
        html: createHtml(wrapWithLevel(`...${createTagTemplate(tag, '...')}`), ['Hello', 'World']),
        headerHtml: createHtml(wrapWithLevel(`...${createTagTemplate(tag, '...')}`), ['Hello', 'World']),
        footerHtml: createHtml(wrapWithLevel(`...${createTagTemplate(tag, '...')}`), ['Hello', 'World'])
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc, header1TemplateDoc, header2TemplateDoc, header3TemplateDoc, footer1TemplateDoc, footer2TemplateDoc, footer3TemplateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml', 'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'])
    const [doc, header1Doc, header2Doc, header3Doc, footer1Doc, footer2Doc, footer3Doc, ...restOfDocuments] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml', 'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml', ...outputDocuments])

    const assertExtra = {
      mode,
      outputDocuments: restOfDocuments
    }

    const targetDocs = [{ doc, templateDoc }]

    const headerFooterInfos = [
      { type: 'header', doc: header1Doc, templateDoc: header1TemplateDoc },
      { type: 'header', doc: header2Doc, templateDoc: header2TemplateDoc },
      { type: 'header', doc: header3Doc, templateDoc: header3TemplateDoc },
      { type: 'footer', doc: footer1Doc, templateDoc: footer1TemplateDoc },
      { type: 'footer', doc: footer2Doc, templateDoc: footer2TemplateDoc },
      { type: 'footer', doc: footer3Doc, templateDoc: footer3TemplateDoc }
    ]

    for (const headerFooterInfo of headerFooterInfos) {
      if (headerFooterInfo.doc == null) {
        continue
      }

      const paragraphNodes = nodeListToArray(headerFooterInfo.doc.getElementsByTagName('w:p'))

      if (paragraphNodes.length === 0) {
        continue
      }

      const textNodesInFirstParagraph = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

      if (textNodesInFirstParagraph.length === 0) {
        continue
      }

      targetDocs.push(headerFooterInfo)
    }

    should(targetDocs.length).be.greaterThan(1)

    for (const [idx, { type, doc, templateDoc }] of targetDocs.entries()) {
      const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, `{{docxHtml content=${idx === 0 ? 'html' : `${type}Html`}${mode === 'block' ? '' : ' inline=true'}}}`)
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
    }
  })
}

function commonWithInlineAndBlockSiblings ({
  getReporter,
  tag,
  mode,
  level,
  wrapWithLevel,
  createTagTemplate,
  IS_BLOCK_TAG,
  outputDocuments,
  paragraphAssert,
  textAssert
}) {
  it(`${mode} mode - <${tag}> as ${level} and leading inline sibling ${wrapWithLevel(`<span>...</span>${createTagTemplate(tag, '...')}`)}`, async () => {
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
        html: createHtml(wrapWithLevel(`<span>...</span>${createTagTemplate(tag, '...')}`), ['Hello', 'World'])
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

  it(`${mode} mode - <${tag}> as ${level} and trailing inline sibling ${wrapWithLevel(`${createTagTemplate(tag, '...')}<span>...</span>`)}`, async () => {
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
        html: createHtml(wrapWithLevel(`${createTagTemplate(tag, '...')}<span>...</span>`), ['Hello', 'World'])
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
    const templateStr = wrapWithLevel(`<span>...</span>${createTagTemplate(tag, '...')}<span>...</span>`)

    it(`${mode} mode - <${tag}>${alias} as ${level} with leading and trailing inline siblings ${templateStr}`, async () => {
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
          html: createHtml(templateStr, ['Hello', 'World', 'Docx'])
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

  it(`${mode} mode - <${tag}> as ${level} and leading block sibling ${wrapWithLevel(`<p>...</p>${createTagTemplate(tag, '...')}`)}`, async () => {
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
        html: createHtml(wrapWithLevel(`<p>...</p>${createTagTemplate(tag, '...')}`), ['Hello', 'World'])
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

  it(`${mode} mode - <${tag}> as ${level} and trailing block sibling ${wrapWithLevel(`${createTagTemplate(tag, '...')}<p>...</p>`)}`, async () => {
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
        html: createHtml(wrapWithLevel(`${createTagTemplate(tag, '...')}<p>...</p>`), ['Hello', 'World'])
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
    it(`${mode} mode - <${tag}>${alias} as ${level} with leading and trailing block siblings ${wrapWithLevel(`<p>...</p>${createTagTemplate(tag, '...')}<p>...</p>`)}`, async () => {
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
          html: createHtml(wrapWithLevel(`<p>...</p>${createTagTemplate(tag, '...')}<p>...</p>`), ['Hello', 'World', 'Docx'])
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

  it(`${mode} mode - <${tag}> as ${level} with same as sibling ${wrapWithLevel(`${createTagTemplate(tag, '...')}${createTagTemplate(tag, '...')}`)}`, async () => {
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
        html: createHtml(wrapWithLevel(`${createTagTemplate(tag, '...')}${createTagTemplate(tag, '...')}`), ['Hello', 'World'])
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
  createTagTemplate,
  outputDocuments,
  paragraphAssert,
  textAssert
}) {
  it(`${mode} mode - <${tag}> as ${level} with leading inline child ${wrapWithLevel(createTagTemplate(tag, '<span>...</span>...'))}`, async () => {
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
        html: createHtml(wrapWithLevel(createTagTemplate(tag, '<span>...</span>...')), ['Hello', 'World'])
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

  it(`${mode} mode - <${tag}> as ${level} with trailing inline child ${wrapWithLevel(createTagTemplate(tag, '...<span>...</span>'))}`, async () => {
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
        html: createHtml(wrapWithLevel(createTagTemplate(tag, '...<span>...</span>')), ['Hello', 'World'])
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

  it(`${mode} mode - <${tag}> as ${level} with leading and trailing inline children ${wrapWithLevel(createTagTemplate(tag, '<span>...</span>...<span>...</span>'))}`, async () => {
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
        html: createHtml(wrapWithLevel(createTagTemplate(tag, '<span>...</span>...<span>...</span>')), ['Hello', 'World', 'Docx'])
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

  it(`${mode} mode - <${tag}> as ${level} with inline children ${wrapWithLevel(createTagTemplate(tag, '<span>...</span><span>...</span><span>...</span>'))}`, async () => {
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
        html: createHtml(wrapWithLevel(createTagTemplate(tag, '<span>...</span><span>...</span><span>...</span>')), ['Hello', 'World', 'Docx'])
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

  it(`${mode} mode - <${tag}> as ${level} with inline nested child ${wrapWithLevel(createTagTemplate(tag, '<span><span>...</span></span>'))}`, async () => {
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
        html: createHtml(wrapWithLevel(createTagTemplate(tag, '<span><span>...</span></span>')), ['Hello World'])
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

  it(`${mode} mode - <${tag}> as ${level} with leading block child ${wrapWithLevel(createTagTemplate(tag, '<p>...</p>...'), parent === 'block' ? 'div' : null)}`, async () => {
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
        html: createHtml(wrapWithLevel(createTagTemplate(tag, '<p>...</p>...'), parent === 'block' ? 'div' : null), ['Hello', 'World'])
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

  it(`${mode} mode - <${tag}> as ${level} with trailing block child ${wrapWithLevel(createTagTemplate(tag, '...<p>...</p>'), parent === 'block' ? 'div' : null)}`, async () => {
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
        html: createHtml(wrapWithLevel(createTagTemplate(tag, '...<p>...</p>'), parent === 'block' ? 'div' : null), ['Hello', 'World'])
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

  it(`${mode} mode - <${tag}> as ${level} with leading and trailing block children ${wrapWithLevel(createTagTemplate(tag, '<p>...</p>...<p>...</p>'), parent === 'block' ? 'div' : null)}`, async () => {
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
        html: createHtml(wrapWithLevel(createTagTemplate(tag, '<p>...</p>...<p>...</p>'), parent === 'block' ? 'div' : null), ['Hello', 'World', 'Docx'])
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

  it(`${mode} mode - <${tag}> as ${level} with block children ${wrapWithLevel(createTagTemplate(tag, '<p>...</p><p>...</p><p>...</p>'), parent === 'block' ? 'div' : null)}`, async () => {
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
        html: createHtml(wrapWithLevel(createTagTemplate(tag, '<p>...</p><p>...</p><p>...</p>'), parent === 'block' ? 'div' : null), ['Hello', 'World', 'Docx'])
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

  it(`${mode} mode - <${tag}> as ${level} with block nested child ${wrapWithLevel(createTagTemplate(tag, '<div><div>...</div></div>'), parent === 'block' ? 'div' : null)}`, async () => {
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
        html: createHtml(wrapWithLevel(createTagTemplate(tag, '<div><div>...</div></div>'), parent === 'block' ? 'div' : null), ['Hello World'])
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
  const getOpenCloseTags = options.getOpenCloseTags || ((tag) => [`<${tag}>`, `</${tag}>`])
  // paragraphAssert, textAssert will be called for the nodes that are
  // containing the html tag evaluated and that are expected to contain the modified changes
  const paragraphAssert = options.paragraphAssert || (() => {})
  const textAssert = options.textAssert || (() => {})
  const targetMode = options.targetMode || ['block', 'inline']
  const targetParent = options.targetParent || [null, 'inline', 'block']

  for (const mode of targetMode) {
    for (const parent of targetParent) {
      const level = `${parent == null ? 'root' : `child of ${parent}`}`
      const customWrapWithLevel = (...args) => wrapWithLevel(parent, ...args)

      const createTagTemplate = (tag, content) => {
        const [open, close] = getOpenCloseTags(tag)
        return [open, content, close].join('')
      }

      testsSuiteFn({
        getReporter,
        tag,
        mode,
        parent,
        level,
        wrapWithLevel: customWrapWithLevel,
        createTagTemplate,
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
  const templatePPropertiesEl = nodeListToArray(templatePNode.childNodes).find((n) => n.nodeName === 'w:pPr')
  const pPropertiesEl = nodeListToArray(pNode.childNodes).find((n) => n.nodeName === 'w:pPr')

  if (templatePPropertiesEl != null && pPropertiesEl != null) {
    // assert that we inherit paragraph properties
    should(templatePPropertiesEl.toString()).be.eql(pPropertiesEl.toString())
  }
}

function commonHtmlTextAssertions (tNode, templateRNode) {
  const templateRPropertiesEl = nodeListToArray(templateRNode.childNodes).find((n) => n.nodeName === 'w:rPr')
  const rPropertiesEl = nodeListToArray(tNode.parentNode.childNodes).find((n) => n.nodeName === 'w:rPr')

  if (templateRPropertiesEl != null && rPropertiesEl != null) {
    // assert that we inherit run properties
    should(templateRPropertiesEl.toString()).be.eql(rPropertiesEl.toString())
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

function createHtml (templateStr, words) {
  let nextWordIdx = 0
  const wordRegExp = /\.\.\./g

  return templateStr.replace(wordRegExp, () => {
    const result = words[nextWordIdx]

    if (result == null) {
      throw new Error(`There is no word at ${nextWordIdx} index, pass more items to the array of words`)
    }

    nextWordIdx++

    return result
  })
}
