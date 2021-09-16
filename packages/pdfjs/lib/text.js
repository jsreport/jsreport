'use strict'

const Fragment = require('./fragment')
const LineBreaker = require('@rkusa/linebreak')
const unorm = require('unorm')
const ops = require('./ops')
const util = require('./util')
const Font = require('./font/base')
const PDF = require('./object')

const UNDERLINE_FLAG = 1
const STRIKETHROUGH_FLAG = 2

const Text = module.exports = class Text extends Fragment {
  constructor(doc, parent, opts) {
    super(doc, parent)

    this._line = []
    this._spaceLeft = 0
    this._parts = 0
    this._isFirstLine = true
    this._isNewLine = true

    this._previousFont = null
    this._previousFontSize = null
    this._previousColor = null

    this._previousHeight = 0
    this._previousDescent = 0

    this.defaultFont = opts.font || this._doc.defaultFont
    this.defaultFontSize = opts.fontSize || this._doc.defaultFontSize
    this.defaultColor = opts.color && util.colorToRgb(opts.color) || this._doc.defaultColor
    this.defaultLineHeight = opts.lineHeight || this._doc.defaultLineHeight
    this.defaultDecoration = (opts.underline ? UNDERLINE_FLAG : 0) | (opts.strikethrough ? STRIKETHROUGH_FLAG : 0)

    this.alignment = opts.alignment || opts.textAlign || 'left'

    this.link = opts.link
    this.destination = opts.destination
    this.goTo = opts.goTo
  }

  /// private API

  async _start() {
    if (!this._doc._currentContent) {
      await this._doc._startPage()
    }

    this._spaceLeft = this._cursor.width
  }

  async _end() {
    // write end text
    await this._doc._write(ops.ET())
  }

  async _render(text, opts) {
    this._parts--

    if (!Font.isFont(opts.font || this.defaultFont)) {
      throw new TypeError('invalid font: ' + font)
    }

    const font = this._doc._fontInstance(opts.font || this.defaultFont)
    const fontSize = opts.fontSize || this.defaultFontSize
    const color = opts.color && util.colorToRgb(opts.color) || this.defaultColor
    const lineHeight = opts.lineHeight || this.defaultLineHeight
    const link = opts.link || this.link
    const destination = opts.destination || this.destination
    const goTo = opts.goTo || this.goTo
    const decoration = this.defaultDecoration | (opts.underline ? UNDERLINE_FLAG : 0) | (opts.strikethrough ? STRIKETHROUGH_FLAG : 0)

    // enforce string
    text = String(text)
    text = text.replace(/\r\n/g, '\n')
               .replace(/\u2028|\u2029/g, '') // <- TODO: does this break things?

    const breaker = new LineBreaker(text)
    let last = 0, bk

    const isLastTextChunk = this._parts === 0 && this._ended
    let postponeLinebreak = false
    let nextWord = null

    while (nextWord !== null || postponeLinebreak || (bk = breaker.nextBreak()) || (isLastTextChunk && this._line.length > 0)) {
      let word = null

      if (nextWord) {
        word = nextWord
        nextWord = null
      }
      // when there is no break, there is an orphan word that just has to be rendered,
      // i.e., skip to the line rendering
      else if (bk) {
        let until = bk.position

        const lastIsSpace = text[bk.position - 1].match(/\s/)
        if (lastIsSpace) {
          until--
        }

        // get the string between the last break and this one
        word = text.slice(last, until)

        // separate words, if has whitespace, is at the end of the text or
        // ends with a whitespace
        if (bk.position === text.length || lastIsSpace) {
          last = bk.position
        } else {
          continue
        }

        word = unorm.nfc(word)
      }

      let wordWidth = 0
      let offsetWidth = 0
      let spaceWidth = 0

      if (word) {
        wordWidth = font.stringWidth(word, fontSize)
        offsetWidth = wordWidth.width
        spaceWidth = font.stringWidth(' ', fontSize).width

        // add whitespace length for every word, except the first on in the line
        // on the first line, during the first word the line array is empty, however, for succeeding
        // lines the line array already contains the word that did not fit into the previous line
        if (this._line.length > (this._isNewLine ? 0 : 1)) {
          offsetWidth += spaceWidth
        }
      }

      // render line if there is a line break, if we hit the last word of the text, if we
      // have manual page breaks, or if there is not enough space on the line left
      const isLastWord = (!bk || bk.position === text.length) && isLastTextChunk
      const notEnoughSpace = this._spaceLeft < offsetWidth
      if (postponeLinebreak || (bk && bk.required) || isLastWord || notEnoughSpace) {
        // if word is longer than one line
        if (this._line.length === 0 && notEnoughSpace) {
          // split word
          for (let i = word.length - 1; i >= 0; --i) {
            const w = font.stringWidth(word.slice(i), fontSize)

            if (this._spaceLeft >= offsetWidth - w.width) {
              const subword = word.slice(0, i)
              this._line.push(
                new TextChunk({
                  wordWidth: font.stringWidth(subword, fontSize),
                  spaceWidth, word: subword,
                  font, fontSize, color, decoration,
                  link, destination, goTo
                })
              )
              offsetWidth -= w.width
              this._spaceLeft -= offsetWidth

              nextWord = word.slice(i)
              word = null

              break
            }
          }
        }

        // if there is enough space, add word to the current line
        if (!postponeLinebreak && word && (this._spaceLeft - offsetWidth) >= 0) {
          this._line.push(
            new TextChunk({
              wordWidth, spaceWidth, word, font, fontSize,
              color, decoration,
              link, destination, goTo
            })
          )
          this._spaceLeft -= offsetWidth
          word = null
        }

        // render line
        let left = this._cursor.x

        // calc max line height
        let height = 0
        let descent = 0

        for (const w of this._line) {
          const h = w.font.lineHeight(w.fontSize, true)
          if (h > height) {
            height = h
          }

          const d = -w.font.descent(w.fontSize)
          if (d > descent) {
            descent = d
          }
        }

        height *= lineHeight
        descent *= lineHeight

        if (height === 0) {
          height = this._previousHeight
          descent = this._previousDescent
        }

        // break page if necessary
        if (!this._cursor.doesFit(height)) {
          if (!this._isFirstLine) {
            await this._doc._write(ops.ET())
          }

          // execute page break
          // add remaining text as new text to the queue of pending operations
          const remainingText = bk ? ((word ? (word + ' ') : '') + text.substring(bk.position)) : ''
          this._pending.unshift(() => {
            this._parts++
            return this._render(remainingText, opts)
          })

          await this._parent._pageBreak(1)

          this._isFirstLine = true
          this._isNewLine = true
          this._previousFont = null
          this._previousFontSize = null
          this._previousColor = null

          break
        }

        // shift cursor; since rendering is done above the y coordinate,
        // we have to update the cursor before rendering the line
        this._cursor.y -= height // shift y cursor

        // calculate remaining space
        const freeSpace = this._spaceLeft

        // alignment
        let spacing = 0
        switch (this.alignment) {
        case 'right':
          left += freeSpace
          break
        case 'center':
          left += this._cursor.width / 2 - (this._cursor.width - freeSpace) / 2
          break
        case 'justify':
          const isLastLine = isLastWord || (bk && bk.required)
          if (isLastLine && freeSpace / this._cursor.width > .2) {
            break
          }
          if (this._line.length > 1) {
            spacing = freeSpace / (this._line.length - 1)
          }
          break
        }

        // render words
        let chunk = ''

        if (this._isFirstLine) {
          this._previousHeight = height
          chunk += ops.BT()
                // set initial pos
                + ops.Tm(1, 0, 0, 1, left, this._cursor.y)
                // set leading
                + ops.TL(this._previousHeight)
        } else {
          const lh = height + this._previousDescent

          if (height > 0 && lh !== this._previousHeight) {
            this._previousHeight = lh
            chunk += ops.TL(lh)
          }

          if (left > this._cursor.x) {
            // set new x and y position
            chunk += ops.Tm(1, 0, 0, 1, left, this._cursor.y)
          } else {
            // move to next line
            chunk += ops.Tstar()
          }
        }

        if (height > 0) {
          this._previousDescent = descent
        }

        const out = []

        const rangeStyleArgs = [this._doc, left, this._cursor.y, height, spacing]
        const underlineStyle = new UnderlineRangeStyle(...rangeStyleArgs)
        const strikethroughStyle = new StrikethroughRangeStyle(...rangeStyleArgs)
        const linkStyle = new LinkRangeStyle(...rangeStyleArgs)
        const destinationStyle = new DestinationRangeStyle(...rangeStyleArgs)
        const goToStyle = new GoToRangeStyle(...rangeStyleArgs)

        const lastIx = this._line.length - 1
        for (let i = 0; i < this._line.length; ++i) {
          const w = this._line[i]

          const fontStyleChanged = w.font !== this._previousFont || w.fontSize !== this._previousFontSize
          const colorChanged = !util.rgbEqual(w.color, this._previousColor)

          chunk += underlineStyle.applyStyle(w, i === lastIx, fontStyleChanged || colorChanged)
          chunk += strikethroughStyle.applyStyle(w, i === lastIx, fontStyleChanged || colorChanged)
          chunk += linkStyle.applyStyle(w, i === lastIx, fontStyleChanged || colorChanged)
          chunk += destinationStyle.applyStyle(w, i === lastIx, fontStyleChanged || colorChanged)
          chunk += goToStyle.applyStyle(w, i === lastIx, fontStyleChanged || colorChanged)

          if (fontStyleChanged || colorChanged) {
            if (out.length > 0) {
              chunk += ops.TJ(out)
            }

            if (fontStyleChanged) {
              this._previousFont = w.font
              this._previousFontSize = w.fontSize

              const alias = this._doc._fontAlias(w.font)

              // set font and font size
              chunk += ops.Tf(alias, w.fontSize)
            }

            // set color if it has changed
            if (colorChanged) {
              this._previousColor = w.color
              chunk += ops.sc(...w.color)
            }

            out.length = 0
          }

          const kerning = w.wordWidth.kerning
          if (kerning.length > 0) {
            let pos = 0
            for (let i = 0; i < kerning.length; ++i) {
              let subword = w.word.substring(pos, kerning[i].pos)
              out.push(w.font.encode(subword), kerning[i].offset)
              pos = kerning[i].pos
            }
            out.push(w.font.encode(w.word.substring(pos)))
          } else {
            out.push(w.font.encode(w.word))
          }

          if (i < this._line.length - 1 && w.spaceWidth > 0) {
            // if is not last and has spaceWidth set
            out.push(calcSpaceWidth(spacing, w.font, w.fontSize))
          }
        }
        if (out.length > 0) {
          chunk += ops.TJ(out)
        }

        await this._doc._write(chunk)

        this._cursor.y -= descent

        // reset / update variables
        this._spaceLeft = this._cursor.width
        this._line.length = 0 // empty line array
        this._isFirstLine = false
        this._isNewLine = bk && bk.required

        postponeLinebreak = bk && bk.required && word !== null && word.length > 0
      }

      // consider word for next line
      if (word) {
        this._line.push(
          new TextChunk({
            wordWidth, spaceWidth, word, font, fontSize,
            color, decoration,
            link, destination, goTo
          })
        )

        this._spaceLeft -= offsetWidth
      }

      bk = null
    }
  }

  /// public API

  add(text, opts) {
    this._begin(null) // trigger error, if text is already ended
    this._parts++
    this._pending.push(() => this._render(text, opts || {}))

    return this
  }

  append(text, opts) {
    this._begin(null) // trigger error, if text is already ended

    this._parts++
    this._pending.push(() => {
      if (this._line.length > 0) {
        const w = this._line[this._line.length - 1]
        this._spaceLeft += w.spaceWidth
        w.spaceWidth = 0 // set space width to zero
      }
      return this._render(text, opts || {})
    })

    return this
  }

  br() {
    this._begin(null) // trigger error, if text is already ended

    this._parts++
    this._pending.push(() => this._render('\n\n', {}))

    return this
  }
}

