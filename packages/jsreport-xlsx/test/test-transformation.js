const jsreport = require('@jsreport/jsreport-core')
const path = require('path')
const xlsx = require('xlsx')
const should = require('should')
const fs = require('fs')
const _ = require('lodash')
const jsreportConfig = require('../jsreport.config')
const components = require('@jsreport/jsreport-components')
const assets = require('@jsreport/jsreport-assets')
const handlebars = require('@jsreport/jsreport-handlebars')
const jsrender = require('@jsreport/jsreport-jsrender')
const xlsxRecipe = require('../index')
const jsonToXml = require('../lib/transformation/jsonToXml')
const { decompress } = require('@jsreport/office')

describe('xlsx transformation handlebars', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()

    reporter.use(handlebars())
    reporter.use(assets())
    reporter.use(xlsxRecipe())
    reporter.use(require('@jsreport/jsreport-data')())

    return reporter.init()
  })

  afterEach(() => {
    if (reporter) {
      return reporter.close()
    }
  })

  const test = (contentName, assertion) => {
    return () => reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: fs.readFileSync(path.join(__dirname, 'content', contentName), 'utf8')
      }
    }).then((res) => {
      assertion(xlsx.read(res.content))
    })
  }

  it('should be loaded as extension correctly', () => {
    const extensionExists = (extension) => extension.name === jsreportConfig.name

    const foundInAvailableExtensions = reporter.extensionsManager.availableExtensions.some(extensionExists)
    const foundInLoadedExtensions = reporter.extensionsManager.extensions.some(extensionExists)

    foundInAvailableExtensions.should.be.True()
    foundInLoadedExtensions.should.be.True()
  })

  it('should generate empty excel by default', test('empty.handlebars', (workbook) => {
    workbook.SheetNames.should.have.length(1)
    workbook.SheetNames[0].should.be.eql('Sheet1')
  }))

  it('xlsxMerge rename-sheet', test('rename-sheet.handlebars', (workbook) => {
    workbook.SheetNames.should.have.length(1)
    workbook.SheetNames[0].should.be.eql('XXX')
  }))

  it('xlsxMerge rename-sheet-complex-path', test('rename-sheet-complex-path.handlebars', (workbook) => {
    workbook.SheetNames.should.have.length(1)
    workbook.SheetNames[0].should.be.eql('XXX')
  }))

  it('xlsxAdd add-row', test('add-row.handlebars', (workbook) => {
    workbook.Sheets.Sheet1.A1.should.be.ok()
  }))

  it('xlsxAdd add-row-complex-path', test('add-row-complex-path.handlebars', (workbook) => {
    workbook.Sheets.Sheet1.A1.should.be.ok()
  }))

  it('xlsxRemove remove-row', test('remove-row.handlebars', (workbook) => {
    should(workbook.Sheets.Sheet1.A1).not.be.ok()
  }))

  it('xlsxRemove remove-row-complex-path', test('remove-row-complex-path.handlebars', (workbook) => {
    should(workbook.Sheets.Sheet1.A1).not.be.ok()
  }))

  it('xlsxReplace replace-row', test('replace-row.handlebars', (workbook) => {
    workbook.Sheets.Sheet1.A1.v.should.be.eql('xxx')
  }))

  it('xlsxReplace replace-row-complex-path', test('replace-row-complex-path.handlebars', (workbook) => {
    workbook.Sheets.Sheet1.A1.v.should.be.eql('xxx')
  }))

  it('xlsxReplace merge-cells', test('merge-cells.handlebars', (workbook) => {
    workbook.Sheets.Sheet1.A1.should.be.ok()
  }))

  it('xlsxAdd add many row', async () => {
    const res = await reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: fs.readFileSync(path.join(__dirname, 'content', 'add-many-rows.handlebars'), 'utf8')
      },
      data: {
        numbers: _.range(0, 1000)
      }
    })
    xlsx.read(res.content).Sheets.Sheet1.A1.should.be.ok()
    xlsx.read(res.content).Sheets.Sheet1.A1000.should.be.ok()

    xlsx.read(res.content).Sheets.Sheet1.B1.v.should.be.eql('0')
    xlsx.read(res.content).Sheets.Sheet1.B1000.v.should.be.eql('999')
  })

  it('xlsxReplace replace-sheet', test('replace-sheet.handlebars', (workbook) => {
    workbook.Sheets.Sheet1.A1.should.be.ok()
  }))

  it('add-sheet', test('add-sheet.handlebars', (workbook) => {
    workbook.Sheets.Test.A1.should.be.ok()
  }))

  it('should be able to use uploaded xlsx template', async () => {
    const templateContent = fs.readFileSync(path.join(__dirname, 'Book1.xlsx'))

    await reporter.documentStore.collection('assets').insert({
      content: templateContent,
      shortid: 'foo',
      name: 'foo'
    })

    const res = await reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        xlsx: {
          templateAssetShortid: 'foo'
        },
        content: '{{{xlsxPrint}}}'
      }
    })

    const workbook = xlsx.read(res.content)
    workbook.Sheets.Sheet1.A1.v.should.be.eql(1)
  })

  it('should be able to use xlsx template content from request', async () => {
    const templateContent = fs.readFileSync(path.join(__dirname, 'Book1.xlsx'))

    const res = await reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        xlsx: {
          templateAsset: {
            content: templateContent
          }
        },
        content: '{{{xlsxPrint}}}'
      }
    })

    const workbook = xlsx.read(res.content)
    workbook.Sheets.Sheet1.A1.v.should.be.eql(1)
  })

  it('should return iframe in preview', async () => {
    const res = await reporter.render({
      options: {
        preview: true
      },
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: '{{{xlsxPrint}}}'
      }
    })

    res.content.toString().should.containEql('iframe')
  })

  it('should return iframe in preview with title including template name', async () => {
    await reporter.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' })
    const res = await reporter.render({
      options: {
        preview: true
      },
      template: {
        name: 'foo',
        recipe: 'xlsx',
        engine: 'handlebars',
        content: '{{{xlsxPrint}}}'
      }
    })

    res.content.toString().should.containEql('<title>foo</title>')
  })

  it('should be able to use string helpers', () => {
    return reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        helpers: 'function foo() { return "<c><v>11</v></c>" }',
        content: fs.readFileSync(path.join(__dirname, 'content', 'add-row-block-helper.handlebars'), 'utf8')
      }
    }).then((res) => {
      xlsx.read(res.content).Sheets.Sheet1.A1.v.should.be.eql(11)
    })
  })

  it('should escape amps by default', () => {
    return reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: fs.readFileSync(path.join(__dirname, 'content', 'add-row-with-foo-value.handlebars'), 'utf8').replace('{{foo}}', '& {{foo}} &amp;amp;')
      },
      data: { foo: '&' }
    }).then((res) => {
      xlsx.read(res.content).Sheets.Sheet1.A1.v.should.be.eql('& & &')
    })
  })

  it('should provide proper lineNumber on error in helper', async () => {
    try {
      await reporter.render({
        template: {
          recipe: 'xlsx',
          engine: 'handlebars',
          helpers: 'function foo() { return zz }',
          content: fs.readFileSync(path.join(__dirname, 'content', 'add-row-block-helper.handlebars'), 'utf8')
        }
      })
    } catch (e) {
      e.lineNumber.should.be.eql(1)
    }
  })

  it('should be able to call xlsxAddImage with {#asset {{variable}} @encoding=base64}', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'test.png',
      content: Buffer.from('foo')
    })

    const res = await reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        helpers: 'function variable() { return "test.png" }',
        content: `{{#xlsxAddImage "test" "sheet1.xml" 0 0 1 1}}{#asset {{variable}} @encoding=base64}{{/xlsxAddImage}}
        {{{xlsxPrint}}}`
      }
    })

    const files = await decompress()(res.content)
    const image = files.find(f => f.path === 'xl/media/test.png')
    image.data.toString().should.be.eql('foo')
  })

  it('should not need xlsxPrint helper call at the end if there is no transformation code', test('empty-no-xlsxPrint.handlebars', (workbook) => {
    workbook.SheetNames.should.have.length(1)
    workbook.SheetNames[0].should.be.eql('Sheet1')
  }))

  it('should be able to execute async helper inside block helper', async () => {
    const stylesXML = `
      <x:styleSheet xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" xmlns:x15="http://schemas.microsoft.com/office/spreadsheetml/2010/11/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:x16r2="http://schemas.microsoft.com/office/spreadsheetml/2015/02/main" xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision" mc:Ignorable="x14ac x16r2 xr" xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <x:numFmts count="4">
          <x:numFmt numFmtId="164" formatCode="#,##0.00_);[Red](#,##0.00);&quot; - &quot;;" />
          <x:numFmt numFmtId="165" formatCode="&quot;$&quot;#,##0.00_);[Red](&quot;$&quot;#,##0.00);&quot;- &quot;;" />
          <x:numFmt numFmtId="166" formatCode="#,##0.00_);[Red](#,##0);&quot; - &quot;;" />
          <x:numFmt numFmtId="167" formatCode="&quot;$&quot;#,##0.00_);[Red](&quot;$&quot;#,##0);&quot;- &quot;;" />
        </x:numFmts>
      </x:styleSheet>
    `

    await reporter.documentStore.collection('assets').insert({
      name: 'styles.xml',
      content: Buffer.from(stylesXML)
    })

    const res = await reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        helpers: '',
        content: `{{#xlsxReplace "xl/styles.xml"}}{{asset "./styles.xml"}}{{/xlsxReplace}}
        {{{xlsxPrint}}}`
      }
    })

    const files = await decompress()(res.content)
    const styles = files.find(f => f.path === 'xl/styles.xml')

    styles.data.toString().should.containEql('x:numFmts count="4"')
  })

  it('should have consistent set in the xlsxTemplate variable after async call', async () => {
    await reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        helpers: `
        function checkRows(opts) {                 
          const rowsLength = opts.data.root.$xlsxTemplate['xl/worksheets/sheet1.xml'].worksheet.sheetData[0].row.length
          if (rowsLength !== 1) {
            throw new Error('should have 1 row, has ' + rowsLength)
          }
        }
        `,
        content: `
        {{#xlsxAdd "xl/worksheets/sheet1.xml" "worksheet.sheetData[0].row"}}
        <row>
          <c t="inlineStr"><is><t>1</t></is></c>  
        </row>
        {{/xlsxAdd}}
        {{checkRows}}
        {{{xlsxPrint}}}`
      }
    })
  })

  it('should work with none awaited options.fn calls', async () => {
    const res = await reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: `
        {{#xlsxAdd "xl/worksheets/sheet1.xml" "worksheet.sheetData[0].row"}}
        <row>
            {{#columns}}
            <c t="inlineStr"><is><t>{{this}}</t></is></c>
            {{/columns}}
        </row>
        {{/xlsxAdd}}    
        {{{xlsxPrint}}}`,
        helpers: `
      function columns(options) {
        let r = ''
        for (let i = 0; i < 3; i++) {
            // old no await
            r += options.fn(i)
        }      
        return r
      }`
      }
    })

    const workbook = xlsx.read(res.content)
    workbook.Sheets.Sheet1.A1.v.should.be.eql('0')
    workbook.Sheets.Sheet1.B1.v.should.be.eql('1')
    workbook.Sheets.Sheet1.C1.v.should.be.eql('2')
  })

  it('should be able to transform xlsx from previously generated xlsx from template', async () => {
    const sheetName = 'foo'

    const result = await reporter.render({
      template: {
        content: `
          {{#xlsxMerge "xl/workbook.xml" "workbook.sheets[0].sheet[0]"}}
          <sheet name="{{sheetName}}"/>
          {{/xlsxMerge}}
          {{{xlsxPrint}}}
        `,
        engine: 'handlebars',
        recipe: 'xlsx',
        xlsx: {
          templateAsset: {
            content: fs.readFileSync(
              path.join(__dirname, 'variable-replace.xlsx')
            )
          }
        }
      },
      data: {
        sheetName,
        name: 'John'
      }
    })

    const workbook = xlsx.read(result.content)
    const currentSheetName = workbook.SheetNames[0]

    currentSheetName.should.be.eql(sheetName)

    const sheet = workbook.Sheets[currentSheetName]
    should(sheet.A1.v).be.eql('Hello world John')
  })

  it('should replace extract asset old syntax before templating engines', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'sheet1.xml',
      content: `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac xr xr2 xr3" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision" xmlns:xr2="http://schemas.microsoft.com/office/spreadsheetml/2015/revision2" xmlns:xr3="http://schemas.microsoft.com/office/spreadsheetml/2016/revision3" xr:uid="{E3BB72C6-2E74-4885-B282-BAE0DA2077D8}">
      <dimension ref="A1"/>
      <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
      <sheetFormatPr defaultRowHeight="14.4" x14ac:dyDescent="0.3"/>
      <sheetData><row r="1" spans="1:1" x14ac:dyDescent="0.3"><c t="inlineStr"><is><t>Hello world</t></is></c></row></sheetData>
      <pageMargins left="0.7" right="0.7" top="0.78740157499999996" bottom="0.78740157499999996" header="0.3" footer="0.3"/>
      </worksheet>
      `
    })
    const res = await reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: `
        {{#xlsxReplace "xl/worksheets/sheet1.xml"}}
          {#asset sheet1.xml}}
        {{/xlsxReplace}}
        {{{xlsxPrint}}}
        `
      }
    })
    xlsx.read(res.content).Sheets.Sheet1.A1.v.should.be.eql('Hello world')
  })
})

