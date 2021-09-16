'use strict'

const Fragment = require('./fragment')
const util = require('./util')
const ops = require('./ops')

module.exports = class Cell extends Fragment {
  constructor(doc, parent, opts) {
    super(doc, parent)

    this._pending = []
    this._firstPage = true
    this._firstRendered = false
    this._drawBorders = true

    // create new cursor for cell context
    // const previousCursor = this._cursor
    this._cursor = this._cursor.clone()

    applyOpts.call(this, opts)

    this._previousStartX = this._cursor.startX
    if (this.x) {
      this._cursor.startX = this.x
    }

    // adjust cursor according to cell padding
    this._cursor.startX += this.paddingLeft
    this._cursor.width  -= this.paddingLeft + this.paddingRight
    this._cursor.bottomOffset = this.paddingBottom - this.borderBottomWidth

    this._startRendering = null
  }

  /// private API

  async _pageBreak(level) {
    const renderHeight = this._startY - this._cursor.bottom
    const actualHeight = this._startY - this._cursor.y

    let contents, offset
    if (this._firstPage && renderHeight / this._doc.height <= .15) {
      // move already rendered cell content to the next page if the current cell height does only
      // make up about 10% of the total page height
      const idx = this._doc._contents.indexOf(this._bgLayerRef)
      const take = this._endLayerRef ? (this._doc._contents.indexOf(this._endLayerRef) - idx + 1) : (this._doc._contents.length - idx)
      contents = this._doc._contents.splice(idx, take)
      offset = actualHeight - this.paddingTop + this.borderTopWidth
    } else {
      // on page breaks, always draw background until the current bottom
      this._cursor.y = this._cursor.bottom - this.paddingBottom

      // create background on each page break
      await this._createBackground(!this._firstRendered, false)
      this._firstRendered = true
    }

    this._firstPage = false

    if (this._parent) {
      await this._parent._pageBreak(level + 1, contents === undefined)
    }

    // By pushing the following at the beginning of the cell's pending queue instead of executing
    // it directly, we ensure that is executed just before the cell's content continues rendering
    // on the next page - especially when cells are appended horizontally into rows.
    this._pending.unshift(async () => {
      // reset some cursor values
      this._cursor.x = this._cursor.startX
      this._cursor.cursorOffset = 0

      if (contents) {
        await this._doc._startContentObject()
        await this._doc._write(ops.q() + ops.cm(1, 0, 0, 1, 0, this._cursor.y - this._startY))
        this._doc._contents.push.apply(this._doc._contents, contents)

        await this._doc._startContentObject()
        await this._doc._write(ops.Q())

        this._bgLayerRef = null
      }

      this._startY = this._cursor.y

      if (offset > 0) {
        this._cursor.y -= offset
      }

      // apply padding after page break (but only to most inner cell)
      if (level === 1) {
        this._cursor.y -= this.paddingTop - this.borderTopWidth
        this._cursor.bottomOffset = this.paddingBottom - this.borderBottomWidth
      }

      // TODO: is there a better way of achieving this?
      if (this._pending.length === 0) {
        this._cursor.y = this._startY
      }
    })
  }

  async _createBackground(hasTopBorder, hasBottomBorder) {
    // if there is no backgroundColor, it is not necessary to create the background layer
    const hasBorder = this._drawBorders && (this.borderTopWidth > 0 || this.borderRightWidth > 0 || this.borderBottomWidth > 0 || this.borderLeftWidth > 0)
    if (!this.backgroundColor && !hasBorder) {
      return
    }

    // start a new content object for the background and border layer
    await this._doc._startContentObject(null, true)

    // put the background layer behind the cell
    const layer = this._doc._contents.pop()
    const bgLayerIndex = this._bgLayerRef ? this._doc._contents.indexOf(this._bgLayerRef) : 0
    this._doc._contents.splice(bgLayerIndex, 0, layer)

    // calculate background height
    let height = this._startY - this._cursor.y
    const bottom = this._cursor.bottom - this.paddingBottom + this.borderBottomWidth
    if (this._startY - height < bottom) {
      // if background height goes beyond bottom of document, trim it to the bottom
      height = this._startY - bottom
    }

    let chunk = ops.q() // save graphics state

    if (this.backgroundColor) {
      // write background
      chunk += ops.sc(this.backgroundColor[0], this.backgroundColor[1], this.backgroundColor[2]) // non-stroking color
             + ops.re(this._cursor.startX - this.paddingLeft, this._startY - height, this.outerWidth, height) // rectangle
             + ops.f() // fill path
    }

    if (this._drawBorders) {
      let borderColor = null
      let borderWidth = null

      // draw left border
      if (this.borderLeftWidth > 0) {
        if (!borderColor || !util.rgbEqual(borderColor, this.borderLeftColor)) {
          chunk += ops.SC(this.borderLeftColor[0], this.borderLeftColor[1], this.borderLeftColor[2]) // stroking color
          borderColor = this.borderLeftColor
        }

        if (borderWidth !== this.borderLeftWidth) {
          chunk += ops.w(this.borderLeftWidth) // line width
          borderWidth = this.borderLeftWidth
        }

        const x = this._cursor.startX - this.paddingLeft + this.borderLeftWidth / 2
        const y1 = this._startY
        const y2 = this._startY - height

        chunk += ops.S(x, y1, 'm', x, y2, 'l') // fill path
      }

      // draw right border
      if (this.borderRightWidth > 0) {
        if (!borderColor || !util.rgbEqual(borderColor, this.borderRightColor)) {
          chunk += ops.SC(this.borderRightColor[0], this.borderRightColor[1], this.borderRightColor[2]) // stroking color
          borderColor = this.borderRightColor
        }

        if (borderWidth !== this.borderRightWidth) {
          chunk += ops.w(this.borderRightWidth) // line width
          borderWidth = this.borderRightWidth
        }

        const x = this._cursor.startX - this.paddingLeft + this.outerWidth - this.borderRightWidth / 2
        const y1 = this._startY
        const y2 = this._startY - height

        chunk += ops.S(x, y1, 'm', x, y2, 'l') // fill path
      }

      // draw top border
      if (hasTopBorder && this.borderTopWidth > 0) {
        if (!borderColor || !util.rgbEqual(borderColor, this.borderTopColor)) {
          chunk += ops.SC(this.borderTopColor[0], this.borderTopColor[1], this.borderTopColor[2]) // stroking color
          borderColor = this.borderTopColor
        }

        if (borderWidth !== this.borderTopWidth) {
          chunk += ops.w(this.borderTopWidth) // line width
          borderWidth = this.borderTopWidth
        }

        const x1 = this._cursor.startX - this.paddingLeft
        const x2 = x1 + this.outerWidth
        const y = this._startY - this.borderTopWidth / 2

        chunk += ops.S(x1, y, 'm', x2, y, 'l') // fill path
      }

      // draw bottom border
      if (hasBottomBorder && this.borderBottomWidth > 0) {
        if (!borderColor || !util.rgbEqual(borderColor, this.borderBottomColor)) {
          chunk += ops.SC(this.borderBottomColor[0], this.borderBottomColor[1], this.borderBottomColor[2]) // stroking color
          borderColor = this.borderBottomColor
        }

        if (borderWidth !== this.borderBottomWidth) {
          chunk += ops.w(this.borderBottomWidth) // line width
          borderWidth = this.borderBottomWidth
        }

        const x1 = this._cursor.startX - this.paddingLeft
        const x2 = x1 + this.outerWidth
        const y = this._startY - height + this.borderBottomWidth / 2

        chunk += ops.S(x1, y, 'm', x2, y, 'l') // fill path
      }
    }

    if (chunk.length > 0) {
      chunk += ops.Q() // restore graphics state
      await this._doc._write(chunk)
    }

    // for succeeding pages put background layers at index 0 (for bgLayerRef === null, index 0
    // will be used)
    this._bgLayerRef = null

    // update startAt to take page break into account
    this._startY = this._cursor.startY
  }

  async _start() {
    if (!this._doc._currentContent) {
      await this._doc._startPage()
    }

    if (this.minHeight > 0 && !this._parent._cursor.doesFit(this.minHeight)) {
      await this._parent._pageBreak(1)
    }

    if (this.y !== undefined) {
      this._cursor.y = this.y
    }

    // Note: We could call `doesFit(this.minHeight)` here again to test whether the cell fits on the
    // newly created page. However, instead of throwing an error, when the minHeight is greater than
    // the document height, the minHeight is bounded to the documents height.

    this._startY = this._cursor.y

    this._cursor.x = this._cursor.startX
    this._cursor.y -= this.paddingTop

    this.outerWidth = this._cursor.width + this.paddingLeft + this.paddingRight

    // start a new content layer for cells
    // save the current layer ref, this will be used to place the background and border layer
    // after the cell has been rendered
    // Note: saving the index directly would  not work for nested rendering tasks
    this._bgLayerRef = await this._doc._startContentObject(null, true)

    // block execution until the row knows about all its cells, otherwise it is possible that the
    // rendering scheduler (_pending) removes this._pending before the cell's end got called
    if (!this._ended) {
      await new Promise(resolve => {this._startRendering = resolve})
    }
  }

  async _end() {
    // apply bottom padding
    this._cursor.y -= this.paddingBottom

    const height = this._startY - this._cursor.y
    if (height < this.opts.minHeight) {
      this._cursor.y -= this.opts.minHeight - height
    }

    // create final createBackground
    await this._createBackground(!this._firstRendered, true)

    // restore cursor
    this._cursor.x = this._previousStartX
  }

  end() {
    if (this._startRendering) {
      this._startRendering()
    }
    return Fragment.prototype.end.call(this)
  }
}

