const should = require('should')
const jsreport = require('@jsreport/jsreport-core')
const fs = require('fs')
const path = require('path')
const { getDocumentsFromDocxBuf } = require('./utils')
const WordExtractor = require('word-extractor')
const extractor = new WordExtractor()

const docxDirPath = path.join(__dirname, './docx')
const outputPath = path.join(__dirname, '../out.docx')

describe('docx TOC', () => {
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

  it('should update TOC', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'toc.docx'))
          }
        }
      },
      data: {
        chapters: [{
          chapter: 'chapter1'
        }, {
          chapter: 'chapter2'
        }, {
          chapter: 'chapter3'
        }]
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [settingsDoc] = await getDocumentsFromDocxBuf(result.content, ['word/settings.xml'])
    const existingUpdateFieldsEl = settingsDoc.documentElement.getElementsByTagName('w:updateFields')[0]

    existingUpdateFieldsEl.getAttribute('w:val').should.be.eql('true')

    const text = (await extractor.extract(result.content)).getBody()
    const parts = text.split('\n').filter((t) => t)

    parts[1].should.be.eql('chapter1\t1')
    parts[2].should.be.eql('chapter2\t1')
    parts[3].should.be.eql('chapter3\t1')
    parts[4].should.be.eql('chapter1')
    parts[6].should.be.eql('chapter2')
    parts[8].should.be.eql('chapter3')
  })

  it('should update TOC with updateFields xml setting when using docxTOCOptions helper', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'top-option-updateFields.docx'))
          }
        }
      },
      data: {
        tocUpdateFields: true,
        chapters: [{
          chapter: 'chapter1'
        }, {
          chapter: 'chapter2'
        }, {
          chapter: 'chapter3'
        }]
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [settingsDoc] = await getDocumentsFromDocxBuf(result.content, ['word/settings.xml'])
    const existingUpdateFieldsEl = settingsDoc.documentElement.getElementsByTagName('w:updateFields')[0]

    existingUpdateFieldsEl.getAttribute('w:val').should.be.eql('true')

    const text = (await extractor.extract(result.content)).getBody()
    const parts = text.split('\n').filter((t) => t)

    parts[1].should.be.eql('chapter1\t1')
    parts[2].should.be.eql('chapter2\t1')
    parts[3].should.be.eql('chapter3\t1')
    parts[4].should.be.eql('chapter1')
    parts[6].should.be.eql('chapter2')
    parts[8].should.be.eql('chapter3')
  })

  it('should update TOC without updateFields xml setting when using docxTOCOptions helper', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'top-option-updateFields.docx'))
          }
        }
      },
      data: {
        tocUpdateFields: false,
        chapters: [{
          chapter: 'chapter1'
        }, {
          chapter: 'chapter2'
        }, {
          chapter: 'chapter3'
        }]
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [settingsDoc] = await getDocumentsFromDocxBuf(result.content, ['word/settings.xml'])
    const existingUpdateFieldsEl = settingsDoc.documentElement.getElementsByTagName('w:updateFields')[0]

    should(existingUpdateFieldsEl).be.not.ok()

    const text = (await extractor.extract(result.content)).getBody()
    const parts = text.split('\n').filter((t) => t)

    parts[1].should.be.eql('chapter1\t1')
    parts[2].should.be.eql('chapter2\t1')
    parts[3].should.be.eql('chapter3\t1')
    parts[4].should.be.eql('chapter1')
    parts[6].should.be.eql('chapter2')
    parts[8].should.be.eql('chapter3')
  })

  it('should update TOC (english)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'toc-english.docx'))
          }
        }
      },
      data: {
        chapters: [{
          chapter: 'chapter1'
        }, {
          chapter: 'chapter2'
        }, {
          chapter: 'chapter3'
        }]
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    const parts = text.split('\n').filter((t) => t)

    parts[1].should.be.eql('chapter1\t1')
    parts[2].should.be.eql('chapter2\t1')
    parts[3].should.be.eql('chapter3\t1')
    parts[4].should.be.eql('chapter1')
    parts[6].should.be.eql('chapter2')
    parts[8].should.be.eql('chapter3')
  })

  it('should update TOC - with list items', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'toc-with-list.docx'))
          }
        }
      },
      data: {
        chapters: [{
          chapter: 'chapter1'
        }, {
          chapter: 'chapter2'
        }, {
          chapter: 'chapter3'
        }]
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    const parts = text.split('\n').filter((t) => t)

    parts[1].should.be.eql('1.\tchapter1\t1')
    parts[2].should.be.eql('2.\tchapter2\t1')
    parts[3].should.be.eql('3.\tchapter3\t1')
    parts[4].should.be.eql('chapter1')
    parts[6].should.be.eql('chapter2')
    parts[8].should.be.eql('chapter3')
  })

  it('should update TOC - nested', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'toc-nested.docx'))
          }
        }
      },
      data: {
        chapters: [{
          title: 'chapter 1',
          title2: 'chapter 1.1',
          title3: 'chapter 1.1.1'
        }, {
          title: 'chapter 2',
          title2: 'chapter 2.1',
          title3: 'chapter 2.1.1'
        }, {
          title: 'chapter 3',
          title2: 'chapter 3.1',
          title3: 'chapter 3.1.1'
        }]
      }
    })

    fs.writeFileSync(outputPath, result.content)
    const text = (await extractor.extract(result.content)).getBody()
    const parts = text.split('\n').filter((t) => t)

    parts[1].should.be.eql('chapter 1\t1')
    parts[2].should.be.eql('chapter 1.1\t1')
    parts[3].should.be.eql('chapter 1.1.1\t1')
    parts[4].should.be.eql('chapter 2\t1')
    parts[5].should.be.eql('chapter 2.1\t1')
    parts[6].should.be.eql('chapter 2.1.1\t1')
    parts[7].should.be.eql('chapter 3\t1')
    parts[8].should.be.eql('chapter 3.1\t1')
    parts[9].should.be.eql('chapter 3.1.1\t1')
    parts[10].should.be.eql('chapter 1')
    parts[12].should.be.eql('chapter 1.1')
    parts[14].should.be.eql('chapter 1.1.1')
    parts[16].should.be.eql('chapter 2')
    parts[18].should.be.eql('chapter 2.1')
    parts[20].should.be.eql('chapter 2.1.1')
    parts[22].should.be.eql('chapter 3')
    parts[24].should.be.eql('chapter 3.1')
    parts[26].should.be.eql('chapter 3.1.1')
  })

  it('should be able to handle TOC with heading style name without prefix', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'toc-from-chinese-language-setting.docx'))
          }
        }
      },
      data: {}
    })

    fs.writeFileSync(outputPath, result.content)

    const [settingsDoc] = await getDocumentsFromDocxBuf(result.content, ['word/settings.xml'])
    const existingUpdateFieldsEl = settingsDoc.documentElement.getElementsByTagName('w:updateFields')[0]

    existingUpdateFieldsEl.getAttribute('w:val').should.be.eql('true')

    const text = (await extractor.extract(result.content)).getBody()
    const parts = text.split('\n').filter((t) => t)

    should(parts).have.length(3)
    parts[1].should.be.eql('Heading 1\t1')
    parts[2].should.be.eql('Heading 1')
  })

  it('should be able to remove TOC Title without producing corrupted document if title is wrapped in condition with closing if on next paragraph', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'toc-title-if-remove.docx'))
          }
        }
      },
      data: {}
    })

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const documentXML = doc.toString()

    should(documentXML.includes('<TOCTitle>')).be.false()

    fs.writeFileSync(outputPath, result.content)
  })

  it('should be able to remove TOC Title without producing corrupted document if title is wrapped in condition with closing if on next paragraph (with other condition inside title)', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'toc-title-if-remove2.docx'))
          }
        }
      },
      data: {}
    })

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const documentXML = doc.toString()

    should(documentXML.includes('<TOCTitle>')).be.false()

    fs.writeFileSync(outputPath, result.content)
  })

  it('should be able to remove TOC Title without producing corrupted document if title is wrapped in condition with closing if on some next paragraph', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'toc-title-if-remove3.docx'))
          }
        }
      },
      data: {}
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const documentXML = doc.toString()

    should(documentXML.includes('<TOCTitle>')).be.false()

    const text = (await extractor.extract(result.content)).getBody()
    const parts = text.split('\n').filter((t) => t)

    parts.should.have.length(4)

    parts[0].should.be.eql('Title1')
    parts[1].should.be.eql('Some text')
    parts[2].should.be.eql('Title1.1.1')
    parts[3].should.be.eql('Some text')
  })

  it('should be able to remove TOC Title without producing corrupted document when closing if is on same line of chart', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'toc-title-if-remove4.docx'))
          }
        }
      },
      data: {}
    })

    fs.writeFileSync(outputPath, result.content)

    const [doc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml'])
    const documentXML = doc.toString()

    should(documentXML.includes('<TOCTitle>')).be.false()
  })

  it('should keep TOC if no changes to titles are done', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'toc-keep-as-it-is.docx'))
          }
        }
      },
      data: {}
    })

    fs.writeFileSync(outputPath, result.content)

    const [, settingsDoc] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/settings.xml'], {
      strict: true
    })

    const existingUpdateFieldsEl = settingsDoc.documentElement.getElementsByTagName('w:updateFields')[0]

    existingUpdateFieldsEl.getAttribute('w:val').should.be.eql('true')

    const text = (await extractor.extract(result.content)).getBody()
    const parts = text.split('\n').filter((t) => t)

    const tocStartIndex = parts.findIndex((p) => p.startsWith('Inhalt'))
    const tocItems = parts.slice(tocStartIndex + 1, tocStartIndex + 14)

    should(tocItems.length).be.eql(13)

    tocItems[0].should.be.eql('1.\tKennzahlen')
    tocItems[1].should.be.eql('1.\tMonatliche absolute Kennzahlen')
    tocItems[2].should.be.eql('2.\tMonatliche spezifische Kennzahlen')
    tocItems[3].should.be.eql('3.\tProduktion')
    tocItems[4].should.be.eql('4.\tPerformance Ratio')
    tocItems[5].should.be.eql('5.\tEinstrahlung')
    tocItems[6].should.be.eql('2.\tErläuterungen')
    tocItems[7].should.be.eql('3.\tKurzzusammenfassung wesentlicher Ereignisse')
    tocItems[8].should.be.eql('4.\tBericht über präventive Wartungen und Inspektionen')
    tocItems[9].should.be.eql('5.\tSpezifischer Langzeitertrag')
    tocItems[10].should.be.eql('6.\tErtragsausfall und Betriebsbericht')
    tocItems[11].should.be.eql('1.\tÜbersicht')
    tocItems[12].should.be.eql('2.\tAbregelungen - Details')
  })
})