function calcSpaceWidth(spacing, font, fontSize) {
  const scaleFactor = 1000 / fontSize
  return -(spacing + font.stringWidth(' ', fontSize)) * scaleFactor
}

class TextChunk {
  constructor(values) {
    this.wordWidth = values.wordWidth
    this.spaceWidth = values.spaceWidth
    this.word = values.word
    this.font = values.font
    this.fontSize = values.fontSize
    this.color = values.color
    this.decoration = values.decoration
    this.link = values.link
    this.destination = values.destination
    this.goTo = values.goTo
  }
}

class RangeStyle {
  constructor(doc, x, y, height, spacing) {
    this.doc = doc
    this.from = x
    this.width = 0
    this.y = y
    this.height = height
    this.spacing = spacing
    this.isActive = false
    this.lastSpaceWidth = 0
  }

  applyStyle(textChunk, isLast, fontStyleChanged) {
    const shouldApply = this._active(textChunk)
    let chunk = ''

    if (shouldApply && !fontStyleChanged && this.isActive) {
      this.width += this.lastSpaceWidth
    }

    if (this.isActive && (!shouldApply || fontStyleChanged)) {
      chunk += this._applyStyle(textChunk)
      this.from += this.width + this.lastSpaceWidth
      this.width = 0
    }

    if ((!this.isActive || shouldApply) || this.isActive && fontStyleChanged) {
      this._start(textChunk)
    }

    this.isActive = shouldApply
    this.lastSpaceWidth = this.spacing || textChunk.spaceWidth
    if (this.isActive) {
      this.width += textChunk.wordWidth
    } else {
      this.from += textChunk.wordWidth + this.lastSpaceWidth
    }

    if (this.isActive && isLast) {
      chunk += this._applyStyle(textChunk)
    }

    return chunk
  }

