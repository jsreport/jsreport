const should = require('should')
const fs = require('fs')
const path = require('path')
const jsreport = require('@jsreport/jsreport-core')
const WordExtractor = require('word-extractor')
const { nodeListToArray, findChildNode } = require('../lib/utils')
const { getDocumentsFromDocxBuf, getTextNodesMatching } = require('./utils')
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

  it('block - simple <p>...</p>', async () => {
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
        html: '<p>Hello World</p>'
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

  it('block - multiple <p>...</p><p>...</p>', async () => {
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
        html: '<p>Hello World</p><p>from another paragraph</p>'
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html}}')
    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(2)

    commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)

    const textNodesParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(textNodesParagraph1.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph1[0].textContent).eql('Hello World')

    const textNodesParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))

    should(textNodesParagraph2.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph2[0].textContent).eql('from another paragraph')
  })

  it('block - span root and block sibling <span>...</span><p>...</p>', async () => {
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
        html: '<span>Hello</span><p>World</p>'
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html}}')
    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(2)

    commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)

    const textNodesParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(textNodesParagraph1.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph1[0].textContent).eql('Hello')

    const textNodesParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))

    should(textNodesParagraph2.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph2[0].textContent).eql('World')
  })

  it('block - span child <p><span>...</span></p>', async () => {
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
        html: '<p><span>Hello World</span></p>'
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

  it('block - leading text and span child <p>...<span>...</span></p>', async () => {
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
        html: '<p>Hello<span>World</span></p>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello')
    should(textNodes[1].textContent).eql('World')
  })

  it('block - trailing text and span child <p><span>...</span>...</p>', async () => {
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
        html: '<p><span>Hello</span>World</p>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello')
    should(textNodes[1].textContent).eql('World')
  })

  it('block - leading and trailing text with span child <p>...<span>...</span>...</p>', async () => {
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
        html: '<p>Hello<span>World</span>Again</p>'
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

    should(textNodes.length).eql(3)

    commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[2], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello')
    should(textNodes[1].textContent).eql('World')
    should(textNodes[2].textContent).eql('Again')
  })

  it('block - leading text and span child preserving space <p>... <span>...</span></p>', async () => {
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
        html: '<p>Hello <span>World</span></p>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello ')
    should(textNodes[1].textContent).eql('World')
  })

  it('block - trailing text and span child preserving space <p><span>...</span> ...</p>', async () => {
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
        html: '<p><span>Hello</span> World</p>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello')
    should(textNodes[1].textContent).eql(' World')
  })

  it('block - leading and trailing text with span child preserving space <p>... <span>...</span> ...</p>', async () => {
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
        html: '<p>Hello <span>World</span> Again</p>'
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

    should(textNodes.length).eql(3)

    commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[2], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello ')
    should(textNodes[1].textContent).eql('World')
    should(textNodes[2].textContent).eql(' Again')
  })

  it('block - nested block child <p><p>...</p></p>', async () => {
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
        html: '<p><p>Hello World</p></p>'
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

  it('block - multiple nested block child <p><p><p>...</p></p></p>', async () => {
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
        html: '<p><p><p>Hello World</p></p></p>'
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

  it('block - leading text and nested block child <p>...<p>...</p></p>', async () => {
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
        html: '<p>Hello World<p>from another paragraph</p></p>'
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html}}')
    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(2)

    commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)

    const textNodesParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(textNodesParagraph1.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph1[0].textContent).eql('Hello World')

    const textNodesParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))

    should(textNodesParagraph2.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph2[0].textContent).eql('from another paragraph')
  })

  it('block - trailing text and nested block child <p><p>...</p>...</p>', async () => {
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
        html: '<p><p>Hello World</p>from another paragraph</p>'
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html}}')
    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(2)

    commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)

    const textNodesParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(textNodesParagraph1.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph1[0].textContent).eql('Hello World')

    const textNodesParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))

    should(textNodesParagraph2.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph2[0].textContent).eql('from another paragraph')
  })

  it('block - leading and trailing text with nested block child <p>...<p>...</p>...</p>', async () => {
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
        html: '<p>Hello<p>World</p>from another paragraph</p>'
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html}}')
    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(3)

    commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[2], templateTextNodesForDocxHtml[0].parentNode.parentNode)

    const textNodesParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(textNodesParagraph1.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph1[0].textContent).eql('Hello')

    const textNodesParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))

    should(textNodesParagraph2.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph2[0].textContent).eql('World')

    const textNodesParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))

    should(textNodesParagraph3.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph3[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph3[0].textContent).eql('from another paragraph')
  })

  it('block - multiple nested continued <p>...<p>...<p>...<p>...</p><p>...</p>...</p>...</p>...</p>', async () => {
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
        html: '<p>Hello<p>World<p>from<p>another</p><p>paragraph</p>nested</p>of text</p>in docx</p>'
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html}}')
    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(8)

    commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[2], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[3], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[4], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[5], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[6], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[7], templateTextNodesForDocxHtml[0].parentNode.parentNode)

    const textNodesParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(textNodesParagraph1.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph1[0].textContent).eql('Hello')

    const textNodesParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))

    should(textNodesParagraph2.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph2[0].textContent).eql('World')

    const textNodesParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))

    should(textNodesParagraph3.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph3[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph3[0].textContent).eql('from')

    const textNodesParagraph4 = nodeListToArray(paragraphNodes[3].getElementsByTagName('w:t'))

    should(textNodesParagraph4.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph4[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph4[0].textContent).eql('another')

    const textNodesParagraph5 = nodeListToArray(paragraphNodes[4].getElementsByTagName('w:t'))

    should(textNodesParagraph5.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph5[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph5[0].textContent).eql('paragraph')

    const textNodesParagraph6 = nodeListToArray(paragraphNodes[5].getElementsByTagName('w:t'))

    should(textNodesParagraph6.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph6[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph6[0].textContent).eql('nested')

    const textNodesParagraph7 = nodeListToArray(paragraphNodes[6].getElementsByTagName('w:t'))

    should(textNodesParagraph7.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph7[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph7[0].textContent).eql('of text')

    const textNodesParagraph8 = nodeListToArray(paragraphNodes[7].getElementsByTagName('w:t'))

    should(textNodesParagraph8.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph8[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph8[0].textContent).eql('in docx')
  })

  it('block - nested alternative block child <div<p>...</p></div>', async () => {
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
        html: '<div><p>Hello World</p></div>'
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

  it('block - multiple nested alternative block child <div><div><p>...</p></div></div>', async () => {
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
        html: '<div><div><p>Hello World</p></div></div>'
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

  it('block - leading text and nested alternative block child <div>...<p>...</p></div>', async () => {
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
        html: '<div>Hello World<p>from another paragraph</p></div>'
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html}}')
    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(2)

    commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)

    const textNodesParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(textNodesParagraph1.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph1[0].textContent).eql('Hello World')

    const textNodesParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))

    should(textNodesParagraph2.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph2[0].textContent).eql('from another paragraph')
  })

  it('block - trailing text and nested alternative block child <div><p>...</p>...</div>', async () => {
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
        html: '<div><p>Hello World</p>from another paragraph</div>'
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html}}')
    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(2)

    commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)

    const textNodesParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(textNodesParagraph1.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph1[0].textContent).eql('Hello World')

    const textNodesParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))

    should(textNodesParagraph2.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph2[0].textContent).eql('from another paragraph')
  })

  it('block - leading and trailing text with nested alternative block child <div>...<p>...</p>...</div>', async () => {
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
        html: '<div>Hello<p>World</p>from another paragraph</div>'
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html}}')
    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(3)

    commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[2], templateTextNodesForDocxHtml[0].parentNode.parentNode)

    const textNodesParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(textNodesParagraph1.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph1[0].textContent).eql('Hello')

    const textNodesParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))

    should(textNodesParagraph2.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph2[0].textContent).eql('World')

    const textNodesParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))

    should(textNodesParagraph3.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph3[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph3[0].textContent).eql('from another paragraph')
  })

  it('block - multiple nested block alternative continued <div>...<div>...<div>...<div>...</div><div>...</div>...</div>...</div>...</div>', async () => {
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
        html: '<div>Hello<div>World<div>from<div>another</div><div>paragraph</div>nested</div>of text</div>in docx</div>'
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(docxTemplateBuf, ['word/document.xml'])
    const templateTextNodesForDocxHtml = getTextNodesMatching(templateDoc, '{{docxHtml content=html}}')
    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(8)

    commonHtmlParagraphAssertions(paragraphNodes[0], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[1], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[2], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[3], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[4], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[5], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[6], templateTextNodesForDocxHtml[0].parentNode.parentNode)
    commonHtmlParagraphAssertions(paragraphNodes[7], templateTextNodesForDocxHtml[0].parentNode.parentNode)

    const textNodesParagraph1 = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))

    should(textNodesParagraph1.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph1[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph1[0].textContent).eql('Hello')

    const textNodesParagraph2 = nodeListToArray(paragraphNodes[1].getElementsByTagName('w:t'))

    should(textNodesParagraph2.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph2[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph2[0].textContent).eql('World')

    const textNodesParagraph3 = nodeListToArray(paragraphNodes[2].getElementsByTagName('w:t'))

    should(textNodesParagraph3.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph3[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph3[0].textContent).eql('from')

    const textNodesParagraph4 = nodeListToArray(paragraphNodes[3].getElementsByTagName('w:t'))

    should(textNodesParagraph4.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph4[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph4[0].textContent).eql('another')

    const textNodesParagraph5 = nodeListToArray(paragraphNodes[4].getElementsByTagName('w:t'))

    should(textNodesParagraph5.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph5[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph5[0].textContent).eql('paragraph')

    const textNodesParagraph6 = nodeListToArray(paragraphNodes[5].getElementsByTagName('w:t'))

    should(textNodesParagraph6.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph6[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph6[0].textContent).eql('nested')

    const textNodesParagraph7 = nodeListToArray(paragraphNodes[6].getElementsByTagName('w:t'))

    should(textNodesParagraph7.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph7[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph7[0].textContent).eql('of text')

    const textNodesParagraph8 = nodeListToArray(paragraphNodes[7].getElementsByTagName('w:t'))

    should(textNodesParagraph8.length).eql(1)

    commonHtmlTextAssertions(textNodesParagraph8[0], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodesParagraph8[0].textContent).eql('in docx')
  })

  it('block - unsupported element should fallback to inline element <div>...<unsupported><div>...</div>...</unsupported></div>', async () => {
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
        html: '<div>Hello World<unsupported><div>from</div>unsupported tag</unsupported></div>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello World')
    should(textNodes[1].textContent).eql('fromunsupported tag')
  })

  it('block - preserve properties of element in template', async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-block-preserve-properties.docx'))

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
        html: '<p>Hello World</p>'
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
    should(findChildNode('w:b', findChildNode('w:rPr', textNodes[0].parentNode))).be.ok()
  })

  it('block - <b> tag', async () => {
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
        html: '<p>Hello <b>World</b></p>'
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
  })

  it('block - <b> tag with children', async () => {
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
        html: '<p>Hello <b><span><span>World</span></span></b></p>'
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
  })

  it('block - <i> tag', async () => {
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
        html: '<p>Hello <i>World</i></p>'
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
    should(findChildNode('w:i', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
  })

  it('block - <i> tag with children', async () => {
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
        html: '<p>Hello <i><span><span>World</span></span></i></p>'
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
    should(findChildNode('w:i', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
  })

  it('block - <u> tag', async () => {
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
        html: '<p>Hello <u>World</u></p>'
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
    should(findChildNode('w:u', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
  })

  it('block - <u> tag with children', async () => {
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
        html: '<p>Hello <u><span><span>World</span></span></u></p>'
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
    should(findChildNode('w:u', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
  })

  it('block - combined <b><i><u>...</u></i></b>', async () => {
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
        html: '<p>Hello <b><i><u>World</u></i></b></p>'
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

  it('block - <h1> - <h6>', async () => {
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

  it('block - child <h1> - <h6>', async () => {
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
          '<div>before title<h1>Testing title</h1>another text</div>',
          '<div>before title<h2>Testing title2</h2>another text</div>',
          '<div>before title<h3>Testing title3</h3>another text</div>',
          '<div>before title<h4>Testing title4</h4>another text</div>',
          '<div>before title<h5>Testing title5</h5>another text</div>',
          '<div>before title<h6>Testing title6</h6>another text</div>'
        ].join('')
      }
    })

    // Write document for easier debugging
    fs.writeFileSync('out.docx', result.content)

    const [doc, stylesDoc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/styles.xml'])

    const paragraphNodes = nodeListToArray(doc.getElementsByTagName('w:p'))

    should(paragraphNodes.length).eql(18)

    for (const [paragraphIdx, paragraphNode] of paragraphNodes.entries()) {
      const textNodes = nodeListToArray(paragraphNode.getElementsByTagName('w:t'))
      should(textNodes.length).eql(1)
      const isAtTitlePosition = textNodes[0].textContent.startsWith('Testing title')

      if (isAtTitlePosition) {
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
        if (paragraphIdx === 0 || paragraphIdx % 3 === 0) {
          should(textNodes[0].textContent).eql('before title')
        } else {
          should(textNodes[0].textContent).eql('another text')
        }
      }
    }
  })

  it('inline - simple <p>...</p>', async () => {
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
        html: '<p>Hello World</p>'
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

  it('inline - simple with leading text in docx <p>...</p>', async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-inline-with-leading-text.docx'))

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
        html: '<p>Hello World</p>'
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

    const extractedDoc = await extractor.extract(result.content)
    extractedDoc.getBody().should.be.eql('Leading text Hello World\n')

    const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
    const textNode = textNodes.find((t) => t.textContent === 'Hello World')

    commonHtmlTextAssertions(textNode, templateTextNodesForDocxHtml[0].parentNode)
  })

  it('inline - simple with trailing text in docx <p>...</p>', async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-inline-with-trailing-text.docx'))

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
        html: '<p>Hello World</p>'
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

    const extractedDoc = await extractor.extract(result.content)
    extractedDoc.getBody().should.be.eql('Hello World Trailing text\n')

    const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
    const textNode = textNodes.find((t) => t.textContent === 'Hello World')

    commonHtmlTextAssertions(textNode, templateTextNodesForDocxHtml[0].parentNode)
  })

  it('inline - simple with leading and trailing text in docx <p>...</p>', async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-inline-with-text.docx'))

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
        html: '<p>Hello World</p>'
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

    const extractedDoc = await extractor.extract(result.content)
    extractedDoc.getBody().should.be.eql('Leading text Hello World and Trailing text\n')

    const textNodes = nodeListToArray(paragraphNodes[0].getElementsByTagName('w:t'))
    const textNode = textNodes.find((t) => t.textContent === 'Hello World')

    commonHtmlTextAssertions(textNode, templateTextNodesForDocxHtml[0].parentNode)
  })

  it('inline - multiple <p>...</p><p>...</p>', async () => {
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
        html: '<p>Hello World</p><p>from another text</p>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello World')
    should(textNodes[1].textContent).eql('from another text')
  })

  it('inline - span root and block sibling <span>...</span><p>...</p>', async () => {
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
        html: '<span>Hello</span><p>World</p>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello')
    should(textNodes[1].textContent).eql('World')
  })

  it('inline - span child <p><span>...</span></p>', async () => {
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
        html: '<p><span>Hello World</span></p>'
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

  it('inline - leading text and span child <p>...<span>...</span></p>', async () => {
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
        html: '<p>Hello<span>World</span></p>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello')
    should(textNodes[1].textContent).eql('World')
  })

  it('inline - trailing text and span child <p><span>...</span>...</p>', async () => {
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
        html: '<p><span>Hello</span>World</p>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello')
    should(textNodes[1].textContent).eql('World')
  })

  it('inline - leading and trailing text with span child <p>...<span>...</span>...</p>', async () => {
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
        html: '<p>Hello<span>World</span>Again</p>'
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

    should(textNodes.length).eql(3)

    commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[2], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello')
    should(textNodes[1].textContent).eql('World')
    should(textNodes[2].textContent).eql('Again')
  })

  it('inline - leading text and span child preserving space <p>... <span>...</span></p>', async () => {
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
        html: '<p>Hello <span>World</span></p>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello ')
    should(textNodes[1].textContent).eql('World')
  })

  it('inline - trailing text and span child preserving space <p><span>...</span> ...</p>', async () => {
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
        html: '<p><span>Hello</span> World</p>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello')
    should(textNodes[1].textContent).eql(' World')
  })

  it('inline - leading and trailing text with span child preserving space <p>... <span>...</span> ...</p>', async () => {
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
        html: '<p>Hello <span>World</span> Again</p>'
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

    should(textNodes.length).eql(3)

    commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[2], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello ')
    should(textNodes[1].textContent).eql('World')
    should(textNodes[2].textContent).eql(' Again')
  })

  it('inline - nested block child <p><p>...</p></p>', async () => {
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
        html: '<p><p>Hello World</p></p>'
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

  it('inline - multiple nested block child <p><p><p>...</p></p></p>', async () => {
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
        html: '<p><p><p>Hello World</p></p></p>'
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

  it('inline - leading text and nested block child <p>...<p>...</p></p>', async () => {
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
        html: '<p>Hello World<p>from another text</p></p>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello World')
    should(textNodes[1].textContent).eql('from another text')
  })

  it('inline - trailing text and nested block child <p><p>...</p>...</p>', async () => {
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
        html: '<p><p>Hello World</p>from another text</p>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello World')
    should(textNodes[1].textContent).eql('from another text')
  })

  it('inline - leading and trailing text with nested block child <p>...<p>...</p>...</p>', async () => {
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
        html: '<p>Hello<p>World</p>from another text</p>'
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

    should(textNodes.length).eql(3)

    commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[2], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello')
    should(textNodes[1].textContent).eql('World')
    should(textNodes[2].textContent).eql('from another text')
  })

  it('inline - multiple nested continued <p>...<p>...<p>...<p>...</p><p>...</p>...</p>...</p>...</p>', async () => {
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
        html: '<p>Hello<p>World<p>from<p>another</p><p>text</p>nested</p>of text</p>in docx</p>'
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

    should(textNodes.length).eql(8)

    commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[2], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[3], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[4], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[5], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[6], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[7], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello')
    should(textNodes[1].textContent).eql('World')
    should(textNodes[2].textContent).eql('from')
    should(textNodes[3].textContent).eql('another')
    should(textNodes[4].textContent).eql('text')
    should(textNodes[5].textContent).eql('nested')
    should(textNodes[6].textContent).eql('of text')
    should(textNodes[7].textContent).eql('in docx')
  })

  it('inline - nested alternative block child <div<p>...</p></div>', async () => {
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
        html: '<div><p>Hello World</p></div>'
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

  it('inline - multiple nested alternative block child <div><div><p>...</p></div></div>', async () => {
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
        html: '<div><div><p>Hello World</p></div></div>'
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

  it('inline - leading text and nested alternative block child <div>...<p>...</p></div>', async () => {
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
        html: '<div>Hello World<p>from another text</p></div>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello World')
    should(textNodes[1].textContent).eql('from another text')
  })

  it('inline - trailing text and nested alternative block child <div><p>...</p>...</div>', async () => {
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
        html: '<div><p>Hello World</p>from another text</div>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello World')
    should(textNodes[1].textContent).eql('from another text')
  })

  it('inline - leading and trailing text with nested alternative block child <div>...<p>...</p>...</div>', async () => {
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
        html: '<div>Hello<p>World</p>from another text</div>'
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

    should(textNodes.length).eql(3)

    commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[2], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello')
    should(textNodes[1].textContent).eql('World')
    should(textNodes[2].textContent).eql('from another text')
  })

  it('inline - multiple nested block alternative continued <div>...<div>...<div>...<div>...</div><div>...</div>...</div>...</div>...</div>', async () => {
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
        html: '<div>Hello<div>World<div>from<div>another</div><div>text</div>nested</div>of text</div>in docx</div>'
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

    should(textNodes.length).eql(8)

    commonHtmlTextAssertions(textNodes[0], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[2], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[3], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[4], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[5], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[6], templateTextNodesForDocxHtml[0].parentNode)
    commonHtmlTextAssertions(textNodes[7], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello')
    should(textNodes[1].textContent).eql('World')
    should(textNodes[2].textContent).eql('from')
    should(textNodes[3].textContent).eql('another')
    should(textNodes[4].textContent).eql('text')
    should(textNodes[5].textContent).eql('nested')
    should(textNodes[6].textContent).eql('of text')
    should(textNodes[7].textContent).eql('in docx')
  })

  it('inline - unsupported element should fallback to inline element <div>...<unsupported><div>...</div>...</unsupported></div>', async () => {
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
        html: '<div>Hello World<unsupported><div>from</div>unsupported tag</unsupported></div>'
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
    commonHtmlTextAssertions(textNodes[1], templateTextNodesForDocxHtml[0].parentNode)

    should(textNodes[0].textContent).eql('Hello World')
    should(textNodes[1].textContent).eql('fromunsupported tag')
  })

  it('inline - preserve properties of element in template', async () => {
    const docxTemplateBuf = fs.readFileSync(path.join(__dirname, 'html-embed-inline-preserve-properties.docx'))

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
        html: '<span>Hello World</span>'
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
    should(findChildNode('w:b', findChildNode('w:rPr', textNodes[0].parentNode))).be.ok()
  })

  it('inline - <b> tag', async () => {
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
        html: '<p>Hello <b>World</b></p>'
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
  })

  it('inline - <b> tag with children', async () => {
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
        html: '<p>Hello <b><span><span>World</span></span></b></p>'
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
  })

  it('inline - <i> tag', async () => {
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
        html: '<p>Hello <i>World</i></p>'
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
    should(findChildNode('w:i', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
  })

  it('inline - <i> tag with children', async () => {
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
        html: '<p>Hello <i><span><span>World</span></span></i></p>'
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
    should(findChildNode('w:i', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
  })

  it('inline - <u> tag', async () => {
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
        html: '<p>Hello <u>World</u></p>'
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
    should(findChildNode('w:u', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
  })

  it('inline - <u> tag with children', async () => {
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
        html: '<p>Hello <u><span><span>World</span></span></u></p>'
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
    should(findChildNode('w:u', findChildNode('w:rPr', textNodes[1].parentNode))).be.ok()
  })

  it('inline - combined <b><i><u>...</u></i></b>', async () => {
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
        html: '<p>Hello <b><i><u>World</u></i></b></p>'
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
