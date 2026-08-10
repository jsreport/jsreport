const should = require('should')
const { DOMParser } = require('@xmldom/xmldom')
const { createContentCollectionManager } = require('../lib/contentManager')

describe('contentManager', () => {
  it('new elements for one part with one id attribute', () => {
    const doc = new DOMParser().parseFromString(`
      <tableParts><tablePart r:id="rId1"/><tablePart r:id="rId2"/><tablePart r:id="rId3"/></tableParts>
    `)

    const testCollection = createContentCollectionManager()

    testCollection.set('tableParts', {
      prepare: (ctx) => {
        const elements = Array.from(doc.documentElement.childNodes)

        ctx.data.lastElForPart = new Map()

        return {
          parts: {
            tablePart: {
              type: 'simpleCollection',
              idAttrs: ['r:id']
            }
          },
          elements
        }
      },
      onInit: (elements, ctx) => {
        const tablePartEls = elements.filter((el) => el.nodeName === 'tablePart')

        ctx.data.lastElForPart.set('tablePart', tablePartEls.at(-1))

        if (tablePartEls.length === 0) {
          ctx.addSlot('tablePart')
        }
      },
      onElementPart: (el, ctx) => {
        if (ctx.data.lastElForPart.get(el.nodeName) === el) {
          ctx.addSlot(el.nodeName)
        }
      }
    })

    testCollection.get('tableParts').parts.get('tablePart').set('rId4', {})

    const output = testCollection.get('tableParts').render()

    should(output).be.eql('<tablePart r:id="rId1"/><tablePart r:id="rId2"/><tablePart r:id="rId3"/><tablePart r:id="rId4"/>')
  })

  it('new elements for multiple parts with one id attribute', () => {
    const doc = new DOMParser().parseFromString(`
      <Types><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>
    `)

    const testCollection = createContentCollectionManager()

    testCollection.set('Types', {
      prepare: (ctx) => {
        const elements = Array.from(doc.documentElement.childNodes)

        ctx.data.lastElForPart = new Map()

        return {
          parts: {
            Default: {
              type: 'simpleCollection',
              idAttrs: ['Extension']
            },
            Override: {
              type: 'simpleCollection',
              idAttrs: ['PartName']
            }
          },
          elements
        }
      },
      onInit: (elements, ctx) => {
        const defaultEls = []
        const overrideEls = []

        for (const element of elements) {
          if (element.nodeName === 'Default') {
            defaultEls.push(element)
          } else if (element.nodeName === 'Override') {
            overrideEls.push(element)
          }
        }

        ctx.data.lastElForPart.set('Default', defaultEls.at(-1))
        ctx.data.lastElForPart.set('Override', overrideEls.at(-1))

        if (defaultEls.length > 0 && overrideEls.length > 0) {
          return
        }

        if (defaultEls.length === 0) {
          ctx.addSlot('Default')
        }

        if (overrideEls.length === 0) {
          ctx.addSlot('Override')
        }
      },
      onElementPart: (el, ctx) => {
        if (ctx.data.lastElForPart.get(el.nodeName) === el) {
          ctx.addSlot(el.nodeName)
        }
      }
    })

    testCollection.get('Types').parts.get('Default').set('test', { attributes: new Map([['ContentType', 'foo']]) })
    testCollection.get('Types').parts.get('Override').set('test', { attributes: new Map([['ContentType', 'foo']]) })

    const output = testCollection.get('Types').render()

    should(output).be.eql('<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="test" ContentType="foo"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="test" ContentType="foo"/>')
  })

  it('new elements for one part with multiple id attributes', () => {
    const doc = new DOMParser().parseFromString(`
      <cols><col min="1" max="1" width="40.796875" style="4" customWidth="1"/><col min="2" max="2" width="8.796875" style="4" customWidth="1"/><col min="3" max="3" width="13.796875" style="4" customWidth="1"/></cols>
    `)

    const testCollection = createContentCollectionManager()

    testCollection.set('cols', {
      prepare: (ctx) => {
        const elements = Array.from(doc.documentElement.childNodes)

        ctx.data.lastElForPart = new Map()

        return {
          parts: {
            col: {
              type: 'simpleCollection',
              idAttrs: ['min', 'max']
            }
          },
          elements
        }
      },
      onInit: (elements, ctx) => {
        const colEls = elements.filter((el) => el.nodeName === 'col')

        ctx.data.lastElForPart.set('col', colEls.at(-1))

        if (colEls.length === 0) {
          ctx.addSlot('col')
        }
      },
      onElementPart: (el, ctx) => {
        if (ctx.data.lastElForPart.get(el.nodeName) === el) {
          ctx.addSlot(el.nodeName)
        }
      }
    })

    testCollection.get('cols').parts.get('col').set(['4', '4'], { attributes: new Map([['foo', 'bar']]) })

    const output = testCollection.get('cols').render()

    should(output).be.eql('<col min="1" max="1" width="40.796875" style="4" customWidth="1"/><col min="2" max="2" width="8.796875" style="4" customWidth="1"/><col min="3" max="3" width="13.796875" style="4" customWidth="1"/><col min="4" max="4" foo="bar"/>')
  })

  it('replace existing elements for new instances for one part with multiple id attribute', () => {
    const doc = new DOMParser().parseFromString(`
      <calcChain><c r="F13" i="3" l="1"/><c r="F15" i="3" s="1"/></calcChain>
    `)

    const testCollection = createContentCollectionManager()

    testCollection.set('calcChain', {
      prepare: (ctx) => {
        const elements = Array.from(doc.documentElement.childNodes)

        return {
          parts: {
            c: {
              type: 'instanceCollection',
              idAttrs: ['r', 'i']
            }
          },
          elements
        }
      }
    })

    testCollection.get('calcChain').parts.get('c').addInstance(['F13', '3'], ['F13', '3'], {})
    testCollection.get('calcChain').parts.get('c').addInstance(['F13', '3'], ['F16', '3'], {})
    testCollection.get('calcChain').parts.get('c').addInstance(['F13', '3'], ['F17', '3'], {})

    const output = testCollection.get('calcChain').render()

    should(output).be.eql('<c r="F13" i="3" l="1"/><c r="F16" i="3" l="1"/><c r="F17" i="3" l="1"/>')
  })

  it('replace existing elements for new instance for part with child part and one id attribute', () => {
    const doc = new DOMParser().parseFromString(`
      <sheetData><row r="2" spans="3:5" x14ac:dyDescent="0.2"><c r="C2" s="1" t="s"><v>1</v></c><c r="D2" s="1" t="s"><v>3</v></c><c r="E2" s="1" t="s"><v>2</v></c></row><row r="3" spans="3:5" x14ac:dyDescent="0.2"><c r="C3" t="s"><v>0</v></c><c r="D3" t="s"><v>4</v></c><c r="E3" t="s"><v>5</v></c></row></sheetData>
    `)

    const testCollection = createContentCollectionManager()

    testCollection.set('sheetData', {
      prepare: () => {
        const elements = Array.from(doc.documentElement.childNodes)

        return {
          parts: {
            row: {
              type: 'instanceCollection',
              idAttrs: ['r'],
              parts: {
                c: {
                  type: 'instanceCollection',
                  idAttrs: ['r']
                }
              }
            }
          },
          elements
        }
      }
    })

    testCollection.get('sheetData').parts.get('row').addInstance(['2'], ['3'], {})
    testCollection.get('sheetData').parts.get('row').get('3').parts.get('c').addInstance(['C2'], ['C3'], {})
    testCollection.get('sheetData').parts.get('row').addInstance(['2'], ['4'], {})
    testCollection.get('sheetData').parts.get('row').get('4').parts.get('c').addInstance(['C2'], ['C4'], {})
    testCollection.get('sheetData').parts.get('row').get('4').parts.get('c').addInstance(['D2'], ['D4'], {})

    testCollection.get('sheetData').parts.get('row').addInstance(['3'], ['5'], {})

    const output = testCollection.get('sheetData').render()

    should(output).be.eql('<row r="3" spans="3:5" x14ac:dyDescent="0.2"><c r="C3" s="1" t="s"><v>1</v></c></row><row r="4" spans="3:5" x14ac:dyDescent="0.2"><c r="C4" s="1" t="s"><v>1</v></c><c r="D4" s="1" t="s"><v>3</v></c></row><row r="5" spans="3:5" x14ac:dyDescent="0.2"/>')
  })
})
