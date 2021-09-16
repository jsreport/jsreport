'use strict'

class Cursor {
  constructor(width, height, x, y) {
    this.width = width
    this.height = height
    if (x !== undefined) {
      this.startX = this.x = x
    }
    if (y !== undefined) {
      this.startY = this.y = y
      this._bottom = this.y - this.height
    }
    this.bottomOffset = 0
  }

  /// public API

  get bottom() {
    return this._bottom + this.bottomOffset
  }

  reset() {
    this.x = this.startX
    this.y = this.startY
  }

  doesFit(height) {
    return (this.y - height) >= this.bottom
  }

  clone() {
    return new ClonedCursor(this)
  }
}

// A ClonedCursor has its own `width`, `height`, `bottom`, `startX` and `startY`, but shares
// `x` and `y` with all other Cursors and ClonedCursors.
class ClonedCursor extends Cursor {
  constructor(cursor) {
    super(cursor.width, cursor.height)
    this.startX = cursor.startX
    this.startY = cursor.startY
    this.bottomOffset = 0
    this._root = cursor._root || cursor
  }

  /// public API

  get bottom() {
    return this._root.bottom + this.bottomOffset
  }

  get x() {
    return this._root.x
  }

  set x(val) {
    if (val < 0) {
      console.warn('set cursor.x to negative value')
    }
    this._root.x = val
  }

  get y() {
    return this._root.y
  }

  set y(val) {
    if (val < 0) {
      console.warn('set cursor.y to negative value')
    }
    this._root.y = val
  }
}

module.exports = Cursor
