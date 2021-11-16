const jsreport = require('@jsreport/jsreport-core')
const path = require('path')
const xlsx = require('xlsx')
const should = require('should')
const fs = require('fs')
const _ = require('lodash')
const jsreportConfig = require('../jsreport.config')
const assets = require('@jsreport/jsreport-assets')
const handlebars = require('@jsreport/jsreport-handlebars')
const xlsxRecipe = require('../index')
const jsonToXml = require('../lib/jsonToXml')

describe('excel recipe', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()

    reporter.use(handlebars())
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

  // TODO
  it.skip('should return iframe in preview', async () => {
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

  // TODO: this is crashing on FATAL ERROR: v8::FromJust Maybe value is Nothing.
  // strange is that if you put to jsreport-office a console.log after axios post, it doesn't crash
  it.skip('should return iframe in preview with title including template name', async () => {
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
