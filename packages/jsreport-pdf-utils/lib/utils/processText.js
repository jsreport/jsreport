// remove hidden tags like group@@@
// find form@@@ and create pdf widgets

const CMapFactory = require('pdfjs-dist/lib/core/cmap.js').CMapFactory
const StringStream = require('pdfjs-dist/lib/core/stream.js').StringStream
const unicode = require('pdfjs-dist/lib/core/unicode')
const zlib = require('zlib')
const FormsProcessor = require('./formsProcessor')
const HIDDEN_TEXT_SIZE = 1.1
const normalizedUnicodes = unicode.getNormalizedUnicodes()

function chunkArray (myArray, chunkSize) {
  let index = 0
  const arrayLength = myArray.length
  const tempArray = []

  for (index = 0; index < arrayLength; index += chunkSize) {
    const myChunk = myArray.slice(index, index + chunkSize)
    tempArray.push(myChunk)
  }

  return tempArray
}

const groupBy = function (xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x)
    return rv
  }, {})
}

function getAllIndexes (arr, marks) {
  const indexes = []
  for (const mark of marks) {
    let i = -1
    while ((i = arr.indexOf(`${mark}@@@`, i + 1)) !== -1) {
      indexes.push({
        start: i,
        end: arr.indexOf('@@@', i + `${mark}@@@`.length) + '@@@'.length
      })
    }
  }

  return indexes
}

async function createCMap (stream) {
  const cmap = await CMapFactory.create({
    encoding: stream
  })

  const map = new Array(cmap.length)

  cmap.forEach(function (charCode, token) {
    const str = []
    for (let k = 0; k < token.length; k += 2) {
      const w1 = token.charCodeAt(k) << 8 | token.charCodeAt(k + 1)
      if ((w1 & 0xF800) !== 0xD800) {
        str.push(w1)
        continue
      }
      k += 2
      const w2 = token.charCodeAt(k) << 8 | token.charCodeAt(k + 1)
      str.push(((w1 & 0x3ff) << 10) + (w2 & 0x3ff) + 0x10000)
    }
    map[charCode] = String.fromCharCode.apply(String, str)
  })
  return map
}

