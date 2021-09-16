const PDF = require('@jsreport/pdfjs/lib/object')
const Parser = require('@jsreport/pdfjs/lib/parser/parser')

/*
 * pdfjs object which holds another pdf buffer
 * which is during "serialization" writen into pdf as form
 * and referenced using xobject from a particular page in "mergePdf.js"
 */
module.exports = class EmbeddedPdf {
  constructor (page) {
    const mediaBox = page.get('MediaBox')
    this.page = page
    this.width = mediaBox[2]
    this.height = mediaBox[3]

    this.contents = this.page.get('Contents')
    this.xobjCount = Array.isArray(this.contents) ? this.contents.length : 1
  }

  async write (doc, xobjs) {
    const resources = this.page.get('Resources')

    for (let i = 0; i < this.xobjCount; ++i) {
      const xobj = xobjs[i]

      xobj.prop('Subtype', 'Form')
      xobj.prop('FormType', 1)
      xobj.prop('BBox', new PDF.Array([0, 0, this.width, this.height]))
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
      xobj.prop('Length', contents.properties.get('Length'))
      if (contents.properties.has('Length1')) {
        xobj.prop('Length1', contents.properties.get('Length1'))
      }

      const objects = []
      Parser.addObjectsRecursive(objects, xobj)

      // first, register objects to assign IDs (for references)
      for (const obj of objects) {
        doc._registerObject(obj)
      }

      // write objects
      for (const obj of objects) {
        await doc._writeObject(obj)
      }

      await doc._writeObject(xobj)
    }
  }
}