describe('xlsx transformation jsrender', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()

    reporter.use(jsrender())
    reporter.use(assets())
    reporter.use(xlsxRecipe())

    return reporter.init()
  })

  afterEach(() => {
    if (reporter) {
      return reporter.close()
    }
  })

  const test = (contentName, assertion) => {
    return () => reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'jsrender',
        content: fs.readFileSync(path.join(__dirname, 'content', contentName), 'utf8')
      }
    }).then((res) => {
      assertion(xlsx.read(res.content))
    })
  }

  it('xlsxAdd add-row', test('add-row.jsrender', (workbook) => {
    workbook.Sheets.Sheet1.A1.should.be.ok()
  }))
})

describe('excel recipe with previewInExcelOnline false', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      xlsx: {
        previewInExcelOnline: false
      }
    })

    reporter.use(handlebars())
    reporter.use(xlsxRecipe())

    return reporter.init()
  })

  afterEach(() => {
    if (reporter) {
      return reporter.close()
    }
  })

  it('should return excel when preview true', () => {
    return reporter.render({
      options: {
        preview: true
      },
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: '{{{xlsxPrint}}}'
      }
    }).then((res) => {
      res.content.toString().should.not.containEql('iframe')
    })
  })
})

describe('excel recipe with office.preview.enabled=false and extensions.xlsx.preview.enabled=true', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      office: {
        preview: {
          enabled: false
        }
      },
      extensions: {
        xlsx: {
          preview: {
            enabled: true
          }
        }
      }
    })

    reporter.use(handlebars())
    reporter.use(xlsxRecipe())

    return reporter.init()
  })

  afterEach(() => {
    if (reporter) {
      return reporter.close()
    }
  })

  it('should return html when preview true', () => {
    return reporter.render({
      options: {
        preview: true
      },
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: '{{{xlsxPrint}}}'
      }
    }).then((res) => {
      res.content.toString().should.containEql('iframe')
    })
  })
})