  _active(textChunk) {
    // abstract
  }

  _start(textChunk) {
    // abstract
  }

  _applyStyle(textChunk) {
    // abstract
  }
}

class UnderlineRangeStyle extends RangeStyle {
  constructor(doc, x, y, height, spacing) {
    super(doc, x, y, height, spacing)
    this.underlinePosition = 0
    this.underlineThickness = 0
    this.color = null
  }

  _active(textChunk) {
    return textChunk.decoration & UNDERLINE_FLAG
  }

  _start(textChunk) {
    this.underlinePosition = textChunk.font.underlinePosition(textChunk.fontSize)
    this.underlineThickness = textChunk.font.underlineThickness(textChunk.fontSize)
    this.color = textChunk.color
  }

  _applyStyle(textChunk) {
    const y = this.y + this.underlinePosition
    return ops.w(this.underlineThickness)  // line width
         + ops.SC(...this.color) // stroking color
         + ops.S(this.from, y, 'm', this.from + this.width, y, 'l') // line
  }
}

class StrikethroughRangeStyle extends RangeStyle {
  constructor(doc, x, y, height, spacing) {
    super(doc, x, y, height, spacing)
    this.ascent = 0
    this.lineThickness = 0
    this.color = null
  }

  _active(textChunk) {
    return textChunk.decoration & STRIKETHROUGH_FLAG
  }

