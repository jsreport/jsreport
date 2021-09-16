'use strict'

const Fragment = require('./fragment')
const util = require('./util')
const ops = require('./ops')
const PDF = require('./object')

module.exports = class Header extends Fragment {
  constructor(doc, parent) {
    super(doc, parent)

    // a header could consist out of multiple FormXObjects and this property is later used keep
    // track of them
    this._objects = []

    // this array keeps track of all page numbers rendered in the header, because their rendering
    // is postponed
    this._pageNumbers = []

    // create new cursor for header context to not inherite bottom offset of document, which the
    // document receives from having a header
    this._cursor = this._cursor.clone()
  }

  /// private API

  // prevent page breaks inside a header
  async _pageBreak(level) {
    throw new Error('Header is to long (tried to execute a page break inside the header)')
  }

  async _start() {
    // changing the header will force ending and starting with a new page
    await this._doc._endPage()

    await this._setup()
  }

  async _setup() {
    this._cursor.reset()

    // these objects will be written to the document after all FormXObjects are written
    // it is therefore necessary to keep track of them seperately
    this._resources = new PDF.Object()
    this._doc._registerObject(this._resources)
    this._bbox = new PDF.Object()
    this._doc._registerObject(this._bbox)

    // a FormXObject will receive a Resources dictionary similar to Page objects, which is
    // why it is necessary to keep track of used fonts and xobjects
    this.fonts    = new PDF.Dictionary({})
    this.xobjects = new PDF.Dictionary({})

    // this header object has a similar interface like the page object and it is used as such
    // until the header has finished rendering (necessary to track the used fonts and xobjects)
    this._doc._contentObjCreator = this._createObject.bind(this)

    // close current content object and start a new one (by setting the _contentObjCreator object
    // above, the new content object will be created by calling the header's _createObject
    // method)
    await this._doc._startContentObject()
  }

  _createObject() {
    // this is going to be called on each _startContentObject() call as long as the header
    // is rendered, which creates a FormXObject (instead of the usual plain object)
    const xobj = new PDF.Object('XObject')
    xobj.prop('Subtype', 'Form')
    xobj.prop('FormType', 1)
    xobj.prop('BBox', this._bbox.toReference())
    xobj.prop('Resources', this._resources.toReference())
    return xobj
  }

  // while most parts of the header is static (i.e. rendered only once and then reused), there are
  // some dynamic parts (e.g. page numbers) which are rendered on each page
  // these parts are rendered here
  async _render() {
    if (this._pageNumbers.length === 0) {
      return
    }

    // lazy load text, because of cyclic dependencies of Fragment
    const Text = require('./text')

    for (const instance of this._pageNumbers) {
      let withPageCount = false
      if (instance.fn) {
        const lhs = instance.fn(1, 1)
        const rhs = instance.fn(1, 10)
        withPageCount = lhs.length !== rhs.length
      }

      // postpone writing page number until the end of the document, because the total page count
      // is not known now
      if (withPageCount) {
        // since there is only text with an already known font, the fonts dictionary can already
        // be build
        const fonts = new PDF.Dictionary({})
        const font = this._doc._fontInstance(instance.opts.font || this._doc.defaultFont)
        const fontAlias = this._doc._fontAlias(font)
        fonts.set(fontAlias, this._doc._fonts[fontAlias].o.toReference())

        // create the FormXObject that is used to render the page numbers
        const xobj = new PDF.Object('XObject')
        xobj.prop('Subtype', 'Form')
        xobj.prop('FormType', 1)
        xobj.prop('BBox', new PDF.Array([instance.x, instance.y, instance.x + instance.width, instance.y - instance.height]))
        xobj.prop('Resources', new PDF.Dictionary({
          ColorSpace: new PDF.Dictionary({
            CS1: new PDF.Array([new PDF.Name('ICCBased'), this._doc._colorSpace.toReference()]),
          }),
          ProcSet: new PDF.Array([new PDF.Name('Text')]),
          Font:    fonts,
        }))
        this._doc._registerObject(xobj)

        // calculate the number of the currently rendered page
        const currentPage = this._doc._pages.length

        // add a handler to the document that will be called when the document is finished up
        // this is necessary because the total count of pages is not yet known
        this._doc._finalize.push(async () => {
          await this._doc._startContentObject(xobj)

          // setup the cursor to the position the page numbers should be rendered at
          this._cursor.y = instance.y
          this._cursor.x = instance.x
          this._cursor.width = instance.width

          // negate document bottomOffset, which is there because of this header
          this._cursor.bottomOffset = -this._doc._cursor.bottomOffset

          // create the text representing the page numbers
          const pageCount =  this._doc._pages.length
          const str = instance.fn ? instance.fn(currentPage, pageCount) : currentPage

          // manually render the text
          const txt = new Text(this._doc, this, instance.opts)
          txt._parts++
          txt._ended = true
          await txt._start()
          await txt._render(str, instance.opts)
          await txt._end()

          await this._doc._endContentObject()
        })

        // render and register the FormXObject to the current page
        const alias = new PDF.Name(this._doc._aliases.next('X'))
        this._doc._currentContent._xobjects[alias] = xobj.toReference()
        await this._doc._write(ops.Do(alias))
      } else {
        // if there is now total page count necessary, we can write the current page number directly
        this._cursor.y = instance.y
        this._cursor.x = instance.x
        this._cursor.width = instance.width

        // negate document bottomOffset, which is there because of this header
        this._cursor.bottomOffset = -this._doc._cursor.bottomOffset

        const txt = new Text(this._doc, this, instance.opts)
        txt._parts++
        txt._ended = true
        await txt._start()
        await txt._render(String(this._doc._pages.length), instance.opts)
        await txt._end()
      }
    }
  }

  async _end() {
    // save the height of the header
    // this is used to correctly offset the cursor when rendering the page
    this.height = this._doc._cursor.startY - this._doc._cursor.y

    await this._doc._endContentObject()

    // collect all fonts and xobjects that are used in the header
    for (const content of this._doc._contents) {
      for (const alias in content._fonts) {
        this.fonts.add(alias, content._fonts[alias])
      }

      for (const alias in content._xobjects) {
        this.xobjects.add(alias, content._xobjects[alias])
      }
    }

    // create the Resources object for the header's FormXObjects
    this._resources.content = new PDF.Dictionary({
      ColorSpace: new PDF.Dictionary({
        CS1: new PDF.Array([new PDF.Name('ICCBased'), this._doc._colorSpace.toReference()]),
      }),
      ProcSet: new PDF.Array([
        new PDF.Name('PDF'),
        new PDF.Name('Text'),
        new PDF.Name('ImageB'),
        new PDF.Name('ImageC'),
        new PDF.Name('ImageI')
      ]),
      Font:    this.fonts,
      XObject: this.xobjects
    })
    await this._doc._writeObject(this._resources)

    // setup the BBox
    this._bbox.content = new PDF.Array([
      this._cursor.startX, this._cursor.startY,
      this._cursor.startX + this._doc._cursor.width, this._doc._cursor.y
    ])
    await this._doc._writeObject(this._bbox)

    // the header can consist out of multiple FormXObjects, which are collected here
    this._objects = this._doc._contents.map(c => c._object)

    // reset everything
    this._doc._cursor.reset()

    this._doc._currentContent = null
    this._doc._contents.length = 0

    this._doc._contentObjCreator = null
  }

  /// public API

  pageNumber(fn, opts) {
    if (typeof fn === 'object') {
      opts = fn
      fn = undefined
    }

    if (!opts || typeof opts !== 'object') {
      opts = {}
    }

    const font = this._doc._fontInstance(opts.font || this._doc.defaultFont)
    const fontSize = opts.fontSize || this._doc.defaultFontSize
    const lineHeight = opts.lineHeight || this._doc.defaultLineHeight

    const height = font.lineHeight(fontSize, true) * lineHeight
    const descent = -font.descent(fontSize) * lineHeight

    this._begin(null)
    this._pending.push(() => {
      this._pageNumbers.push({
        y: this._cursor.y,
        x: this._cursor.x,
        width: this._cursor.width,
        height: height + descent,
        opts: opts,
        fn: fn
      })

      this._cursor.y -= height + descent
      return Promise.resolve()
    })
  }
}