describe('excel recipe with office.preview.enabled=false and extensions.xlsx.previewInExcelOnline=true', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      office: {
        preview: {
          enabled: false
        }
      },
      extensions: {
        xlsx: {
          previewInExcelOnline: true
        }
      }
    })

    reporter.use(handlebars())
    reporter.use(xlsxRecipe())

    return reporter.init()
  })

  afterEach(() => {
    if (reporter) {
      return reporter.close()
    }
  })

  it('should return html when preview true', () => {
    return reporter.render({
      options: {
        preview: true
      },
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: '{{{xlsxPrint}}}'
      }
    }).then((res) => {
      res.content.toString().should.containEql('iframe')
    })
  })
})

describe('excel recipe with office.preview.enabled=false and xlsx.previewInExcelOnline=true', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      office: {
        preview: {
          enabled: false
        }
      },
      xlsx: {
        previewInExcelOnline: true
      }
    })

    reporter.use(handlebars())
    reporter.use(xlsxRecipe())

    return reporter.init()
  })

  afterEach(() => {
    if (reporter) {
      return reporter.close()
    }
  })

  it('should return html when preview true', () => {
    return reporter.render({
      options: {
        preview: true
      },
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: '{{{xlsxPrint}}}'
      }
    }).then((res) => {
      res.content.toString().should.containEql('iframe')
    })
  })
})

