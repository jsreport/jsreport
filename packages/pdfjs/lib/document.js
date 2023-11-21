const PDF = require('./object')
const { getObjectsRecursive } = require('./parser/parser')
const merge = require('./mixins/merge')
const append = require('./mixins/append')
const attachment = require('./mixins/attachment')
const outlines = require('./mixins/outlines')
const processText = require('./mixins/processText')
const acroForm = require('./mixins/acroForm')
const info = require('./mixins/info')
const encrypt = require('./mixins/encrypt/encrypt')
const sign = require('./mixins/sign')
const pdfA = require('./mixins/pdfa/pdfA.js')
const pdfUA = require('./mixins/pdfua/pdfUA.js')
const DocumentBase = require('./documentBase')

module.exports = class Document extends DocumentBase {
  constructor () {
    super()
    this._nextObjectId = 1
    this._length = 0 // keeps track of the total document length (in byte)
    this._xref = new PDF.Xref()

    this._chunks = []

    this.catalog = new PDF.Object('Catalog')
    this.catalog.prop('Pages', new PDF.Object('Pages').toReference())

    this.catalog.properties.get('Pages').object.prop('MediaBox', new PDF.Array([0, 0, 595.296, 841.896]))
    this.catalog.properties.get('Pages').object.prop('Kids', new PDF.Array())
    this.catalog.properties.get('Pages').object.prop('Count', 0)

    this.catalog.prop('Names', new PDF.Object().toReference())
    this.catalog.properties.get('Names').object.prop('EmbeddedFiles', new PDF.Dictionary())
    this.catalog.properties.get('Names').object.properties.get('EmbeddedFiles').set('Names', new PDF.Array())

    this.catalog.prop('Dests', new PDF.Object().toReference())

    this.finalizers = []
    this.trailerFinalizers = []
    this.postprocessors = []

    merge(this)
    append(this)
    attachment(this)
    outlines(this)
    processText(this)
    acroForm(this)
    info(this)
    encrypt(this)
    sign(this)
    pdfA(this)
    pdfUA(this)
  }

  async asBuffer () {
    this._write('%PDF-1.6\n' +
      // The PDF format mandates that we add at least 4 commented binary characters
      // (ASCII value >= 128), so that generic tools have a chance to detect
      // that it's a binary file
      '%\xFF\xFF\xFF\xFF\n\n')
    // to support random access to individual objects, a PDF file
    // contains a cross-reference table that can be used to locate
    // and directly access pages and other important objects within the file

    this._registerObject(this.catalog)

    for (const fn of this.finalizers) {
      await fn()
    }

    const objects = getObjectsRecursive(this.catalog)
    for (const o of objects) {
      this._registerObject(o)
    }

    this._writeObject(this.catalog)

    for (const o of objects) {
      this._writeObject(o)
    }

    const startxref = this._length
    await this._write(this._xref.toString())

    // trailer
    const objectsCount = this._nextObjectId - 1

    this.trailer = new PDF.Trailer(objectsCount + 1, this.catalog, this.catalog.properties.get('Info')?.object)
    for (const fn of this.trailerFinalizers) {
      await fn(this.trailer)
    }
    await this._write(this.trailer.toString() + '\n')

    // startxref
    await this._write('startxref\n' + startxref + '\n%%EOF')

    let res = Buffer.concat(this._chunks)
    for (const fn of this.postprocessors) {
      res = await fn(res)
    }
    return res
  }

  _registerObject (object, force) {
    if (object instanceof PDF.Stream) {
      object = object.object
    }

    if (!force && object.id) {
      return
    }

    object.id = this._nextObjectId
    this._nextObjectId++
  }

  _writeObject (object, encrypt = true) {
    if (object instanceof PDF.Stream) {
      object = object.object
    }

    if (!object.id) {
      this._registerObject(object)
    }

    // TODO melo by to tady byt a nemelo by se to resit uplne jinak
    // pofider change, avoid duplicating objects (fonts for instance) to have smaller final pdf size
    if (this._xref.get(object.id)) {
      return
    }

    this._xref.add(object.id, {
      offset: this._length,
      obj: object
    })

    return this._write(object.toString(this.getEncryptFn(object.id)) + '\n\n')
  }

  _write (chunk) {
    this._length += chunk.length
    this._chunks.push(Buffer.from(chunk, 'binary'))
  }
}
