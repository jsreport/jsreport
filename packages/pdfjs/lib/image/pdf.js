'use strict'

const PDF = require('../object')
const Parser = require('../parser/parser')

module.exports = class PDFImage {
  constructor(src) {
    const parser = new Parser(src)
    parser.parse()

    const catalog  = parser.trailer.get('Root').object.properties
    const pages    = catalog.get('Pages').object.properties
    const first    = pages.get('Kids')[0].object.properties
    const mediaBox = first.get('MediaBox') || pages.get('MediaBox')

    this.page = first
    this.width = mediaBox[2]
    this.height = mediaBox[3]

    const contents = this.page.get('Contents')
    this.xobjCount = Array.isArray(contents) ? contents.length : 1
  }

  async write(doc, xobjs) {
    const resources = this.page.get('Resources')
    const bbox = new PDF.Array([0, 0, this.width, this.height])

    for (let i = 0; i < this.xobjCount; ++i) {
      const xobj = xobjs[i]

      xobj.prop('Subtype', 'Form')
      xobj.prop('FormType', 1)
      xobj.prop('BBox', bbox)
      xobj.prop('Resources', resources instanceof PDF.Object ? resources.toReference() : resources)

      let contents = this.page.get('Contents')
      if (Array.isArray(contents)) {
        contents = contents[i].object
      } else {
        contents = contents.object
      }

      const content = new PDF.Stream(xobj)
      content.content = contents.content.content

      if (contents.properties.has('Filter')) {
        xobj.prop('Filter', contents.properties.get('Filter'))
      }
      xobj.prop('Length',  contents.properties.get('Length'))
      if (contents.properties.has('Length1')) {
        xobj.prop('Length1', contents.properties.get('Length1'))
      }

      const objects = []
      Parser.addObjectsRecursive(objects, xobj)

      // first, register objects to assign IDs (for references)
      for (const obj of objects) {
        doc._registerObject(obj, true)
      }

      // write objects
      for (const obj of objects) {
        await doc._writeObject(obj)
      }

      await doc._writeObject(xobj)
    }
  }
}