describe('excel recipe with disabled add parsing', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      rootDirectory: path.join(__dirname, '../'),
      office: { },
      extensions: {
        xlsx: {
          numberOfParsedAddIterations: 0,
          addBufferSize: 200
        }
      }
    })
    reporter.use(xlsxRecipe())
    reporter.use(handlebars())

    return reporter.init()
  })

  afterEach(() => {
    if (reporter) {
      return reporter.close()
    }
  })

  it('should be add row', () => {
    return reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: fs.readFileSync(path.join(__dirname, 'content', 'add-many-rows.handlebars'), 'utf8')
      },
      data: {
        numbers: _.range(0, 1000)
      }
    }).then((res) => {
      xlsx.read(res.content).Sheets.Sheet1.A1.should.be.ok()
      xlsx.read(res.content).Sheets.Sheet1.A1000.should.be.ok()
    })
  })

  it('should escape amps', () => {
    return reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: fs.readFileSync(path.join(__dirname, 'content', 'add-row-with-foo-value.handlebars'), 'utf8').replace('{{foo}}', '& {{foo}} &amp;')
      },
      data: { foo: '&' }
    }).then((res) => {
      xlsx.read(res.content).Sheets.Sheet1.A1.v.should.be.eql('& & &')
    })
  })

  it('should escape \'', () => {
    return reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: fs.readFileSync(path.join(__dirname, 'content', 'add-row-with-foo-value.handlebars'), 'utf8')
      },
      data: { foo: 'JOHN\'S PET PRODUCTS' }
    }).then((res) => {
      xlsx.read(res.content).Sheets.Sheet1.A1.v.should.be.eql('JOHN\'S PET PRODUCTS')
    })
  })

  it('should escape entities', () => {
    return reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: fs.readFileSync(path.join(__dirname, 'content', 'add-row-with-foo-value.handlebars'), 'utf8').replace('{{foo}}', '& < > " ' + "'" + ' /')
      },
      data: { }
    }).then((res) => {
      xlsx.read(res.content).Sheets.Sheet1.A1.v.should.be.eql('& < > " ' + "'" + ' /')
    })
  })

  it('should resolve escaped =', () => {
    return reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: fs.readFileSync(path.join(__dirname, 'content', 'add-row-with-foo-value.handlebars'), 'utf8')
      },
      data: { foo: '<=' }
    }).then((res) => {
      xlsx.read(res.content).Sheets.Sheet1.A1.v.should.be.eql('<=')
    })
  })
})