function applyOpts(opts) {
  this.opts = opts

  if ('width' in opts) {
    this._cursor.width = opts.width
  }

  if ('x' in opts) {
    this.x = opts.x
  }

  if ('y' in opts) {
    this.y = opts.y
  }

  this.paddingTop    = opts.paddingTop    || opts.padding || 0
  this.paddingRight  = opts.paddingRight  || opts.padding || 0
  this.paddingBottom = opts.paddingBottom || opts.padding || 0
  this.paddingLeft   = opts.paddingLeft   || opts.padding || 0

  // background creation callback
  this.backgroundColor = util.colorToRgb(opts.backgroundColor)

  this.borderTopWidth = opts.borderTopWidth || opts.borderWidth || 0
  this.borderTopColor = util.colorToRgb(opts.borderTopColor || opts.borderColor || 0x000000)

  this.borderRightWidth = opts.borderRightWidth || opts.borderWidth || 0
  this.borderRightColor = util.colorToRgb(opts.borderRightColor || opts.borderColor || 0x000000)

  this.borderBottomWidth = opts.borderBottomWidth || opts.borderWidth || 0
  this.borderBottomColor = util.colorToRgb(opts.borderBottomColor || opts.borderColor || 0x000000)

  this.borderLeftWidth = opts.borderLeftWidth || opts.borderWidth || 0
  this.borderLeftColor = util.colorToRgb(opts.borderLeftColor || opts.borderColor || 0x000000)

  this.paddingTop    += this.borderTopWidth
  this.paddingRight  += this.borderRightWidth
  this.paddingBottom += this.borderBottomWidth
  this.paddingLeft   += this.borderLeftWidth

  this.minHeight = opts.minHeight || 0
}