async function processStream (doc, streamObject, { page, pages, pageIndex, cmapCache, formsProcessor, removeHiddenMarks, hiddenPageFields }) {
  // we just support known structures chrome produces
  if (!streamObject.object.properties.get('Filter')) {
    return
  }

  if (streamObject.object.properties.get('Filter').name !== 'FlateDecode') {
    return
  }

  // optimize and don't go into images
  if (streamObject.object.properties.get('Subtype') && streamObject.object.properties.get('Subtype').name === 'Image') {
    return
  }

  const lines = zlib.unzipSync(streamObject.content).toString('latin1').split('\n')

  const matrixesStack = []
  let currentMatrix
  let currentPosition
  let currentFontRef
  let text = ''
  const details = []
  // let originalMatrix
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]

    // do is an xobject reference, the xobject can also contain the text we want process so we go in with recursion
    if (line.endsWith('Do')) {
      // we just support known structures chrome produces
      // all kind of things can go wrong here when processing output of static pdf or from phantomjs..
      let xobjectContent
      let xobjectObject
      try {
        const xObjectRef = line.split(' ')[0].substring(1)
        const xObject = page.properties.get('Resources').get('XObject').get(xObjectRef)
        xobjectContent = xObject.object.content
        xobjectObject = xObject.object
      } catch (e) {
        continue
      }
      await processStream(doc, xobjectContent, {
        page: xobjectObject,
        pages,
        pageIndex,
        cmapCache,
        formsProcessor,
        removeHiddenMarks,
        hiddenPageFields
      })
    }

    // font reference for text parsing
    if (line.endsWith('Tf')) {
      currentFontRef = line.split(' ')[0].substring(1)
    }

    // the pdf content stream with text typically looks like this
    // .239 0 0 -.239 0 792 cm
    // 3.125 0 0 3.125 0 116.666672 cm
    // 1 0 0 -1 43.984375 9 Tm
    // <0036005800550051004400500048> Tj

    // The cm instructions changes the current matrix for positioning and transformation
    // sx 0 0 sy tx ty cm
    // sxy is the scale how much are elements inside resized, with negative value rotated
    // txy is the matrix 0 point translate
    if (line.endsWith('cm')) {
      const matrix = line.split(' ').slice(0, -1).map(n => parseFloat(n))
      if (currentMatrix == null) {
        currentMatrix = matrix
      } else {
        currentMatrix = [...currentMatrix]
        // the position translate is calculated firt, based on the current scale values
        currentMatrix[4] = currentMatrix[4] + (matrix[4] * currentMatrix[0])
        currentMatrix[5] = currentMatrix[5] + (matrix[5] * currentMatrix[3])
        // the scale update for furure calculation
        currentMatrix[0] = currentMatrix[0] * matrix[0]
        currentMatrix[3] = currentMatrix[3] * matrix[3]
      }
    }

    // text position so we know where to put form input
    if (line.endsWith('Tm')) {
      if (currentMatrix) {
        const matrix = line.split(' ').slice(0, -1).map(n => parseFloat(n))

        currentPosition = [0, 0, 0, 0, 0, 0]
        currentPosition[4] = currentMatrix[4] + (matrix[4] * currentMatrix[0])
        currentPosition[5] = currentMatrix[5] + (matrix[5] * currentMatrix[3]) - (HIDDEN_TEXT_SIZE * currentMatrix[3])
        currentPosition[0] = matrix[0] * currentMatrix[0]
        currentPosition[3] = matrix[3] * currentMatrix[3]
      }
    }

    if (line.endsWith('q')) {
      matrixesStack.push(currentMatrix)
    }

    if (line.endsWith('Q')) {
      currentMatrix = matrixesStack.pop()
    }

    // the actual text represented in 4 hex chars for every character
    // the hex chars are references to the cmap where we get actual char code
    if (line.endsWith('Tj')) {
      // somehow the line can contain something like this
      // .546875 0 Td <0056> Tj
      // and I want just the Tj, don't know what is the previous part
      const trimStart = line.indexOf('<')
      const trimedLine = line.substring(trimStart)

      let cmap
      // we just support known structures chrome produces
      // all kind of things can go wrong here when processing output of static pdf or from phantomjs..
      let cmapContentStr
      try {
        const cmapStream = page.properties.get('Resources').get('Font').get(currentFontRef).object.properties.get('ToUnicode').object
        cmap = cmapCache.get(cmapStream)
        if (cmap == null) {
          cmapContentStr = zlib.unzipSync(cmapStream.content.content).toString('latin1')
          const stream = new StringStream(cmapContentStr)
          cmap = await createCMap(stream)
          cmapCache.set(cmapStream, cmap)
        }
      } catch (e) {
        continue
      }

      const hexes = trimedLine.split(' ')[0].replace(/</g, '').replace(/>/g, '')

      let charIndex = trimStart + 1
      for (const charSeq of chunkArray(hexes, 4)) {
        const ch = cmap[parseInt(charSeq, 16)]
        if (ch == null) {
          continue
        }

        if (normalizedUnicodes[ch] !== undefined) {
          // chrome sometimes, like in alpine linux, puts double ff into single char ligerature
          const chars = normalizedUnicodes[ch]
          text += chars
          for (const char of chars) {
            details.push({ lineIndex, charIndex, ch: char, position: currentPosition, length: charSeq.length })
          }
        } else {
          text += ch
          details.push({ lineIndex, charIndex, ch, position: currentPosition, length: charSeq.length })
        }

        charIndex += 4
      }
    }
  }

  const indexes = getAllIndexes(text, removeHiddenMarks ? ['group', 'item', 'form'] : ['form'])

  if (indexes.length === 0) {
    return
  }

  const removeLines = []
  for (const index of indexes) {
    const detailsToProcess = details.slice(index.start, index.end)

    if (detailsToProcess.length > 0) {
      const text = detailsToProcess.map(d => d.ch).join('')
      if (text.includes('form@@@')) {
        const trimmedText = text.substring('form@@@'.length, text.length - '@@@'.length)
        const valueOfText = hiddenPageFields[trimmedText]
        if (valueOfText != null) {
          await formsProcessor({
            doc,
            text: valueOfText,
            position: detailsToProcess[0].position,
            page: pages[pageIndex].object,
            hiddenPageFields
          })
        } else {
          console.warn(`Unable to find form element ${trimmedText} information on context, skipping`)
        }
      }
    }

    // now we remove the text from stream
    const detailsByLines = groupBy(detailsToProcess, 'lineIndex')

    for (let lineIndex in detailsByLines) {
      lineIndex = parseInt(lineIndex)
      const lineDetails = detailsByLines[lineIndex]
      let line = lines[lineIndex]
      line = line.substring(0, lineDetails[0].charIndex) +
             // somehow the cusom font uses just 2 hex chars instead of 4, don't get this
             // the solution here is likely buggy
             line.substring(lineDetails[lineDetails.length - 1].charIndex + lineDetails[lineDetails.length - 1].length)
      if (line.includes('<>')) {
        removeLines.push(lineIndex)
      } else {
        lines[lineIndex] = line
      }
    }
  }

  const filteredLines = lines.filter((l, i) => removeLines.find(ri => ri === i) == null)

  streamObject.content = zlib.deflateSync(filteredLines.join('\n'))
  streamObject.object.prop('Length', streamObject.content.length)
}

module.exports = async (doc, ext, {
  removeHiddenMarks,
  hiddenPageFields
}) => {
  const formsProcessor = FormsProcessor(doc, ext)
  let pageIndex = 0
  try {
    for (const page of ext.pages.get('Kids')) {
      const pageObject = page.object
      const streamObject = pageObject.properties.get('Contents').object.content
      await processStream(doc, streamObject, {
        page: pageObject,
        pages: ext.pages.get('Kids'),
        pageIndex,
        cmapCache: new Map(),
        formsProcessor,
        removeHiddenMarks,
        hiddenPageFields
      })
      pageIndex++
    }
  } catch (e) {
    if (e.isFormError) {
      throw e
    }

    console.warn('pdf utils failed to remove the hidden marks from pdf, this has no significant impact, but please report the issue.', e)
  }
}