// https://github.com/jsreport/jsreport/issues/312
describe('excel recipe should not be broken by assets running after', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()

    reporter.use(handlebars())
    reporter.use(xlsxRecipe())
    reporter.use(assets())

    return reporter.init()
  })

  afterEach(() => {
    if (reporter) {
      return reporter.close()
    }
  })

  it('should be able to use native helpers', () => {
    return reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: fs.readFileSync(path.join(__dirname, 'content', 'empty.handlebars'), 'utf8')
      }
    }).then((res) => {
      xlsx.read(res.content).SheetNames[0].should.be.eql('Sheet1')
    })
  })
})

// https://github.com/jsreport/jsreport/issues/908
describe('excel recipe should not be broken by components usage', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()

    reporter.use(handlebars())
    reporter.use(xlsxRecipe())
    reporter.use(components())

    return reporter.init()
  })

  afterEach(() => {
    if (reporter) {
      return reporter.close()
    }
  })

  it('should work with transformation code from component', async () => {
    await reporter.documentStore.collection('components').insert({
      name: 'c1',
      content: `
        {{#xlsxMerge "xl/workbook.xml" "workbook.sheets[0].sheet[0]"}}
        <sheet name="{{sheetName}}"/>
        {{/xlsxMerge}}
      `,
      engine: 'handlebars'
    })

    const sheetName = 'foo'

    const res = await reporter.render({
      template: {
        recipe: 'xlsx',
        engine: 'handlebars',
        content: `
          {{component "./c1"}}
          {{{xlsxPrint}}}
        `
      },
      data: {
        sheetName
      }
    })

    xlsx.read(res.content).SheetNames[0].should.be.eql(sheetName)
  })
})

describe('jsonToXml', () => {
  describe('escaping node values', () => {
    it('should escape entities', () => {
      jsonToXml({ a: '<>&' }).xml.should.containEql('&lt;&gt;&amp;')
    })

    it('should not escape quotes', () => {
      jsonToXml({ a: '\'"' }).xml.should.containEql('\'"')
    })

    it('should not escape amp which is already escaping another char', () => {
      jsonToXml({ a: '&amp;&#x27;&quot;&#x27;&#x3D;;' }).xml.should.containEql('&amp;&#x27;&quot;&#x27;&#x3D;;')
    })
  })

  describe('escaping attributes', () => {
    it('should escape entities', () => {
      jsonToXml({ a: { $: { b: '<>&"\'' } } }).xml.should.containEql('&lt;&gt;&amp;&quot;&#x27;')
    })

    it('should not escape amp which is already escaping another char', () => {
      jsonToXml({ a: { $: { b: '&amp;&#x27;&quot;&#x27;&#x3D;;' } } }).xml.should.containEql('&amp;&#x27;&quot;&#x27;&#x3D;;')
    })
  })
})