  _start(textChunk) {
    this.ascent = textChunk.font.ascent(textChunk.fontSize)
    this.lineThickness = textChunk.font.underlineThickness(textChunk.fontSize)
    this.color = textChunk.color
  }

  _applyStyle(textChunk) {
    const y = this.y + this.ascent * .35
    return ops.w(this.lineThickness)  // line width
         + ops.SC(...this.color) // stroking color
         + ops.S(this.from, y, 'm', this.from + this.width, y, 'l') // line
  }
}

class LinkRangeStyle extends RangeStyle {
  constructor(doc, x, y, height, spacing) {
    super(doc, x, y, height, spacing)
    this.link = null
  }

  applyStyle(textChunk, isLast, fontStyleChanged) {
    if (this.link && textChunk.link !== this.link) {
      fontStyleChanged = true
    }
    return RangeStyle.prototype.applyStyle.call(this, textChunk, isLast, fontStyleChanged)
  }

  _active(textChunk) {
    return textChunk.link !== undefined
  }

  _start(textChunk) {
    this.link = textChunk.link
  }

  _applyStyle(textChunk) {
    this.doc._annotations.push(new PDF.Dictionary({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: new PDF.Array([this.from, this.y, this.from + this.width, this.y + this.height]),
      Border: new PDF.Array([0, 0, 0]),
      A: new PDF.Dictionary({
        Type: 'Action',
        S: 'URI',
        URI: new PDF.String(this.link),
      }),
    }))
    return ''
  }
}

class DestinationRangeStyle extends RangeStyle {
  constructor(doc, x, y, height, spacing) {
    super(doc, x, y, height, spacing)
    this.destination = null
  }

  applyStyle(textChunk, isLast, fontStyleChanged) {
    if (this.destination && textChunk.destination !== this.destination) {
      fontStyleChanged = true
    }
    return RangeStyle.prototype.applyStyle.call(this, textChunk, isLast, fontStyleChanged)
  }

  _active(textChunk) {
    return textChunk.destination !== undefined
  }

  _start(textChunk) {
    this.destination = textChunk.destination
  }

  _applyStyle(textChunk) {
    this.doc._destinations.set(this.destination, new PDF.Array([
      this.doc._currentPage.toReference(),
      new PDF.Name('XYZ'),
      this.from,
      this.y,
      null,
    ]))
    return ''
  }
}

class GoToRangeStyle extends RangeStyle {
  constructor(doc, x, y, height, spacing) {
    super(doc, x, y, height, spacing)
    this.goTo = null
  }

  applyStyle(textChunk, isLast, fontStyleChanged) {
    if (this.goTo && textChunk.goTo !== this.goTo) {
      fontStyleChanged = true
    }
    return RangeStyle.prototype.applyStyle.call(this, textChunk, isLast, fontStyleChanged)
  }

  _active(textChunk) {
    return textChunk.goTo !== undefined
  }

  _start(textChunk) {
    this.goTo = textChunk.goTo
  }

  _applyStyle(textChunk) {
    this.doc._annotations.push(new PDF.Dictionary({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: new PDF.Array([this.from, this.y, this.from + this.width, this.y + this.height]),
      Border: new PDF.Array([0, 0, 0]),
      A: new PDF.Dictionary({
        S: 'GoTo',
        D: new PDF.String(this.goTo),
      }),
    }))
    return ''
  }
}

Text.DestinationRangeStyle = DestinationRangeStyle
