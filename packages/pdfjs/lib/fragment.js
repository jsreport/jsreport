'use strict'

const Cursor = require('./cursor')
const ops = require('./ops')
const util = require('./util')
const renderImage = require('./image/render')

const ALREADY_ENDED_ERROR = new Error('already ended')

module.exports = class Fragment {
  constructor(doc, parent) {
    this._init(doc, parent)
  }

  /// private API

  _init(doc, parent) {
    this._doc = doc
    this._parent = parent
    this._cursor = parent._cursor
    this._ended = false
    this._current = null

    this._pending = parent._pending
  }

  async _pageBreak(level) {
    if (this._parent) {
       await this._parent._pageBreak(level + 1)
    }
  }

  async _end() {
    // abstract
  }

  _begin(ctx) {
    if (this._ended) {
      throw ALREADY_ENDED_ERROR
    }

    if (this._current) {
      this._current.end()
    }

    this._current = ctx
  }

  _opts(opts) {
    if (this.opts) {
      // inherit font options
      return Object.assign({
        font: this.opts.font,
        fontSize: this.opts.fontSize,
        color: this.opts.color,
        lineHeight: this.opts.lineHeight,
      }, opts)
    } else {
      return opts
    }
  }

  /// public API

  end() {
    if (this._ended) {
      throw ALREADY_ENDED_ERROR
    }

    if (this._current) {
      this._current.end()
      this._current = null
    }

    this._ended = true
    this._pending.push(() => this._end())
  }

  text(text, opts) {
    if (text !== null && typeof text === 'object') {
      opts = text
      text = undefined
    }

    if (!opts || typeof opts !== 'object') {
      opts = {}
    }

    const Text = require('./text')
    const ctx = new Text(this._doc, this, this._opts(opts))
    this._begin(ctx)

    ctx._pending.push(() => ctx._start())

    if (typeof text === 'string' && text.length > 0) {
      ctx.add(text)
    }

    return ctx
  }

  cell(text, opts) {
    if (text !== null && typeof text === 'object') {
      opts = text
      text = undefined
    }
    if (!opts || typeof opts !== 'object') {
      opts = {}
    }

    const Cell = require('./cell')
    const ctx = new Cell(this._doc, this, this._opts(opts))
    this._begin(ctx)

    ctx._pending.push(() => ctx._start())
    this._pending.push(ctx._pending)

    if (typeof text === 'string' && text.length > 0) {
      ctx.text(text, opts)
    }

    return ctx
  }

  table(opts) {
    if (!opts || typeof opts !== 'object') {
      opts = {}
    }

    const Table = require('./table')
    const ctx = new Table(this._doc, this, this._opts(opts))
    this._begin(ctx)

    return ctx
  }

  image(img, opts) {
    if (!opts || typeof opts !== 'object') {
      opts = {}
    }

    this._begin(null)
    this._pending.push(() => renderImage(img, this._doc, this, opts))
  }

  pageBreak() {
    this._begin(null)
    this._pending.push(() => this._parent._pageBreak(1))
  }

  op(fn) {
    this._begin(null)
    this._pending.push(async () => {
      if (!this._doc._currentContent) {
        await this._doc._startPage()
      }

      let args = arguments
      if (typeof fn === 'function') {
        args = fn(this._cursor.x, this._cursor.y)
        if (!Array.isArray(args)) {
          throw new TypeError('Return of .op(() => {}) must be an array')
        }
      }
      return this._doc._write(ops.write.apply(ops, args))
    })
  }

  destination(name) {
    this._begin(null)
    this._pending.push(async () => {
      const DestinationRangeStyle = require('./text').DestinationRangeStyle
      const self = {
        destination: name,
        doc: this._doc,
        from: this._cursor.x,
        y: this._cursor.y,
      }
      DestinationRangeStyle.prototype._applyStyle.call(self)
    })
  }
}
