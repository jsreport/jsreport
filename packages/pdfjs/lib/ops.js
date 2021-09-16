'use strict'

const PDFString = require('./object/string')

const precision = 3

// low level PDF operations
module.exports = {
  BT() {
    return this.write('BT')
  },

  ET() {
    return this.write('ET')
  },

  Tf(font, size) {
    return this.write(font, size, 'Tf')
  },

  // use SC instead
  // rg(r, g, b) {
  //   return this.write(r, g, b, 'rg')
  // },

  Tm(a, b, c, d, e, f) {
    return this.write(a, b, c, d, e, f, 'Tm')
  },

  Tj(str, asHex) {
    return this.write(str, 'Tj')
  },

  TJ(arr) {
    return this.write('[' + arr.map(v => {
      if (typeof v === 'number') {
        return this.toFixed(v, precision)
      } else {
        return v
      }
    }).join(' ') + ']', 'TJ')
  },

  Td(x, y) {
    return this.write(x, y, 'Td')
  },

  // set the current color space to use for stroking operations
  CS(name) {
    return this.write(name, 'CS')
  },

  // same as CS but used for nonstroking operations.
  cs(name) {
    return this.write(name, 'cs')
  },

  // set the color to use for stroking operations
  SC(c1, c2, c3) {
    return this.write(c1, c2, c3, 'SC')
  },

  // same as SC but used for nonstroking operations.
  sc(c1, c2, c3) {
    return this.write(c1, c2, c3, 'sc')
  },

  // modify the current transformation matrix
  // translate: [ 1 0 0 1 x y ]
  // scale:     [ x 0 0 y 0 0 ]
  // rotate:    [ cosθ sinθ −sinθ cosθ 0 0 ]
  cm(a, b, c, d, e, f) {
    return this.write(a, b, c, d, e, f, 'cm')
  },

  // save the current graphics state on the graphics state stack
  q() {
    return this.write('q')
  },

  // restore the graphics state by removing the most recently saved state from the stack
  Q() {
    return this.write('Q')
  },

  // append a rectangle to the current path as a complete subpath
  re(x, y, width, height) {
    return this.write(x, y, width, height, 're')
  },

  // fill the path
  f() {
    return this.write('f')
  },

  // set the text leading (used by T*)
  TL(leading) {
    return this.write(leading, 'TL')
  },

  // T* move to the start of the next line, same as: 0 leading Td
  Tstar() {
    return this.write('T*')
  },

  // paint xobject
  Do(alias) {
    return this.write(alias, 'Do')
  },

  // line width
  w(lineWidth) {
    return this.write(lineWidth, 'w')
  },

  // stroke the path
  S() {
    const args = Array.prototype.slice.call(arguments)
    args.push('S')
    return this.write.apply(this, args)
  },

  write() {
    const line = Array.prototype.map.call(arguments, arg => {
      if (arg === undefined || arg === null) {
        console.warn('received an undefined/null operation argument')
      }
      // TODO: use precision option
      return typeof arg === 'number' ? this.toFixed(arg, precision) : arg
    })
    return line.join(' ') + '\n'
  },

  toFixed(num, precision) {
    return (+(Math.floor(+(num + 'e' + precision)) + 'e' + -precision)).toFixed(precision)
  },
}
