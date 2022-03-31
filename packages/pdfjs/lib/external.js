'use strict'

const PDF = require('./object')
const Parser = require('./parser/parser')

module.exports = class ExternalDocument {
  constructor (src) {
    const parser = new Parser(src)
    parser.parse()

    this.catalog = parser.trailer.get('Root').object.properties
    const pagesList = []

    this.pages = this.catalog.get('Pages').object.properties
    this.pageCount = 0
    this.objects = []
    this.dests = this.catalog.get('Dests')
    const acroFormRef = this.catalog.get('AcroForm')
    if (acroFormRef) {
      this.acroFormObj = acroFormRef.object
    }
    const namesRef = this.catalog.get('Names')
    if (namesRef) {
      this.namesObj = namesRef.object
    }

    const info = parser.trailer.get('Info')
    if (info) {
      this.infoObj = info.object
    }

    this.lang = this.catalog.get('Lang')

    const parsePages = (pages) => {
      for (const kid of pages.get('Kids')) {
        if (kid.object.properties instanceof PDF.Dictionary && kid.object.properties.get('Type').name === 'Pages') {
          parsePages(kid.object.properties)
        } else {
          kid.object.properties.del('Parent')

          const objects = []
          Parser.addObjectsRecursive(objects, kid.object)

          this.objects.push(objects)
          this.pageCount++
          pagesList.push(kid)
        }
      }
    }

    parsePages(this.catalog.get('Pages').object.properties)
    this.pages.set('Kids', pagesList)
  }

  // TODO: add mutex to not write concurrently (because of document specific _registerObject)
  async write (doc, page) {
    await doc._endPage()

    const kids = this.pages.get('Kids')

    for (let i = page ? page - 1 : 0, len = page || kids.length; i < len; ++i) {
      const page = kids[i].object
      page.prop('Parent', doc._pagesObj.toReference())

      const objects = this.objects[i]

      // JB change, removed force register to avoid duplicating fonts in the final document
      doc._registerObject(page)

      // first, register objects to assign IDs (for references)
      for (const obj of objects) {
        // JB change, removed force register to avoid duplicating fonts in the final document
        doc._registerObject(obj)
      }

      // write objects
      for (const obj of objects) {
        await doc._writeObject(obj)
      }

      await doc._writeObject(page)

      doc._pages.push(page.toReference())
    }

    if (this.namesObj) {
      const namesObjects = []
      Parser.addObjectsRecursive(namesObjects, this.namesObj)
      for (const o of namesObjects) {
        doc._registerObject(o)
      }
      const docNames = doc._namesObj.properties.get('EmbeddedFiles').get('Names')
      doc._namesObj.properties.get('EmbeddedFiles').set('Names', new PDF.Array([
        ...(this.namesObj.properties.get('EmbeddedFiles')?.get('Names') ?? []),
        ...docNames
      ]))
    }

    // merge in the acroform object
    if (this.acroFormObj && this.acroFormObj.properties.get('Fields')) {
      let fieldsToMerge = this.acroFormObj.properties.get('Fields')
      if (page != null) {
        const pageObject = kids[page - 1].object
        fieldsToMerge = pageObject.properties.get('Annots') ? fieldsToMerge.filter(f => pageObject.properties.get('Annots').find(a => a === f)) : []
      }

      // union dields from both, fields are just refs already registered in the page->annotation so don't need registration
      doc._acroFormObj.prop('Fields', new PDF.Array([...doc._acroFormObj.properties.get('Fields'), ...fieldsToMerge]))

      // merge the DR -> these are font refs, without DR the fields doesn't display text when lost focus
      if (this.acroFormObj.properties.has('DR')) {
        let docDR = doc._acroFormObj.properties.get('DR')
        if (docDR == null) {
          docDR = new PDF.Dictionary({
            Font: new PDF.Dictionary()
          })
          doc._acroFormObj.properties.set('DR', docDR)
        }
        const extFontDict = this.acroFormObj.properties.get('DR').get('Font')
        const docFontDict = docDR.get('Font')

        for (let fontName in extFontDict.dictionary) {
          fontName = fontName.substring(1)
          if (!docFontDict.has(fontName)) {
            const font = extFontDict.get(fontName)
            const fontObjects = []
            Parser.addObjectsRecursive(fontObjects, font)
            for (const o of fontObjects) {
              doc._registerObject(o, true)
            }

            docFontDict.set(fontName, font)
          }
        }
      }
      if (this.acroFormObj.properties.has('NeedAppearances')) {
        doc._acroFormObj.properties.set('NeedAppearances', this.acroFormObj.properties.get('NeedAppearances'))
      }
      if (this.acroFormObj.properties.has('SigFlags')) {
        doc._acroFormObj.properties.set('SigFlags', this.acroFormObj.properties.get('SigFlags'))
      }
    }

    if (!page && this.infoObj) {
      for (let key in this.infoObj.properties.dictionary) {
        key = key.substring(1)
        if (doc.info[key] == null) {
          const v = this.infoObj.properties.get(key)
          if (v == null || v.str == null) {
            continue
          }
          if (v.str.startsWith('D:')) {
            // skip dates
            continue
          }
          doc.info[key] = v.str
        }
      }
    }

    if (!page && this.lang) {
      doc._finalizeCatalog.push(() => {
        if (doc._catalog.properties.get('Lang') == null) {
          doc._catalog.prop('Lang', this.lang)
        }
      })
    }

    if (this.dests) {
      doc._destsObject = this.dests.object
    }
  }

  async setAsTemplate (doc) {
    await doc._endPage()

    const kids = this.pages.get('Kids')
    if (!kids[0]) {
      throw new TypeError('External document is invalid')
    }
    const first = kids[0].object.properties
    const objects = this.objects[0]

    // first, register objects to assign IDs (for references)
    for (const obj of objects) {
      doc._registerObject(obj, true)
    }

    // write objects
    for (const obj of objects) {
      await doc._writeObject(obj)
    }

    let contents = first.get('Contents')
    if (!Array.isArray(contents)) {
      contents = [contents]
    }

    let resources = first.get('Resources')
    if (resources instanceof PDF.Reference) {
      resources = resources.object.properties
    }

    doc._template = {
      contents: contents.map(c => c.toString()),
      colorSpaces: {},
      fonts: {},
      xobjects: {}
    }

    const colorSpaces = resources.get('ColorSpace')
    if (colorSpaces) {
      for (const alias in colorSpaces.dictionary) {
        doc._template.colorSpaces[alias] = colorSpaces.dictionary[alias].toString()
        doc._aliases.block(alias)
      }
    }

    const fonts = resources.get('Font')
    if (fonts) {
      for (const alias in fonts.dictionary) {
        doc._template.fonts[alias] = fonts.dictionary[alias].toString()
        doc._aliases.block(alias)
      }
    }

    const xobjects = resources.get('XObject')
    if (xobjects) {
      for (const alias in xobjects.dictionary) {
        doc._template.xobjects[alias] = xobjects.dictionary[alias].toString()
        doc._aliases.block(alias)
      }
    }
  }
}
