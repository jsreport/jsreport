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
      prepare: () => {
        const elements = Array.from(doc.documentElement.childNodes)

        return {
          parts: {
            tablePart: {
              type: 'simpleCollection',
              idAttrs: ['r:id']
            }
          },
          elements
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
      prepare: () => {
        const elements = Array.from(doc.documentElement.childNodes)

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
      prepare: () => {
        const elements = Array.from(doc.documentElement.childNodes)

        return {
          parts: {
            col: {
              type: 'simpleCollection',
              idAttrs: ['min', 'max']
            }
          },
          elements
        }
      }
    })

    testCollection.get('cols').parts.get('col').set(['4', '4'], { attributes: new Map([['foo', 'bar']]) })

    const output = testCollection.get('cols').render()

    should(output).be.eql('<col min="1" max="1" width="40.796875" style="4" customWidth="1"/><col min="2" max="2" width="8.796875" style="4" customWidth="1"/><col min="3" max="3" width="13.796875" style="4" customWidth="1"/><col min="4" max="4" foo="bar"/>')
  })

  it('new elements for part with no elements are rendered at the start', () => {
    const doc = new DOMParser().parseFromString(`
      <Types><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>
    `)

    const testCollection = createContentCollectionManager()

    testCollection.set('Types', {
      prepare: () => {
        const elements = Array.from(doc.documentElement.childNodes)

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
      }
    })

    testCollection.get('Types').parts.get('Default').set('test', { attributes: new Map([['ContentType', 'foo']]) })
    testCollection.get('Types').parts.get('Override').set('test', { attributes: new Map([['ContentType', 'foo']]) })

    const output = testCollection.get('Types').render()

    should(output).be.eql('<Default Extension="test" ContentType="foo"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="test" ContentType="foo"/>')
  })

  it('new elements for nested part are rendered after the last element of the part', () => {
    const doc = new DOMParser().parseFromString(`
      <rows><row r="1"><tag id="a"/><tag id="b"/><other/></row><row r="2"><tag id="a"/></row></rows>
    `)

    const testCollection = createContentCollectionManager()

    testCollection.set('rows', {
      prepare: () => {
        const elements = Array.from(doc.documentElement.childNodes)

        return {
          parts: {
            row: {
              type: 'instanceCollection',
              idAttrs: ['r'],
              parts: {
                tag: {
                  type: 'simpleCollection',
                  idAttrs: ['id']
                }
              }
            }
          },
          elements
        }
      }
    })

    const rowPart = testCollection.get('rows').parts.get('row')

    rowPart.addInstance(['1'], ['1'], {})
    rowPart.get('1').parts.get('tag').set('c', {})
    rowPart.addInstance(['2'], ['2'], {})
    rowPart.get('2').parts.get('tag').set('d', {})

    const output = testCollection.get('rows').render()

    should(output).be.eql('<row r="1"><tag id="a"/><tag id="b"/><tag id="c"/><other/></row><row r="2"><tag id="a"/><tag id="d"/></row>')
  })

  it('new elements for nested part with no elements are rendered at the start', () => {
    const doc = new DOMParser().parseFromString(`
      <rows><row r="1"><other/></row><row r="2"/></rows>
    `)

    const testCollection = createContentCollectionManager()

    testCollection.set('rows', {
      prepare: () => {
        const elements = Array.from(doc.documentElement.childNodes)

        return {
          parts: {
            row: {
              type: 'instanceCollection',
              idAttrs: ['r'],
              parts: {
                tag: {
                  type: 'simpleCollection',
                  idAttrs: ['id']
                }
              }
            }
          },
          elements
        }
      }
    })

    const rowPart = testCollection.get('rows').parts.get('row')

    rowPart.addInstance(['1'], ['1'], {})
    rowPart.get('1').parts.get('tag').set('a', {})
    rowPart.addInstance(['2'], ['2'], {})
    rowPart.get('2').parts.get('tag').set('b', {})
    rowPart.addInstance(['2'], ['3'], {})

    const output = testCollection.get('rows').render()

    should(output).be.eql('<row r="1"><tag id="a"/><other/></row><row r="2"><tag id="b"/></row><row r="3"/>')
  })

  it('replace existing elements for new instances for one part with multiple id attribute', () => {
    const doc = new DOMParser().parseFromString(`
      <calcChain><c r="F13" i="3" l="1"/><c r="F15" i="3" s="1"/></calcChain>
    `)

    const testCollection = createContentCollectionManager()

    testCollection.set('calcChain', {
      prepare: () => {
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

  it('render instances in the order they were added when part has sequence placement', () => {
    const doc = new DOMParser().parseFromString(`
      <sheetData><row r="2" s="1"><c r="C2" s="1" t="s"><v>1</v></c><c r="D2" s="1" t="s"><v>3</v></c></row><row r="3" s="2"><c r="C3" t="s"><v>0</v></c></row></sheetData>
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
              placement: 'sequence',
              parts: {
                c: {
                  type: 'instanceCollection',
                  idAttrs: ['r'],
                  placement: 'sequence'
                }
              }
            }
          },
          elements
        }
      }
    })

    const rowPart = testCollection.get('sheetData').parts.get('row')

    // simulates a block loop over base rows 2, 3 (producing rows 2, 3, 4, 5) and
    // a vertical loop in base cell C2 (producing cells C2, D2 and moving base cell D2 to E2)
    rowPart.addInstance(['2'], ['2'], {})
    rowPart.get('2').parts.get('c').addInstance(['C2'], ['C2'], {})
    rowPart.get('2').parts.get('c').addInstance(['C2'], ['D2'], {})
    rowPart.get('2').parts.get('c').addInstance(['D2'], ['E2'], {})
    rowPart.addInstance(['3'], ['3'], {})
    rowPart.get('3').parts.get('c').addInstance(['C3'], ['C3'], {})
    rowPart.addInstance(['2'], ['4'], {})
    rowPart.get('4').parts.get('c').addInstance(['C2'], ['C4'], {})
    rowPart.addInstance(['3'], ['5'], {})
    rowPart.get('5').parts.get('c').addInstance(['C3'], ['C5'], {})

    const output = testCollection.get('sheetData').render()

    should(output).be.eql('<row r="2" s="1"><c r="C2" s="1" t="s"><v>1</v></c><c r="D2" s="1" t="s"><v>1</v></c><c r="E2" s="1" t="s"><v>3</v></c></row><row r="3" s="2"><c r="C3" t="s"><v>0</v></c></row><row r="4" s="1"><c r="C4" s="1" t="s"><v>1</v></c></row><row r="5" s="2"><c r="C5" t="s"><v>0</v></c></row>')
  })

  it('render instances in the order they were added and keeping existing base elements in same order when part has sequence placement', () => {
    const doc = new DOMParser().parseFromString(`
      <sheetData><row r="2" s="1"><c r="C2" s="1" t="s"><v>1</v></c><c r="D2" s="1" t="s"><v>3</v></c></row><a>demo</a><row r="3" s="2"><c r="C3" t="s"><v>0</v></c></row></sheetData>
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
              placement: 'sequence',
              parts: {
                c: {
                  type: 'instanceCollection',
                  idAttrs: ['r'],
                  placement: 'sequence'
                }
              }
            }
          },
          elements
        }
      }
    })

    const rowPart = testCollection.get('sheetData').parts.get('row')

    // simulates a block loop over base rows 2, 3 (producing rows 2, 3, 4, 5) and
    // a vertical loop in base cell C2 (producing cells C2, D2 and moving base cell D2 to E2)
    rowPart.addInstance(['2'], ['2'], {})
    rowPart.get('2').parts.get('c').addInstance(['C2'], ['C2'], {})
    rowPart.get('2').parts.get('c').addInstance(['C2'], ['D2'], {})
    rowPart.get('2').parts.get('c').addInstance(['D2'], ['E2'], {})
    rowPart.addInstance(['3'], ['3'], {})
    rowPart.get('3').parts.get('c').addInstance(['C3'], ['C3'], {})
    rowPart.addInstance(['2'], ['4'], {})
    rowPart.get('4').parts.get('c').addInstance(['C2'], ['C4'], {})
    rowPart.addInstance(['3'], ['5'], {})
    rowPart.get('5').parts.get('c').addInstance(['C3'], ['C5'], {})

    const output = testCollection.get('sheetData').render()

    should(output).be.eql('<row r="2" s="1"><c r="C2" s="1" t="s"><v>1</v></c><c r="D2" s="1" t="s"><v>1</v></c><c r="E2" s="1" t="s"><v>3</v></c></row><a>demo</a><row r="3" s="2"><c r="C3" t="s"><v>0</v></c></row><row r="4" s="1"><c r="C4" s="1" t="s"><v>1</v></c></row><row r="5" s="2"><c r="C5" t="s"><v>0</v></c></row>')
  })

  it('render instances in the order they were added and keeping existing base elements in same order when part has sequence placement and rows, cells are moved', () => {
    const doc = new DOMParser().parseFromString(`
      <sheetData><row r="2" s="1"><c r="C2" s="1" t="s"><v>1</v></c><c r="D2" s="1" t="s"><v>3</v></c></row><a>demo</a><row r="3" s="2"><c r="C3" t="s"><v>0</v></c></row></sheetData>
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
              placement: 'sequence',
              parts: {
                c: {
                  type: 'instanceCollection',
                  idAttrs: ['r'],
                  placement: 'sequence'
                }
              }
            }
          },
          elements
        }
      }
    })

    const rowPart = testCollection.get('sheetData').parts.get('row')

    // simulates one row inserted before the base rows (so all rows are moved by one),
    // and a block loop over base rows 2, 3 (producing rows 3, 4, 5, 6).
    // a vertical loop in base cell C2 produces cells C3, D3 and moves base cell D2 to E3,
    // and base cell C3 is moved one column (to D4)
    rowPart.addInstance(['2'], ['3'], {})
    rowPart.get('3').parts.get('c').addInstance(['C2'], ['C3'], {})
    rowPart.get('3').parts.get('c').addInstance(['C2'], ['D3'], {})
    rowPart.get('3').parts.get('c').addInstance(['D2'], ['E3'], {})
    rowPart.addInstance(['3'], ['4'], {})
    rowPart.get('4').parts.get('c').addInstance(['C3'], ['D4'], {})
    rowPart.addInstance(['2'], ['5'], {})
    rowPart.get('5').parts.get('c').addInstance(['C2'], ['C5'], {})
    rowPart.addInstance(['3'], ['6'], {})
    rowPart.get('6').parts.get('c').addInstance(['C3'], ['C6'], {})

    // the moved rows and cells keep the reference to the base they were produced from
    should(rowPart.get('3').baseId).be.eql('2')
    should(rowPart.get('4').baseId).be.eql('3')
    should(rowPart.get('3').parts.get('c').get('E3').baseId).be.eql('D2')
    should(rowPart.get('4').parts.get('c').get('D4').baseId).be.eql('C3')
    should(rowPart.get('4').parts.get('c').has('C4')).be.False()

    const output = testCollection.get('sheetData').render()

    should(output).be.eql(
      '<row r="3" s="1"><c r="C3" s="1" t="s"><v>1</v></c><c r="D3" s="1" t="s"><v>1</v></c><c r="E3" s="1" t="s"><v>3</v></c></row>' +
      '<a>demo</a>' +
      '<row r="4" s="2"><c r="D4" t="s"><v>0</v></c></row>' +
      '<row r="5" s="1"><c r="C5" s="1" t="s"><v>1</v></c></row>' +
      '<row r="6" s="2"><c r="C6" t="s"><v>0</v></c></row>'
    )
  })

  it('base items expose child parts as collections with normalized ids', () => {
    const doc = new DOMParser().parseFromString(`
      <sheetData><row r="1"><c r="A1" i="1"/><c r="B1" i="1"/></row><row r="2"/></sheetData>
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
                  idAttrs: ['r', 'i']
                }
              }
            }
          },
          elements
        }
      }
    })

    const rowPart = testCollection.get('sheetData').parts.get('row')
    const baseRow1Cells = rowPart.getBase('1').parts.get('c')

    should(baseRow1Cells.size).be.eql(2)
    should(baseRow1Cells.has(['A1', '1'])).be.True()
    should(baseRow1Cells.get(['B1', '1'])).be.ok()
    should(baseRow1Cells.get(['C1', '1'])).be.not.ok()
    should([...baseRow1Cells.all()].map(([, baseItem]) => baseItem.index)).be.eql([0, 1])

    // the child part exists even if the base element does not have elements for it
    const baseRow2Cells = rowPart.getBase('2').parts.get('c')

    should(baseRow2Cells.size).be.eql(0)
    should([...baseRow2Cells.keys()]).be.eql([])

    // instances of the row share the same base items for the child part
    rowPart.addInstance(['1'], ['3'], {})

    should(rowPart.get('3').parts.get('c').getBase(['A1', '1'])).be.exactly(baseRow1Cells.get(['A1', '1']))
  })
})
