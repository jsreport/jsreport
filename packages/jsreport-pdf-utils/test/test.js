const JsReport = require('@jsreport/jsreport-core')
const parsePdf = require('../lib/utils/parsePdf')
const fs = require('fs')
const path = require('path')
const { External } = require('@jsreport/pdfjs')
const { extractSignature } = require('@jsreport/node-signpdf/dist/helpers')
const should = require('should')
const zlib = require('zlib')
const { createHash } = require('crypto')
const PdfManipulator = require('../lib/pdfManipulator')

describe('pdf utils', () => {
  let jsreport

  beforeEach(async () => {
    jsreport = JsReport({
      reportTimeout: 999999999,
      encryption: {
        secretKey: '1111111811111118'
      },
      rootDirectory: path.join(__dirname, '../../../')
    })

    jsreport.use(require('@jsreport/jsreport-chrome-pdf')({
      launchOptions: {
        args: ['--no-sandbox']
      }
    }))
    jsreport.use(require('@jsreport/jsreport-assets')())
    jsreport.use(require('@jsreport/jsreport-handlebars')())
    jsreport.use(require('@jsreport/jsreport-jsrender')())
    jsreport.use(require('@jsreport/jsreport-scripts')())
    jsreport.use(require('../')())
    jsreport.use(require('@jsreport/jsreport-child-templates')())
    jsreport.use(require('@jsreport/jsreport-phantom-pdf')())
    jsreport.use(JsReport.tests.listeners())

    return jsreport.init()
  })

  afterEach(() => jsreport && jsreport.close())

  it('merge should embed static text', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '<div style"height: 2cm">header</div>',
      shortid: 'header',
      name: 'header',
      engine: 'none',
      chrome: {
        width: '8cm',
        height: '8cm'
      },
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: 'foo',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', templateShortid: 'header' }],
        chrome: {
          marginTop: '3cm'
        }
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages[0].text.includes('foo').should.be.ok()
    parsedPdf.pages[0].text.includes('header').should.be.ok()
  })

  it('merge with renderForEveryPage flag should provide dynamic pageNumber for every page', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '{{$pdf.pageNumber}}/{{$pdf.pages.length}}',
      shortid: 'header',
      name: 'header',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: '<h1 style=\'page-break-before: always\'>Hello</h1><h1 style=\'page-break-before: always\'>Hello</h1>',
        engine: 'none',
        name: 'content',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', renderForEveryPage: true, templateShortid: 'header' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages[0].text.includes('1/2').should.be.ok()
    parsedPdf.pages[1].text.includes('2/2').should.be.ok()
  })

  it('merge with renderForEveryPage should be able to use pdfCreatePagesGroup helper', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '{{#with (lookup $pdf.pages $pdf.pageIndex)}}{{group}}{{/with}}',
      shortid: 'header',
      name: 'header',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: '{{{pdfCreatePagesGroup "SomeText"}}}',
        engine: 'handlebars',
        name: 'content',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', renderForEveryPage: true, templateShortid: 'header' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages[0].text.includes('SomeText').should.be.true()
  })

  it('merge with renderForEveryPage should be able to use pdfCreatePagesGroup helper and mark the last group on the same page', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '{{#with (lookup $pdf.pages $pdf.pageIndex)}}{{group}}{{/with}}',
      shortid: 'header',
      name: 'header',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: '{{{pdfCreatePagesGroup "SomeText"}}}{{{pdfCreatePagesGroup "Different"}}}',
        engine: 'handlebars',
        name: 'content',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', renderForEveryPage: true, templateShortid: 'header' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages[0].text.includes('Different').should.be.true()
  })

  it('merge with renderForEveryPage should be able to group multiple pages using single pdfCreatePagesGroup helper', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '{{#with (lookup $pdf.pages $pdf.pageIndex)}}{{group}}{{/with}}',
      shortid: 'header',
      name: 'header',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: 'a{{{pdfCreatePagesGroup "1"}}}<div style=\'page-break-before: always\' />b',
        engine: 'handlebars',
        name: 'content',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', renderForEveryPage: true, templateShortid: 'header' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages[0].text.should.containEql('1')
    parsedPdf.pages[1].text.should.containEql('1b')
  })

  it('merge with renderForEveryPage should be able to use pdfCreatePagesGroup helper with hash params', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '{{#with (lookup $pdf.pages $pdf.pageIndex)}}{{group.foo}}{{/with}}',
      shortid: 'header',
      name: 'header',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: '{{{pdfCreatePagesGroup foo="1"}}}',
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', renderForEveryPage: true, templateShortid: 'header' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages[0].text.includes('1').should.be.ok()
  })

  it('merge with renderForEveryPage should be able to use pdfCreatePagesGroup helper and keep number type', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '{{#with (lookup $pdf.pages $pdf.pageIndex)}}{{test group}}{{/with}}',
      shortid: 'header',
      name: 'header',
      engine: 'handlebars',
      recipe: 'chrome-pdf',
      helpers: 'function test(v) { return typeof v }'
    })

    const result = await jsreport.render({
      template: {
        content: '{{{pdfCreatePagesGroup num}}}',
        engine: 'handlebars',
        name: 'content',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', renderForEveryPage: true, templateShortid: 'header' }]
      },
      data: {
        num: 1
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages[0].text.includes('number').should.be.ok()
  })

  it('merge with renderForEveryPage should be able to use pdfCreatePagesGroup helper with hash params with jsrender', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '{{:$pdf.pages[$pdf.pageIndex].group.foo}}',
      shortid: 'header',
      name: 'header',
      engine: 'jsrender',
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: '{{pdfCreatePagesGroup foo="1"/}}',
        engine: 'jsrender',
        name: 'content',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', renderForEveryPage: true, templateShortid: 'header' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages[0].text.includes('1').should.be.ok()
  })

  it('merge with renderForEveryPage should be able to use multiple pdfAddPageItem helper', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '{{#with (lookup $pdf.pages $pdf.pageIndex)}}{{items.[0]}}{{items.[1]}}{{/with}}',
      shortid: 'header',
      name: 'header',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: '{{{pdfAddPageItem "a"}}}{{{pdfAddPageItem "b"}}}',
        name: 'content',
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', renderForEveryPage: true, templateShortid: 'header' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages[0].text.includes('ab').should.be.true()
  })

  it('merge should work for multiple operations', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: 'header',
      name: 'header',
      shortid: 'header',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    await jsreport.documentStore.collection('templates').insert({
      content: 'footer',
      name: 'footer',
      shortid: 'footer',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: 'Foo',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', templateShortid: 'header' }, { type: 'merge', templateShortid: 'footer' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages[0].text.includes('header').should.be.ok()
    parsedPdf.pages[0].text.includes('footer').should.be.ok()
  })

  it('merge with renderForEveryPage disabled should add static content', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: 'header',
      name: 'header',
      shortid: 'header',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: 'Foo',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', renderForEveryPage: false, templateShortid: 'header' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages[0].text.includes('header').should.be.ok()
    parsedPdf.pages[0].text.includes('Foo').should.be.ok()
  })

  it('merge with inline template definition', async () => {
    const result = await jsreport.render({
      template: {
        content: 'foo',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', template: { content: 'header', engine: 'none', recipe: 'chrome-pdf' } }],
        chrome: {
          marginTop: '3cm'
        }
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages[0].text.includes('foo').should.be.ok()
    parsedPdf.pages[0].text.includes('header').should.be.ok()
  })

  it('merge shouldnt fail when merging into empty content', async () => {
    await jsreport.render({
      template: {
        content: 'content<div style="page-break-before: always;">content2',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [
          { type: 'prepend', template: { content: 'hello', engine: 'none', recipe: 'chrome-pdf' } },
          { type: 'merge', mergeWholeDocument: true, template: { content: '<style> html { overflow: hidden; } </style><div style="visibility: hidden;">&nbsp;</div><div style="page-break-before: always;"></div><div style="visibility: hidden;">&nbsp;</div>', engine: 'none', recipe: 'chrome-pdf' } }
        ]
      }
    })
  })

  it('append operation be able to append pages from another template', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: 'anotherpage',
      shortid: 'anotherPage',
      name: 'anotherPage',
      engine: 'handlebars',
      recipe: 'chrome-pdf',
      chrome: {
        landscape: true
      }
    })

    const result = await jsreport.render({
      template: {
        content: 'foo',
        engine: 'none',
        name: 'foo',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'append', templateShortid: 'anotherPage' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages[0].text.includes('foo').should.be.ok()
    parsedPdf.pages[1].text.includes('anotherpage').should.be.ok()
  })

  it('append and merge shouldnt remove the hidden marks from pdf', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '{{{pdfAddPageItem \'one\'}}} <a href=\'#main\' data-pdf-outline>link to main</a>',
      shortid: 'one',
      name: 'one',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    await jsreport.documentStore.collection('templates').insert({
      content: '{{$pdf.pages.[1].items.[0]}}',
      shortid: 'two',
      name: 'two',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: '<h1 id=\'main\'>main</h1>',
        engine: 'handlebars',
        name: 'main',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'append', templateShortid: 'one' }, { type: 'append', templateShortid: 'two' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages[2].text.includes('one').should.be.ok()
  })

  it('append with inline template definition', async () => {
    const result = await jsreport.render({
      template: {
        content: 'foo',
        engine: 'none',
        name: 'foo',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'append', template: { content: 'bar', engine: 'none', recipe: 'chrome-pdf' } }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages[0].text.includes('foo').should.be.ok()
    parsedPdf.pages[1].text.includes('bar').should.be.ok()
  })

  it('prepend operation be able to prepend pages from another template', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: 'anotherpage',
      shortid: 'anotherPage',
      name: 'anotherPage',
      engine: 'handlebars',
      recipe: 'chrome-pdf',
      chrome: {
        landscape: true
      }
    })

    const result = await jsreport.render({
      template: {
        content: 'foo',
        name: 'foo',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'prepend', templateShortid: 'anotherPage' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages[0].text.includes('anotherpage').should.be.ok()
    parsedPdf.pages[1].text.includes('foo').should.be.ok()
  })

  it('prepend with inline template definition', async () => {
    const result = await jsreport.render({
      template: {
        content: 'foo',
        name: 'foo',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'prepend', template: { content: 'bar', engine: 'none', recipe: 'chrome-pdf', chrome: { landscape: true } } }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages[0].text.includes('bar').should.be.ok()
    parsedPdf.pages[1].text.includes('foo').should.be.ok()
  })

  it('merge should work for very long reports', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '<div style"height: 2cm">header</div>',
      shortid: 'header',
      name: 'header',
      engine: 'none',
      recipe: 'chrome-pdf'
    })

    let content = 'very long contentvery long content</br>'
    for (let i = 0; i < 5000; i++) {
      content += 'very long contentvery long content</br>'
    }

    const result = await jsreport.render({
      template: {
        content: content,
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', templateShortid: 'header' }],
        chrome: {
          marginTop: '3cm'
        }
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages[0].text.includes('header').should.be.ok()
  })

  it('operations should be skipped when rendering template with non pdf', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '<div style"height: 2cm">header</div>',
      shortid: 'header',
      name: 'header',
      engine: 'none',
      chrome: {
        width: '8cm',
        height: '8cm'
      },
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: 'foo',
        name: 'content',
        engine: 'none',
        recipe: 'html',
        pdfOperations: [{ type: 'merge', templateShortid: 'header' }]
      }
    })

    result.content.toString().should.be.eql('foo')
  })

  it('should keep order of logs', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '<div style"height: 2cm">header</div>',
      shortid: 'header',
      name: 'header',
      engine: 'none',
      chrome: {
        width: '8cm',
        height: '8cm'
      },
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: 'foo',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', templateShortid: 'header' }],
        chrome: {
          marginTop: '3cm'
        }
      }
    })

    const logs = result.meta.logs.map(m => m.message)

    const startingLogIndex = logs.indexOf('pdf-utils is starting pdf processing')

    startingLogIndex.should.be.not.eql(-1)

    const nextLog = logs[startingLogIndex + 1]

    nextLog.should.be.containEql('detected 1 pdf operation(s) to process')
  })

  it('should be able to ignore disabled operations', async () => {
    const result = await jsreport.render({
      template: {
        content: `
          world
        `,
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        chrome: {
          marginTop: '2cm'
        },
        pdfOperations: [{
          type: 'merge',
          template: {
            content: `
              hello
            `,
            engine: 'none',
            recipe: 'chrome-pdf'
          },
          enabled: false
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages.should.have.length(1)
    parsedPdf.pages[0].text.should.be.eql('world')
  })

  it('merge with renderForEveryPage should be able to use groups on previously appended report', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '{{#with (lookup $pdf.pages $pdf.pageIndex)}}{{group}}{{/with}}',
      shortid: 'header',
      name: 'header',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    await jsreport.documentStore.collection('templates').insert({
      content: '{{{pdfCreatePagesGroup "Appended"}}}',
      shortid: 'append',
      name: 'append',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: '{{{pdfCreatePagesGroup "Main"}}}',
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'append', templateShortid: 'append' },
          { type: 'merge', renderForEveryPage: true, templateShortid: 'header' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages[0].text.includes('Main').should.be.ok()
    parsedPdf.pages[1].text.includes('Appended').should.be.ok()
  })

  it('should be able to prepend none jsreport produced pdf', async () => {
    jsreport.tests.afterRenderListeners.insert(0, 'test', (req, res) => {
      if (req.template.content === 'replace') {
        res.content = fs.readFileSync(path.join(__dirname, 'pdf-sample.pdf'))
      }
    })

    const result = await jsreport.render({
      template: {
        content: 'main',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{
          type: 'prepend',
          template: {
            content: 'replace',
            engine: 'none',
            recipe: 'chrome-pdf'
          }
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages.should.have.length(2)
  })

  it('should be able to add meta to pdf with empty font name', async () => {
    jsreport.afterRenderListeners.insert(0, 'test', (req, res) => {
      if (req.template.content === 'main') {
        res.content = fs.readFileSync(path.join(__dirname, 'empty-name.pdf'))
      }
    })

    const r = await jsreport.render({
      template: {
        content: 'main',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfMeta: {
          title: 'Hello'
        }
      }
    })
    fs.writeFileSync('out.pdf', r.content)
  })

  it('should be able to merge none jsreport produced pdf', async () => {
    jsreport.tests.afterRenderListeners.insert(0, 'test', (req, res) => {
      if (req.template.content === 'replace') {
        res.content = fs.readFileSync(path.join(__dirname, 'pdf-sample.pdf'))
      }
    })

    const result = await jsreport.render({
      template: {
        content: 'main',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{
          type: 'merge',
          template: {
            content: 'replace',
            engine: 'none',
            recipe: 'chrome-pdf'
          }
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages.should.have.length(1)
  })

  it('should be able to merge none jsreport produced pdf with multiple xobjs', async () => {
    jsreport.tests.afterRenderListeners.insert(0, 'test', (req, res) => {
      if (req.template.content === 'replace') {
        res.content = fs.readFileSync(path.join(__dirname, 'multiple-embedded-xobj.pdf'))
      }
    })

    const result = await jsreport.render({
      template: {
        content: 'main',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{
          type: 'merge',
          template: {
            content: 'replace',
            engine: 'none',
            recipe: 'chrome-pdf'
          }
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages.should.have.length(1)
  })

  it('merge should merge whole documents when mergeWholeDocument', async () => {
    const result = await jsreport.render({
      template: {
        content: 'main1<div style=\'page-break-before: always;\'></div>main2',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{
          type: 'merge',
          mergeWholeDocument: true,
          template: {
            content: `{{#each $pdf.pages}}
            <div>header</div>
            <div style='page-break-before: always;'></div>
          {{/each}}`,
            engine: 'handlebars',
            recipe: 'chrome-pdf'
          }
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages.should.have.length(2)
    parsedPdf.pages[0].text.includes('header').should.be.ok()
    parsedPdf.pages[1].text.includes('header').should.be.ok()
  })

  it('merge should remove the background layer also when margin is big', async () => {
    const result = await jsreport.render({
      template: {
        content: 'hello',
        engine: 'none',
        recipe: 'chrome-pdf',
        chrome: {
          marginTop: '8cm'
        },
        pdfOperations: [{
          type: 'merge',
          mergeWholeDocument: true,
          template: {
            content: '<h1 style=\'margin-top: 9cm\'>header</h1>>',
            engine: 'handlebars',
            recipe: 'chrome-pdf'
          }
        }]
      }
    })

    require('fs').writeFileSync('out.pdf', result.content)
    const doc = new External(result.content)

    const page = doc.catalog.properties.get('Pages').object.properties.get('Kids')[0].object
    const pageStream = page.properties.get('Contents').object.content
    const pageContent = zlib.unzipSync(pageStream.content).toString('latin1')
    pageContent.toString().should.not.containEql('\nf\n')
  })

  it('merge should should not fail when merged page has none fields annotations', async () => {
    await jsreport.render({
      template: {
        content: 'main1',
        chrome: {
          marginTop: '5cm'
        },
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{
          type: 'merge',
          mergeWholeDocument: true,
          template: {
            content: '<a href=\'#header1\'>link to header</a><br><h1 id=\'header1\'>header</h1>',
            engine: 'handlebars',
            recipe: 'chrome-pdf'
          }
        }]
      }
    })
  })

  // somehow it doesnt work in GA now
  it.skip('should be able to merge watermark into pdf with native header produced by phantomjs', async () => {
    const result = await jsreport.render({
      template: {
        content: 'main',
        name: 'content',
        engine: 'none',
        recipe: 'phantom-pdf',
        phantom: {
          header: 'header'
        },
        pdfOperations: [{
          type: 'merge',
          mergeWholeDocument: true,
          template: {
            content: 'watermark',
            engine: 'handlebars',
            recipe: 'phantom-pdf'
          }
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages.should.have.length(1)
    parsedPdf.pages[0].text.includes('header').should.be.ok()
    parsedPdf.pages[0].text.includes('watermark').should.be.ok()
  })

  it('should add helpers if recipe is not pdf but there are pdf utils operations set', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: `
        Child {{{pdfAddPageItem "child"}}}
      `,
      name: 'child',
      engine: 'handlebars',
      recipe: 'html'
    })

    const result = await jsreport.render({
      template: {
        content: `
          Parent {{{pdfAddPageItem "parent"}}}
          {#child child}
        `,
        name: 'foo',
        engine: 'handlebars',
        recipe: 'html',
        pdfOperations: [{ type: 'merge', templateShortid: 'header' }]
      }
    })

    const resContent = result.content.toString()

    resContent.should.containEql('Parent <span')
    resContent.should.containEql('Child <span')
  })

  it('should add helpers even if there are no pdf utils operations set', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: `
        Child
        {{{pdfAddPageItem "child"}}}
      `,
      name: 'child',
      engine: 'handlebars',
      recipe: 'html'
    })

    await jsreport.render({
      template: {
        content: `
          Parent
          {{{pdfAddPageItem "parent"}}}
          {#child child}
        `,
        name: 'content',
        engine: 'handlebars',
        recipe: 'html'
      }
    })
  })

  it('should work with merging word generated pdf and dont loose special characters', async () => {
    jsreport.tests.afterRenderListeners.add('test', (req, res) => {
      if (req.template.content === 'word') {
        res.content = fs.readFileSync(path.join(__dirname, 'word.pdf'))
      }
    })

    const result = await jsreport.render({
      template: {
        content: 'main',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{
          type: 'merge',
          template: {
            content: 'word',
            engine: 'none',
            recipe: 'html'
          }
        }]
      }
    })

    require('fs').writeFileSync('out.pdf', result.content)
    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages.should.have.length(1)
    parsedPdf.pages[0].text.should.containEql('dénommé')
  })

  it('should not break pdf href links when doing append', async () => {
    const result = await jsreport.render({
      template: {
        content: '<a href=\'#foo\'>foo</a><h1 id=\'foo\'>hello</h1>',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfOperations: [{
          type: 'append',
          template: {
            content: 'hello',
            engine: 'none',
            recipe: 'chrome-pdf'
          }
        }]
      }
    })

    result.content.toString().should.containEql('/Dests')
  })

  it('should not be affected by parent text-transform', async () => {
    const result = await jsreport.render({
      template: {
        content: `
          <div style="text-transform: uppercase">
            content
            {{{pdfAddPageItem text="testing text"}}}
          </div>
        `,
        name: 'content',
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        pdfOperations: [{
          type: 'merge',
          renderForEveryPage: true,
          template: {
            content: '{{#with (lookup $pdf.pages $pdf.pageIndex)}}{{items.[0].text}}{{/with}}',
            engine: 'handlebars',
            recipe: 'chrome-pdf'
          }
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages[0].text.should.containEql('testing text')
  })

  it('should be able to add outlines', async () => {
    const result = await jsreport.render({
      template: {
        content: `
          <a href='#parent' data-pdf-outline data-pdf-outline-text='parent'>
            parent
          </a><br>
          <a href='#nested' data-pdf-outline data-pdf-outline-parent='parent' data-pdf-outline-text='nested'>
            nested
          </a>
          <a href='#nested-nested' data-pdf-outline data-pdf-outline-parent='nested' data-pdf-outline-text='nested-nested'>
            nested nested
          </a>
          <a href='#nested-nested2' data-pdf-outline data-pdf-outline-parent='nested' data-pdf-outline-text='nested-nested2'>
          nested nested2
        </a>
          <h1 id='parent'>parent</h1>
          <h1 id='nested'>nested</h1>
          <h1 id='nested-nested'>nested-nested</h1>
          <h1 id='nested-nested2'>nested-nested2</h1>
        `,
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf'
      }
    })

    require('fs').writeFileSync('out.pdf', result.content)

    const doc = new External(result.content)
    doc.catalog.properties.get('Outlines').object.properties.get('First').object.properties.get('First').object.properties.get('Count').should.be.eql(-2)
  })

  it('should be able to add outlines through child template', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: '<a href="#child" id="child" data-pdf-outline data-pdf-outline-parent="root">Child</a>',
      name: 'child',
      engine: 'none',
      recipe: 'html'
    })
    const result = await jsreport.render({
      template: {
        content: '<a href="#root" id="root" data-pdf-outline>Root</a>{#child child}',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf'
      }
    })

    result.content.toString().should.containEql('/Outlines')
  })

  it('the hidden text for groups and items should be removed', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: 'header',
      shortid: 'header',
      name: 'header',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: '{{{pdfCreatePagesGroup "SomeText"}}}{{{pdfAddPageItem "v"}}}',
        engine: 'handlebars',
        name: 'content',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', renderForEveryPage: true, templateShortid: 'header' }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages[0].text.should.not.containEql('group')
    parsedPdf.pages[0].text.should.not.containEql('item')
  })

  it('the hidden text for groups and items should be removed when child render from script', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: 'header',
      shortid: 'header',
      name: 'header',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    await jsreport.documentStore.collection('templates').insert({
      content: '{{{pdfCreatePagesGroup "SomeText"}}}{{{pdfAddPageItem "v"}}}',
      engine: 'handlebars',
      name: 'main',
      recipe: 'chrome-pdf',
      pdfOperations: [{ type: 'merge', renderForEveryPage: true, templateShortid: 'header' }]
    })

    const result = await jsreport.render({
      template: {
        content: 'root',
        engine: 'handlebars',
        recipe: 'html',
        scripts: [{
          content: `
          async function afterRender(req, res) {
            const jsreport = require('jsreport-proxy')
            const report = await jsreport.render({
              template: { name: 'main' }
            })
            res.content = report.content
          }
        `
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages[0].text.should.not.containEql('group')
    parsedPdf.pages[0].text.should.not.containEql('item')
  })

  it('the hidden text for groups and items shouldnt be removed when req.options.pdfUtils.removeHiddenMarks', async () => {
    await jsreport.documentStore.collection('templates').insert({
      content: 'header',
      shortid: 'header',
      name: 'header',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    })

    const result = await jsreport.render({
      template: {
        content: '{{{pdfCreatePagesGroup "SomeText"}}}{{{pdfAddPageItem "v"}}}',
        engine: 'handlebars',
        name: 'content',
        recipe: 'chrome-pdf',
        pdfOperations: [{ type: 'merge', renderForEveryPage: true, templateShortid: 'header' }]
      },
      options: {
        pdfUtils: {
          removeHiddenMarks: false
        }
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages[0].text.should.containEql('group')
    parsedPdf.pages[0].text.should.containEql('item')
  })

  it('should expose jsreport-proxy pdfUtils (.parse)', async () => {
    const result = await jsreport.render({
      template: {
        content: 'empty',
        engine: 'none',
        recipe: 'html',
        scripts: [{
          content: `
            const jsreport = require('jsreport-proxy')

            async function afterRender (req, res) {
              const renderRes = await jsreport.render({
                template: {
                  content: 'foo',
                  engine: 'none',
                  recipe: 'chrome-pdf'
                }
              })

              const $pdf = await jsreport.pdfUtils.parse(renderRes.content, true)

              res.content = JSON.stringify($pdf)
            }
          `
        }]
      }
    })

    const $pdf = JSON.parse(result.content.toString())

    $pdf.pages.should.have.length(1)
    $pdf.pages[0].text.should.be.eql('foo')
  })

  it('should expose jsreport-proxy pdfUtils (.prepend)', async () => {
    const result = await jsreport.render({
      template: {
        content: 'First page',
        engine: 'none',
        recipe: 'chrome-pdf',
        scripts: [{
          content: `
            const jsreport = require('jsreport-proxy')

            async function afterRender (req, res) {
              const newRender = await jsreport.render({
                template: {
                  content: 'Cover page',
                  engine: 'none',
                  recipe: 'chrome-pdf'
                }
              })

              res.content = await jsreport.pdfUtils.prepend(res.content, newRender.content)
            }
          `
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages.should.have.length(2)
    parsedPdf.pages[0].text.includes('Cover').should.be.ok()
    parsedPdf.pages[1].text.includes('First').should.be.ok()
  })

  it('should expose jsreport-proxy pdfUtils (.append)', async () => {
    const result = await jsreport.render({
      template: {
        content: 'First page',
        engine: 'none',
        recipe: 'chrome-pdf',
        scripts: [{
          content: `
            const jsreport = require('jsreport-proxy')

            async function afterRender (req, res) {
              const newRender = await jsreport.render({
                template: {
                  content: 'Second page',
                  engine: 'none',
                  recipe: 'chrome-pdf'
                }
              })

              res.content = await jsreport.pdfUtils.append(res.content, newRender.content)
            }
          `
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages.should.have.length(2)
    parsedPdf.pages[0].text.includes('First').should.be.ok()
    parsedPdf.pages[1].text.includes('Second').should.be.ok()
  })

  it('should expose jsreport-proxy pdfUtils (.merge)', async () => {
    const result = await jsreport.render({
      template: {
        content: 'First page',
        engine: 'none',
        recipe: 'chrome-pdf',
        scripts: [{
          content: `
            const jsreport = require('jsreport-proxy')

            async function afterRender (req, res) {
              const newRender = await jsreport.render({
                template: {
                  content: '<div style="margin-top: 100px">Extra content</div>',
                  engine: 'none',
                  recipe: 'chrome-pdf'
                }
              })

              res.content = await jsreport.pdfUtils.merge(res.content, newRender.content)
            }
          `
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages.should.have.length(1)
    parsedPdf.pages[0].text.includes('First').should.be.ok()
    parsedPdf.pages[0].text.includes('Extra').should.be.ok()
  })

  it('should expose jsreport-proxy pdfUtils (.outlines)', async () => {
    const result = await jsreport.render({
      template: {
        content: `
          <div>
            TOC
            <ul>
              <li>
                <a href='#first-section'>
                  First
                </a>
              </li>
              <li>
                <a href='#second-section'>
                  Second
                </a>
              </li>
            </ul>
          </div>
          <div style='page-break-before: always;'></div>
          <div style="height: 200px">
            <h1 id="first-section">First section</h1>
            <span>content</span>
          </div>
          <div style="height: 200px">
            <h1 id="second-section">Second section</h1>
            <span>content</span>
          </div>
        `,
        engine: 'none',
        recipe: 'chrome-pdf',
        scripts: [{
          content: `
            const jsreport = require('jsreport-proxy')

            async function afterRender (req, res) {
              res.content = await jsreport.pdfUtils.outlines(res.content, [{
                id: 'first-section',
                title: 'First section',
                parent: null
              }, {
                id: 'second-section',
                title: 'Second section',
                parent: null
              }])
            }
          `
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    result.content.toString().should.containEql('/Outlines')
    parsedPdf.pages.should.have.length(2)
    parsedPdf.pages[1].text.includes('First').should.be.ok()
    parsedPdf.pages[1].text.includes('Second').should.be.ok()
  })

  it('should expose jsreport-proxy pdfUtils (.remove)', async () => {
    const result = await jsreport.render({
      template: {
        content: `<h1>Hello from Page 1</h1>
        <div style='page-break-before: always;'></div>
        <h1>Hello from Page 2</h1>`,
        engine: 'none',
        recipe: 'chrome-pdf',
        scripts: [{
          content: `
            const jsreport = require('jsreport-proxy')

            async function afterRender (req, res) {
              res.content = await jsreport.pdfUtils.removePages(res.content, 2)
            }
          `
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages.should.have.length(1)
    parsedPdf.pages[0].text.includes('Hello from Page 1').should.be.ok()
  })

  it('should use jsreport-proxy pdfUtils append and merge and still have hidden marks map on the same context', async () => {
    const result = await jsreport.render({
      template: {
        content: 'ignore me',
        engine: 'none',
        recipe: 'chrome-pdf',
        scripts: [{
          content: `
            const jsreport = require('jsreport-proxy')

            async function afterRender (req, res) {
              const appendRest = await jsreport.render({
                template: {
                  content: '{{{pdfAddPageItem "foo"}}}',
                  engine: 'handlebars',
                  recipe: 'chrome-pdf'
                }
              })

              const $pdf = await jsreport.pdfUtils.parse(appendRest.content)

              const mergeRes = await jsreport.render({
                template: {
                  content: '{{{$pdf.pages.[0].items.[0]}}}',
                  engine: 'handlebars',
                  recipe: 'chrome-pdf'
                },
                data: {
                  $pdf
                }
              })

              res.content = await jsreport.pdfUtils.merge(appendRest.content, mergeRes.content)
              res.content = await jsreport.pdfUtils.postprocess(res.content)
            }
          `
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages.should.have.length(1)
    parsedPdf.pages[0].text.includes('foo').should.be.ok()
    parsedPdf.pages[0].text.includes('@@@').should.not.be.ok()
  })

  it('should expose jsreport-proxy pdfUtils (.remove) and remove array of page numbers', async () => {
    const result = await jsreport.render({
      template: {
        content: `<h1>Hello from Page 1</h1>
        <div style='page-break-before: always;'></div>
        <h1>Hello from Page 2</h1>
        <div style='page-break-before: always;'></div>
        <h1>Hello from Page 3</h1>`,
        engine: 'none',
        recipe: 'chrome-pdf',
        scripts: [{
          content: `
            const jsreport = require('jsreport-proxy')

            async function afterRender (req, res) {
              res.content = await jsreport.pdfUtils.removePages(res.content, [1, 2])
            }
          `
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })

    parsedPdf.pages.should.have.length(1)
  })

  it('should expose jsreport-proxy pdfUtils and postprocess should be able to add password', async () => {
    const result = await jsreport.render({
      template: {
        content: 'foo',
        engine: 'none',
        recipe: 'chrome-pdf',
        scripts: [{
          content: `
            const jsreport = require('jsreport-proxy')

            async function afterRender (req, res) {
              res.content = await jsreport.pdfUtils.postprocess(res.content, {
                pdfPassword: {
                  password: 'password'
                }
              })
            }
          `
        }]
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true,
      password: 'password'
    })
    parsedPdf.pages[0].text.includes('foo').should.be.ok()
  })

  it('pdfPassword should encrypt output pdf', async () => {
    const result = await jsreport.render({
      template: {
        content: 'foo',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfPassword: {
          password: 'password',
          printing: 'lowResolution',
          modifying: true,
          copying: true,
          annotating: true,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: true
        }
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true,
      password: 'password'
    })
    parsedPdf.pages[0].text.includes('foo').should.be.ok()
  })

  it('pdfPassword should encrypt output pdf with proper password', async () => {
    const result = await jsreport.render({
      template: {
        content: 'foo',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfPassword: {
          password: 'password'
        }
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    should(parsedPdf.pages[0].text).not.be.ok()
  })

  it('pdfPassword should encrypt outlines', async () => {
    const result = await jsreport.render({
      template: {
        content: '<a href="#root" id="root" data-pdf-outline data-pdf-outline-title=\'MyTitlečřšš\'>link</a><h1>root</h1>',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfPassword: {
          password: 'a'
        },
        pdfMeta: {
          title: 'řčšěřčšř'
        }
      }
    })

    result.content.toString().should.not.containEql('/Title (MyTitle)')
  })

  it('pdfMeta should add information to output pdf', async () => {
    const result = await jsreport.render({
      template: {
        content: 'foo',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfMeta: {
          title: 'Foo-title',
          author: 'Foo-author',
          subject: 'Foo-subject',
          keywords: 'Foo-keywords',
          creator: 'Foo-creator',
          producer: 'Foo-producer',
          language: 'cz-CZ'
        }
      }
    })

    result.content.toString().should
      .containEql('Foo-title')
      .and.containEql('Foo-author')
      .and.containEql('Foo-subject')
      .and.containEql('Foo-keywords')
      .and.containEql('Foo-creator')
      .and.containEql('Foo-producer')
      .and.containEql('cz-CZ')
  })

  it('pdfA should convert to valid pdfA format', async () => {
    const result = await jsreport.render({
      template: {
        content: 'foo',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfA: {
          enabled: true
        }
      }
    })

    const doc = new External(result.content)
    doc.catalog.properties.get('Metadata').should.be.ok()
  })

  it('pdfAccessibility should keep StructTreeRoot during operations', async () => {
    const result = await jsreport.render({
      template: {
        content: 'foo',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfAccessibility: {
          enabled: true
        },
        pdfOperations: [{
          type: 'prepend',
          template: {
            content: 'hello',
            engine: 'none',
            recipe: 'chrome-pdf'
          }
        }]
      }
    })

    const doc = new External(result.content)
    doc.catalog.properties.get('StructTreeRoot').should.be.ok()
    doc.catalog.properties.get('MarkInfo').should.be.ok()
  })

  it('pdfMeta should work also when another pdf appended using script', async () => {
    const result = await jsreport.render({
      template: {
        content: 'foo',
        name: 'content',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfMeta: {
          title: 'Foo-title',
          author: 'Foo-author',
          subject: 'Foo-subject',
          keywords: 'Foo-keywords',
          creator: 'Foo-creator',
          producer: 'Foo-producer',
          language: 'cz-CZ'
        },
        scripts: [{
          content: `
            const jsreport = require('jsreport-proxy')
            async function afterRender(req, res) {
              const r = await jsreport.render({
                template: { content: 'page2', recipe: 'chrome-pdf', engine: 'none' }
              })
              res.content = await jsreport.pdfUtils.append(res.content, r.content)
            }
          `
        }]
      }
    })

    require('fs').writeFileSync('out.pdf', result.content)

    result.content.toString().should
      .containEql('Foo-title')
      .and.containEql('Foo-author')
      .and.containEql('Foo-subject')
      .and.containEql('Foo-keywords')
      .and.containEql('Foo-creator')
      .and.containEql('Foo-producer')
      .and.containEql('cz-CZ')
  })

  it('pdfSign should sign output pdf', async () => {
    const result = await jsreport.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfSign: {
          certificateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'certificate.p12')),
            password: 'node-signpdf'
          }
        }
      }
    })
    require('fs').writeFileSync('out.pdf', result.content)
    const { signature, signedData } = extractSignature(result.content)
    signature.should.be.of.type('string')
    signedData.should.be.instanceOf(Buffer)

    const doc = new External(result.content)

    const acroForm = doc.catalog.properties.get('AcroForm').object
    should(acroForm).not.be.null()
  })

  it('pdfSign should throw nice error when cert too long for placeholder', async () => {
    return jsreport.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfSign: {
          certificateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'longcert.p12')),
            password: 'password'
          }
        }
      }
    }).should.be.rejectedWith(/maxSignaturePlaceholderLength/)
  })

  it('pdfSign should work together with pdf password', async () => {
    const result = await jsreport.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfSign: {
          certificateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'certificate.p12')),
            password: 'node-signpdf'
          }
        },
        pdfPassword: {
          password: 'password'
        }
      }
    })

    require('fs').writeFileSync('out.pdf', result.content)

    const parsedPdf = await parsePdf(result.content, {
      includeText: true,
      password: 'password'
    })
    parsedPdf.pages[0].text.includes('Hello').should.be.ok()
  })

  it('pdfSign should be able to sign with reference to stored asset', async () => {
    await jsreport.documentStore.collection('assets').insert({
      name: 'certificate.p12',
      shortid: 'certificate',
      content: fs.readFileSync(path.join(__dirname, 'certificate.p12')),
      pdfSign: {
        passwordRaw: 'node-signpdf'
      }
    })

    const result = await jsreport.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfSign: {
          certificateAssetShortid: 'certificate'
        }
      }
    })

    const { signature, signedData } = extractSignature(result.content)
    signature.should.be.of.type('string')
    signedData.should.be.instanceOf(Buffer)
  })

  it('pdfSign should crypt asset password before insert', async () => {
    const res = await jsreport.documentStore.collection('assets').insert({
      name: 'a',
      content: 'hello',
      engine: 'none',
      recipe: 'html',
      pdfSign: {
        passwordRaw: 'foo'
      }
    })

    should(res.pdfSign.passwordRaw).be.null()
    res.pdfSign.passwordSecure.should.not.be.eql('foo')
    res.pdfSign.passwordFilled.should.be.true()
  })

  it('pdfSign should crypt asset password before update', async () => {
    await jsreport.documentStore.collection('assets').insert({
      name: 'a',
      engine: 'none',
      recipe: 'html'
    })

    await jsreport.documentStore.collection('assets').update({ name: 'a' }, {
      $set: {
        pdfSign: {
          passwordRaw: 'foo'
        }
      }
    })

    const entity = await jsreport.documentStore.collection('assets').findOne({
      name: 'a'
    })

    should(entity.pdfSign.passwordRaw).be.null()
    entity.pdfSign.passwordSecure.should.not.be.eql('foo')
    entity.pdfSign.passwordFilled.should.be.true()
  })

  it('pdfSign should use asset encoding when inline in the request', async () => {
    const result = await jsreport.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfSign: {
          certificateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'certificate.p12')).toString('base64'),
            encoding: 'base64',
            password: 'node-signpdf'
          }
        }
      }
    })

    const { signature, signedData } = extractSignature(result.content)
    signature.should.be.of.type('string')
    signedData.should.be.instanceOf(Buffer)
  })

  it('pdfSign shouldnt break form fields', async () => {
    const result = await jsreport.render({
      template: {
        content: `Hello<span>
        {{{pdfFormField name='test' value='value' type='text' width='100px' height='20px'}}}
        </span>`,
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        pdfSign: {
          certificateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'certificate.p12')),
            password: 'node-signpdf'
          }
        }
      }
    })

    fs.writeFileSync('out.pdf', result.content)
    const doc = new External(result.content)

    const acroForm = doc.catalog.properties.get('AcroForm').object
    should(acroForm).not.be.null()

    should(doc.catalog.properties.get('Pages').object.properties.get('Kids')[0].object.properties.get('Annots')[0].object).not.be.null()
    acroForm.properties.get('Fields').should.have.length(2)
    const field = acroForm.properties.get('Fields').find(f => f.object.properties.get('P') != null).object
    field.properties.get('T').toString().should.be.eql('(test)')

    const { signature, signedData } = extractSignature(result.content)
    signature.should.be.of.type('string')
    signedData.should.be.instanceOf(Buffer)
  })

  it('pdfSign shouldnt break anchors', async () => {
    const result = await jsreport.render({
      template: {
        content: '<a href=\'#1\'>link</a><div style=\'page-break-before: always;\'></div><h1 id=\'1\'>navigate here</h1>',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfSign: {
          certificateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'certificate.p12')),
            password: 'node-signpdf'
          }
        }
      }
    })

    fs.writeFileSync('out.pdf', result.content)
    const doc = new External(result.content)
    should(doc.catalog.properties.get('Dests')).be.ok()
    should(doc.catalog.properties.get('Dests').object.properties.get('1')).be.ok()
    doc.catalog.properties.get('Pages').object.properties.get('Kids')[0].object.properties.get('Annots').should.have.length(2)
  })

  it('pdfFormField with text type', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: `something before
        <span>
        {{{pdfFormField fontFamily='Helvetica' readOnly=true backgroundColor='#00FF00' fontSize='12px' color='#FF0000' name='test' value='value' defaultValue='defaultValue' textAlign='right' type='text' width='100px' height='20px'}}}
        </span>
        and after`
      }
    })

    require('fs').writeFileSync('out.pdf', result.content)
    const doc = new External(result.content)

    const acroForm = doc.catalog.properties.get('AcroForm').object
    should(acroForm).not.be.null()
    acroForm.properties.get('NeedAppearances').toString().should.be.eql('true')
    const fonts = acroForm.properties.get('DR').get('Font')

    should(doc.catalog.properties.get('Pages').object.properties.get('Kids')[0].object.properties.get('Annots')[0].object).not.be.null()

    const field = acroForm.properties.get('Fields')[0].object
    field.properties.get('T').toString().should.be.eql('(test)')
    field.properties.get('FT').toString().should.be.eql('/Tx')
    field.properties.get('DV').toString().should.be.eql('(defaultValue)')
    field.properties.get('V').toString().should.be.eql('(value)')
    field.properties.get('Q').should.be.eql(2)// textAlign
    field.properties.get('Ff').should.be.eql(1)// read only flag
    field.properties.get('DA').toString().should.be.eql('(/Helvetica 12 Tf 1 0 0 rg)')
    field.properties.get('MK').get('BG').toString().should.be.eql('[0 1 0]')

    const da = field.properties.get('DA').toString()
    const fontRef = da.substring(1, da.length - 1).split(' ')[0]
    should(fonts.get(fontRef)).not.be.null()
    fonts.get(fontRef).object.properties.get('BaseFont').toString().should.be.eql('/Helvetica')
  })

  it('pdfFormField with text type and format', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: '{{{pdfFormField formatType=\'number\' formatFractionalDigits=2 formatSepComma=true formatNegStyle=\'ParensRed\' formatCurrency=\'$\' formatCurrencyPrepend=true name=\'test\' type=\'text\' width=\'300px\' height=\'20px\'}}}'
      }
    })

    fs.writeFileSync('out.pdf', result.content)
    const doc = new External(result.content)

    const acroForm = doc.catalog.properties.get('AcroForm').object
    const field = acroForm.properties.get('Fields')[0].object
    field.properties.get('AA').get('K').get('S').toString().should.be.eql('/JavaScript')
    field.properties.get('AA').get('K').get('JS').toString().should.be.eql('(AFNumber_Keystroke\\(2,0,"ParensRed",null,"$",true\\);)')

    field.properties.get('AA').get('F').get('S').toString().should.be.eql('/JavaScript')
    field.properties.get('AA').get('F').get('JS').toString().should.be.eql('(AFNumber_Format\\(2,0,"ParensRed",null,"$",true\\);)')
  })

  it('pdfFormField with signature type', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: '{{{pdfFormField name=\'test\' type=\'signature\' width=\'100px\' height=\'50px\'}}}'
      }
    })

    const doc = new External(result.content)

    const acroForm = doc.catalog.properties.get('AcroForm').object
    const field = acroForm.properties.get('Fields')[0].object

    field.properties.get('FT').toString().should.be.eql('/Sig')
  })

  it('pdfFormField with combo type', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: '{{{pdfFormField name=\'test\' type=\'combo\' value=\'b\' items=\'a,b,c\' width=\'100px\' height=\'20px\'}}}'
      }
    })

    const doc = new External(result.content)

    const acroForm = doc.catalog.properties.get('AcroForm').object
    const field = acroForm.properties.get('Fields')[0].object

    field.properties.get('Ff').should.be.eql(131072)
    field.properties.get('FT').toString().should.be.eql('/Ch')
    field.properties.get('Opt').toString().should.be.eql('[(a) (b) (c)]')
  })

  it('pdfFormField with submit/reset button', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: `
          {{{pdfFormField name='btn1' type='button' color='#FF0000' exportFormat=true url='http://myendpoint.com' action='submit' label='submit' width='200px' height='50px'}}}
          {{{pdfFormField name='btn2' type='button' action='reset' label='reset' width='200px' height='50px'}}}
        `
      }
    })

    const doc = new External(result.content)
    fs.writeFileSync('out.pdf', result.content)

    const acroForm = doc.catalog.properties.get('AcroForm').object

    const submitField = acroForm.properties.get('Fields')[0].object
    submitField.properties.get('FT').toString().should.be.eql('/Btn')
    submitField.properties.get('A').get('S').toString().should.be.eql('/SubmitForm')
    submitField.properties.get('A').get('F').toString().should.be.eql('(http://myendpoint.com)')
    submitField.properties.get('A').get('Type').toString().should.be.eql('/Action')
    submitField.properties.get('A').get('Flags').should.be.eql(4)
    submitField.properties.get('Ff').should.be.eql(65536)

    const resetField = acroForm.properties.get('Fields')[1].object
    resetField.properties.get('FT').toString().should.be.eql('/Btn')
    resetField.properties.get('A').get('S').toString().should.be.eql('/ResetForm')
    resetField.properties.get('A').get('Type').toString().should.be.eql('/Action')
  })

  it('pdfFormField with checkbox type', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: `
        <div style='margin-left:300px;margin-top:200px'>
        {{{pdfFormField name='test' type='checkbox' visualType='square' width='150px' height='20px'}}}
        </span>
      `
      }
    })

    require('fs').writeFileSync('out.pdf', result.content)
    const doc = new External(result.content)
    const acroForm = doc.catalog.properties.get('AcroForm').object
    acroForm.properties.get('DR').get('Font').get('ZaDb').should.be.ok()

    const field = acroForm.properties.get('Fields')[0].object
    field.properties.get('AS').toString().should.be.eql('/Off')
    field.properties.get('DA').toString().should.be.eql('(/ZaDb 0 Tf 0 g)')

    const apDictionary = field.properties.get('AP')
    const yes = apDictionary.get('N').get('Yes').object

    const content = zlib.unzipSync(yes.content.content).toString('latin1')
    content.should.containEql('(n)')
    apDictionary.get('N').get('Off').object.should.be.ok()
  })

  it('pdfFormField with checkbox type with default value', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: `
        <div style='margin-left:300px;margin-top:200px'>
        {{{pdfFormField name='test' value=true defaultValue=true type='checkbox' visualType='square' width='150px' height='20px'}}}
        </span>
      `
      }
    })

    require('fs').writeFileSync('out.pdf', result.content)
    const doc = new External(result.content)
    const acroForm = doc.catalog.properties.get('AcroForm').object
    acroForm.properties.get('DR').get('Font').get('ZaDb').should.be.ok()

    const field = acroForm.properties.get('Fields')[0].object
    field.properties.get('V').toString().should.be.eql('/Yes')
    field.properties.get('AS').toString().should.be.eql('/Yes')
    field.properties.get('MK').get('CA').toString().should.be.eql('(n)')
  })

  it('pdfFormField with custom font shouldnt other loose text', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: `<html>
        <head>
            <style>
                @font-face {
                    font-family: 'Helvetica';
                    src: url(data:font/otf;base64,${fs.readFileSync(path.join(__dirname, 'Helvetica.otf')).toString('base64')});
                    format('woff');
                }
            </style>
        </head>

        <body>
            <div style='font-family:Helvetica'>
                {{{pdfFormField name='btn1' type='button' type='submit' width='200px' height='20px' label='foRm'}}}
            </div>
             <div>
                hello
            </div>
        </body>

        </html>`
      }
    })

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages[0].text.should.containEql('hello')
  })

  it('pdfFormField with national characters before', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: '<span>š{{{pdfFormField name=\'name\' type=\'text\' width=\'130px\' height=\'40px\'}}}</span>'
      }
    })

    const doc = new External(result.content)

    const acroForm = doc.catalog.properties.get('AcroForm').object
    should(acroForm).not.be.null()
  })

  it('pdfFormField multiple pages', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: `
        {{{pdfFormField name='a' type='text' width='200px' height='20px'}}}
        <div style='page-break-before: always;'></div>
        {{{pdfFormField name='b' type='text' width='200px' height='20px'}}}`
      }
    })

    const doc = new External(result.content)

    const acroForm = doc.catalog.properties.get('AcroForm').object
    acroForm.properties.get('Fields').should.have.length(2)
  })

  it('pdfFormField with append operation', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: "Page1 {{{pdfFormField name='a' fontFamily='Times-Roman' type='text' width='200px' height='20px'}}}",
        pdfOperations: [{
          type: 'append',
          template: {
            content: "Page2 {{{pdfFormField name='b' fontFamily='Courier' type='text' width='200px' height='20px'}}}",
            engine: 'handlebars',
            recipe: 'chrome-pdf'
          }
        }]
      }
    })

    const doc = new External(result.content)

    const acroForm = doc.catalog.properties.get('AcroForm').object
    acroForm.properties.get('Fields').should.have.length(2)
    const fonts = acroForm.properties.get('DR').get('Font')
    fonts.get('Times-Roman').should.be.ok()
    fonts.get('Courier').should.be.ok()
  })

  it('pdfFormField with append operation called from a script', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: 'Page1 {{{pdfFormField name=\'a\' type=\'text\' width=\'200px\' height=\'20px\'}}}',
        scripts: [{
          content: `
          async function afterRender(req, res) {
            const jsreport = require('jsreport-proxy')
            const r = await jsreport.render({
              template: {
                content: "{{{pdfFormField name='b' type='text' width='200px' height='20px'}}}",
                recipe: "chrome-pdf",
                engine: "handlebars"
              }
            })
            res.content = await jsreport.pdfUtils.append(res.content, r.content)
          }
          `
        }]
      }
    })

    require('fs').writeFileSync('out.pdf', result.content)
    const doc = new External(result.content)
    const acroForm = doc.catalog.properties.get('AcroForm').object
    acroForm.properties.get('Fields').should.have.length(2)
    acroForm.properties.get('NeedAppearances').toString().should.be.eql('true')
    const fonts = acroForm.properties.get('DR').get('Font')
    fonts.get('Helvetica').should.be.ok()
  })

  it('pdfFormField with merge operation called from a script', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: 'Page1{{{pdfFormField name=\'a\' type=\'text\' width=\'200px\' height=\'20px\'}}}<div style=\'page-break-before: always;\'></div>page2',
        scripts: [{
          content: `
          async function afterRender(req, res) {
            const jsreport = require('jsreport-proxy')
            const r = await jsreport.render({
              template: {
                content: "header1{{{pdfFormField name='myfield1' type='text' width='200px' height='20px'}}}<div style='page-break-before: always;'></div>header2{{{pdfFormField name='myfield2' type='text' width='200px' height='20px'}}}</div>",
                recipe: "chrome-pdf",
                engine: "handlebars"
              }
            })
            res.content = await jsreport.pdfUtils.merge(res.content, r.content)
          }
          `
        }]
      }
    })

    require('fs').writeFileSync('out.pdf', result.content)
    const doc = new External(result.content)
    const acroForm = doc.catalog.properties.get('AcroForm').object
    acroForm.properties.get('Fields').should.have.length(3)
    acroForm.properties.get('NeedAppearances').toString().should.be.eql('true')
    const fonts = acroForm.properties.get('DR').get('Font')
    fonts.get('Helvetica').should.be.ok()
    const pages = doc.catalog.properties.get('Pages').object
    const page1 = pages.properties.get('Kids')[0].object
    const page2 = pages.properties.get('Kids')[1].object
    page1.properties.get('Annots').should.have.length(2)
    page2.properties.get('Annots').should.have.length(1)
  })

  it('pdfFormField with remove operation called from a script', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: `Page1{{{pdfFormField name='a' type='text' width='200px' height='20px'}}}
        <div style='page-break-before: always;'></div>
        page2{{{pdfFormField name='b' type='text' width='200px' height='20px'}}}`,
        scripts: [{
          content: `
          async function afterRender(req, res) {
            const jsreport = require('jsreport-proxy')         
            res.content = await jsreport.pdfUtils.removePages(res.content, 2)
          }
          `
        }]
      }
    })

    require('fs').writeFileSync('out.pdf', result.content)
    const doc = new External(result.content)
    const acroForm = doc.catalog.properties.get('AcroForm').object
    acroForm.properties.get('Fields').should.have.length(1)
  })

  it('jsreport.pdfUtils.addAttachment adds attachments to the pdf', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: 'content',
        scripts: [{
          content: `
          async function afterRender(req, res) {
            const jsreport = require('jsreport-proxy')  
            res.content = await jsreport.pdfUtils.addAttachment(res.content, Buffer.from('first'), { name: 'first.txt', description: 'first description', modificationDate: new Date(), creationDate: new Date() })                   
            res.content = await jsreport.pdfUtils.addAttachment(res.content, Buffer.from('second'), { name: 'second.txt' })                   
          }
          `
        }]
      }
    })

    require('fs').writeFileSync('out.pdf', result.content)

    const doc = new External(result.content)
    const names = doc.catalog.properties.get('Names').object
    const embeddedFiles = names.properties.get('EmbeddedFiles')
    const namesArray = embeddedFiles.get('Names')
    namesArray[0].toString().should.be.eql('(first.txt)')
    namesArray[2].toString().should.be.eql('(second.txt)')

    const fileSpec = namesArray[1].object
    fileSpec.properties.get('F').toString().should.be.eql('(first.txt)')
    fileSpec.properties.get('Type').toString().should.be.eql('/Filespec')
    fileSpec.properties.get('Desc').toString().should.be.eql('(first description)')

    const ef = fileSpec.properties.get('EF')
    const f = ef.get('F').object
    f.properties.get('Filter').toString().should.be.eql('/FlateDecode')
    f.properties.get('Type').toString().should.be.eql('/EmbeddedFile')
    f.properties.get('Length').toString().should.be.eql('13')
    f.properties.get('Params').get('CreationDate').toString().should.startWith('(D:')
    f.properties.get('Params').get('ModDate').toString().should.startWith('(D:')
    f.properties.get('Params').get('Size').toString().should.be.eql(Buffer.from('first').length + '')
    f.properties.get('Params').get('CheckSum').toString().should.be.eql(`(${createHash('md5').update(Buffer.from('first')).digest('hex')})`)
    zlib.inflateSync(f.content.content).toString().should.be.eql('first')
  })

  it('jsreport.pdfUtils.addAttachment adds attachments to the pdf and dont get broken with append', async () => {
    const result = await jsreport.render({
      template: {
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        content: 'content',
        scripts: [{
          content: `
          async function afterRender(req, res) {
            const jsreport = require('jsreport-proxy')  
            res.content = await jsreport.pdfUtils.addAttachment(res.content, Buffer.from('first'), { name: 'first.txt', description: 'first description' })                               
          }
          `
        }],
        pdfOperations: [{
          type: 'append',
          template: {
            content: 'append',
            engine: 'handlebars',
            recipe: 'chrome-pdf'
          }
        }]
      }
    })

    require('fs').writeFileSync('out.pdf', result.content)

    const doc = new External(result.content)
    const names = doc.catalog.properties.get('Names').object
    const embeddedFiles = names.properties.get('EmbeddedFiles')
    const namesArray = embeddedFiles.get('Names')
    namesArray[0].toString().should.be.eql('(first.txt)')
  })

  it('append with cross page links and pdfLink and pdfTargets should work', async () => {
    const result = await jsreport.render({
      template: {
        content: '<a href=\'#1\' id=\'1\'>link</a>',
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        pdfOperations: [{
          type: 'append',
          template: {
            content: `
            <div style='margin-top: 200px'></div>
            {{{pdfDest "1"}}}<strong id='1'>target 1</strong>                        
            <div style='page-break-before: always;'></div>`,
            engine: 'handlebars',
            recipe: 'chrome-pdf'
          }
        }]
      }
    })
    const external = new External(result.content)
    const dest = external.catalog.properties.get('Dests').object.properties.get('/1')
    dest[0].object.should.be.eql(external.pages[1])
  })

  describe('processText with pdf from alpine', () => {
    it('should deal with double f ligature and remove hidden mark', async () => {
      const manipulator = PdfManipulator(fs.readFileSync(path.join(__dirname, 'alpine.pdf')), { removeHiddenMarks: true })
      await manipulator.postprocess({
        hiddenPageFields: {
          ff2181tsdwkqil98bfi73sks: Buffer.from(JSON.stringify({
            height: 20,
            width: 100,
            type: 'text',
            name: 'test'
          })).toString('base64')
        }
      })
      const buffer = await manipulator.toBuffer()
      const external = new External(buffer)
      const acroForm = external.catalog.properties.get('AcroForm').object
      should(acroForm).not.be.null()
      const field = acroForm.properties.get('Fields')[0].object
      field.properties.get('T').toString().should.be.eql('(test)')

      const parsedPdf = await parsePdf(buffer, {
        includeText: true
      })
      parsedPdf.pages[0].text.replace(/ /g, '').should.be.eql('čbeforeafterč')
      fs.writeFileSync('out.pdf', buffer)
    })
  })

  describe('pdf utils with maxSignaturePlaceholderLength', () => {
    let jsreport
    beforeEach(async () => {
      jsreport = await JsReport()
        .use(require('../')({
          maxSignaturePlaceholderLength: 16384
        }))
        .use(require('@jsreport/jsreport-chrome-pdf')())
        .init()
    })
    afterEach(() => jsreport && jsreport.close())

    it('pdfSign should sign output pdf', async () => {
      const result = await jsreport.render({
        template: {
          content: 'Hello',
          engine: 'none',
          recipe: 'chrome-pdf',
          pdfSign: {
            certificateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'longcert.p12')),
              password: 'password'
            }
          }
        }
      })
      require('fs').writeFileSync('out.pdf', result.content)
      const { signature, signedData } = extractSignature(result.content)
      signature.should.be.of.type('string')
      signedData.should.be.instanceOf(Buffer)

      const doc = new External(result.content)

      const acroForm = doc.catalog.properties.get('AcroForm').object
      should(acroForm).not.be.null()
    })
  })

  it('should not fail when main and appended template has printBackground=true', async () => {
    const req = {
      template: {
        content: ' ',
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        chrome: {
          printBackground: true
        },
        pdfOperations: [{
          type: 'append',
          template: {
            content: 'append',
            engine: 'handlebars',
            recipe: 'chrome-pdf',
            chrome: {
              printBackground: true
            }
          }
        }]
      }
    }

    const result = await jsreport.render(req)

    const parsedPdf = await parsePdf(result.content, {
      includeText: true
    })
    parsedPdf.pages.should.have.length(2)
  })
})
