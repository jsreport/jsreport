'use strict'

const Fragment = require('./fragment')
const util = require('./util')
const ops = require('./ops')
const Cell = require('./cell')

module.exports = class Row {
  constructor(doc, parent, opts) {
    Fragment.prototype._init.call(this, doc, parent)

    this.opts = opts

    // use an own queue for pending operations
    this._pending = []

    // keep track of the cells that have already been ended;
    // this is necessary to be able to still draw their background and finalize their rendering
    // once all cells are ended (scenario where not all cells span the same amount of pages)
    this._endedCells = []

    // keep a count of not ended cells to adjust the rotation of cells on page breaks properly
    this._columns = 0

    // when a page break occures inside a cell, the cells are rotated before an actual page
    // break is rendered; i.e., all cells of the row are rendered horizontally
    this._rotated = 0

    // this is used to keep track of the starting y of the row to reset the cursor's y to
    // this value for each cell (since they are horizontally aligned)
    this._y = 0

    // on each page the row is rendered on, the row keeps track of the maximal y (or minimum
    // in terms of PDF, because y 0 is on the bottom) a cell is rendered to, to be able to align
    // the backgrounds of all cells to the same height
    this._endY = null

    this._widths = []
    this._topBorderWidth = 0
    this._topBorderColor = 0x000000
    this._bottomBorderWidth = 0
    this._bottomBorderColor = 0x000000
    this._borderVerticalWidths = []
    this._borderVerticalColors = []
    this._minHeight = opts.minHeight || 0

    this._hasTopBorder = false
    this._insideBreak = false
    this._startRendering = null
  }

  /// private API

  async _pageBreak(level, insideBreak) {
    this._insideBreak = insideBreak

    // the pending queue looks as follows: [ [cell1], [cell2], ..., [celln], endRow]
    // the currently rendered cell is at the head of the queue and therefore removed and
    // re-inserted at the second last position
    this._pending.splice(this._pending.length - 2, 0 , this._pending.shift())

    // test whether we have rotated all cells of the row
    if (this._rotated < this._columns - 1) {
      this._rotated++

      // move to the next cell
      this._nextColumn()
    } else {
      // execute the pageBreak (rendering background, trigger retrospective page breaks, ...) of all
      // already ended cells manually
      for (const cell of this._endedCells) {
        this._cursor.y = cell._cursor.bottom
        await cell._pageBreak(level - 1)

        // pageBreak may add new callbacks to the cell's pending queue, which is however not anymore
        // contained in the document's queue, therefor add these callbacks to the row's queue
        while (cell._pending.length) {
          this._pending.unshift(cell._pending.shift())
        }
      }

      await this._drawBorders(true, insideBreak)

      // reset the rotation
      this._rotated = 0

      // execute an actual page break
      await this._parent._pageBreak(level + 1, insideBreak)

      // store starting y to be able to align all cells horizontally
      this._y = this._cursor.y

      this._endY = null
    }
  }

  _nextColumn() {
    // reset the current y back to the row start to align all cells horizontally
    this._cursor.y = this._y
  }

  async _start() {
    if (this._minHeight > 0 && !this._parent._cursor.doesFit(this._minHeight)) {
      await this._parent._pageBreak(1)
    }

    // save start y of the row to be able to align all cells horizontally
    this._y = this._cursor.y

    // block execution until the row knows about all its cells, otherwise it is possible that the
    // rendering scheduler (_pending) removes this._pending before the cell's end got called
    if (!this._ended) {
      await new Promise(resolve => {this._startRendering = resolve})
    }
  }

  async _end() {
    // the actual end logic of cells has been postponed until here where it is called manually
    for (const cell of this._endedCells) {
      this._cursor.y = this._endY + cell.paddingBottom
      await Cell.prototype._end.call(cell)
    }

    await this._drawBorders(false)

    // reset cursor
    this._cursor.x = this._cursor.startX
    this._cursor.y = this._endY
  }

  _begin(ctx) {
    Fragment.prototype._begin.call(this, ctx)
  }

  async _drawBorders(isPageBreak, isInsideBreak) {
    // detect a retrospective page break and not render boreders in this case
    if (isPageBreak && !isInsideBreak) {
      this._hasTopBorder = true
      return
    }

    // draw border
    let hasBorder = false
    let chunk = ops.q() // save graphics state

    const y1 = this._y
    const y2 = isPageBreak ? this._cursor.bottom : this._endY
    let left = this._cursor.startX
    let borderWidth = 0
    let borderColor = null

    if (this._borderVerticalWidths) {
      for (let i = 0, len = this._borderVerticalWidths.length; i < len; ++i) {
        // line width
        const bw = this._borderVerticalWidths[i]
        if (bw > 0) {
          if (borderWidth !== bw) {
            chunk += ops.w(bw)
            borderWidth = bw
          }

          // stroking color
          const bc = this._borderVerticalColors[i]
          if (!borderColor || !util.rgbEqual(borderColor, bc)) {
            chunk += ops.SC(bc[0], bc[1], bc[2])
            borderColor = bc
          }

          // fill path
          let x = left
          if (i === 0) {
            x += bw / 2
          } else if (i === len - 1) {
            x -= bw / 2
          }

          chunk += ops.S(x, y1, 'm', x, y2, 'l')
        }

        left += this._widths[i]
      }

      hasBorder = true
    }

    const totalWidth = this._widths.reduce((lhs, rhs) => lhs + rhs, 0)
    const x1 = this._cursor.startX
    const x2 = x1 + totalWidth

    if (this._hasTopBorder && this._topBorderWidth > 0) {
      this._hasTopBorder = false

      // line width
      if (borderWidth !== this._topBorderWidth) {
        chunk += ops.w(this._topBorderWidth)
        borderWidth = this._topBorderWidth
      }

      // stroking color
      if (!borderColor || !util.rgbEqual(borderColor, this._topBorderColor)) {
        chunk += ops.SC(this._topBorderColor[0], this._topBorderColor[1], this._topBorderColor[2])
        borderColor = this._topBorderColor
      }

      // fill path
      const y = y1 - this._topBorderWidth / 2
      chunk += ops.S(x1, y, 'm', x2, y, 'l')

      hasBorder = true
    }

    if (!isPageBreak && this._bottomBorderWidth > 0) {
      // line width
      if (borderWidth !== this._bottomBorderWidth) {
        chunk += ops.w(this._bottomBorderWidth)
        borderWidth = this._bottomBorderWidth
      }

      // stroking color
      if (!borderColor || !util.rgbEqual(borderColor, this._bottomBorderColor)) {
        chunk += ops.SC(this._bottomBorderColor[0], this._bottomBorderColor[1], this._bottomBorderColor[2])
        borderColor = this._bottomBorderColor
      }

      // fill path
      const y = y2 + this._bottomBorderWidth / 2
      chunk += ops.S(x1, y, 'm', x2, y, 'l')

      hasBorder = true
    }

    if (hasBorder) {
      chunk += ops.Q() // restore graphics state

      await this._doc._startContentObject(null, true)
      await this._doc._write(chunk)
    }
  }

  /// public API

  end() {
    if (this._columns !== this._widths.length) {
      if (this._columns > this._widths.length) {
        throw new Error(`Row has ${this.columns} cells but only ${this._widths.length} columns`)
      }

      // fill missing columns with empty cells
      for (let i = this.columns; i < this._widths.length; ++i) {
        this.cell()
      }
    }

    if (this._startRendering) {
      this._startRendering()
    }
    return Fragment.prototype.end.call(this)
  }

  cell(text, opts) {
    // normalize arguments
    if (text !== null && typeof text === 'object') {
      opts = text
      text = undefined
    }
    if (!opts || typeof opts !== 'object') {
      opts = {}
    }

    opts = Object.assign({}, this.opts, opts)

    // create cell and set cell's width according to row options
    const column = this._columns++
    if (!(column in this._widths)) {
      throw new Error('row columns already exceeded, cannot create another cell')
    }

    if (opts.colspan > 1) {
      for (let i = column + 1, len = column + opts.colspan; i < len; ++i) {
        if (!(i in this._widths)) {
          throw new Error('row columns already exceeded, colspan to big')
        }

        this._widths[column] += this._widths[i]
      }

      this._widths.splice(column + 1, opts.colspan - 1)

      if (this._borderVerticalWidths) {
        this._borderVerticalWidths.splice(column + 1, opts.colspan - 1)
      }
    }

    if (opts.minHeight > this._minHeight) {
      this._minHeight = opts.minHeight
    }

    // adjust cell padding to add enough space for borders
    if (this._borderVerticalWidths) {
      const borderWidthLeft = this._borderVerticalWidths[column]
      const borderWidthRight = this._borderVerticalWidths[column + 1]

      if (borderWidthLeft > 0) {
        if (column === 0) { // is first
          opts.borderLeftWidth = borderWidthLeft
        } else {
          opts.borderLeftWidth = borderWidthLeft / 2
        }
      }

      if (borderWidthRight > 0) {
        if (column === this._widths.length - 1) { // is last
          opts.borderRightWidth = borderWidthRight
        } else {
          opts.borderRightWidth = borderWidthRight / 2
        }
      }
    }

    if (this._hasTopBorder && this._topBorderWidth > 0) {
      opts.borderTopWidth = this._topBorderWidth
    }

    if (this._bottomBorderWidth > 0) {
      opts.borderBottomWidth = this._bottomBorderWidth
    }

    const ctx = new Cell(this._doc, this, Object.assign({}, opts, {
      width: this._widths[column]
    }))
    ctx._drawBorders = false

    this._begin(ctx)

    // move the cell to the right by the width of each previous cell
    for (let i = 0; i < column; ++i) {
      ctx._cursor.startX += this._widths[i] || 0
    }
    ctx._pending.push(() => ctx._start())

    // override cell's end logic, which is also postponed until the row ends
    ctx._end = endCell.bind(ctx, this)

    this._pending.push(ctx._pending)

    if (typeof text === 'string' && text.length > 0) {
      ctx.text(text, opts)
    }

    return ctx
  }
}

async function endCell(row) {
  // apply bottom padding
  this._cursor.y -= this.paddingBottom

  const height = this._startY - this._cursor.y
  if (height < this.opts.minHeight) {
    this._cursor.y -= this.opts.minHeight - height
  }

  // decrease the counter of active cells
  row._columns--

  // reset the parent property, to prevent endless recursion when the pageBreak handler of the
  // cell is called later on
  this._parent = null

  // keep track of the ended cell
  row._endedCells.push(this)

  // if, last row has been ended, trigger page break manually to continue with other cells on
  // the next page
  if (row._columns > 0 && row._rotated === row._columns) {
    // TODO: level hardcoded?
    await row._pageBreak(2, row._insideBreak)
  }

  // keep track of the ending y which is nearest to the page end
  if (row._endY === null || this._cursor.y < row._endY) {
    row._endY = this._cursor.y
  }

  this._endLayerRef = this._doc._currentContent

  // move to the next cell
  row._nextColumn()
}
