const fs = require('fs')
const path = require('path')

// thanks to https://github.com/prawnpdf/prawn
const CODE_TO_NAME = fs.readFileSync(
  path.join(__dirname, 'winansi_characters.txt'),
  'utf8'
).split(/\s+/)

const NAME_TO_CODE = {}
CODE_TO_NAME.forEach((v, k) => NAME_TO_CODE[v] = k)

const files = fs.readdirSync(__dirname)
for (const filename of files) {
  if (path.extname(filename) !== '.afm') {
    continue
  }

  const data = fs.readFileSync(path.join(__dirname, filename), 'utf8')

  const properties = {}
  const glyphWidths = {}
  const kerning = {}

  const lines = data.split('\r\n')
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i]
    const match = line.match(/^([A-Z]\w+)\s+(.*)/)
    if (!match) {
      continue
    }

    const key = match[1][0].toLowerCase() + match[1].slice(1)
    const val = match[2]

    switch (key) {
    case 'startCharMetrics':
      const metrics = lines.splice(i + 1, parseInt(val))

      metrics.forEach(function(metric) {
        const name = metric.match(/\bN\s+(\.?\w+)\s*;/)[1]
        glyphWidths[name] = parseInt(metric.match(/\bWX\s+(\d+)\s*;/)[1], 10)
      })
      // C 32 ; WX 278 ; N space ; B 0 0 0 0 ;

      break

    case 'startKernPairs':
      const pairs = lines.splice(i + 1, parseInt(val))

      for (const pair of pairs) {
        // KPX o comma -40
        const values = pair.split(' ')
        const left = NAME_TO_CODE[values[1]]
        const right = NAME_TO_CODE[values[2]]

        if (left === undefined || right === undefined) {
          continue
        }

        if (!kerning[left]) {
          kerning[left] = {}
        }

        kerning[left][right] = parseFloat(values[3], 10)
      }

      break

    // number
    case 'capHeight':
    case 'xHeight':
    case 'ascender':
    case 'descender':
    case 'italicAngle':
    case 'underlinePosition':
    case 'underlineThickness':
      properties[key] = parseFloat(val, 10)
      break

    // number array
    case 'fontBBox':
      properties[key] = val.split(/\s+/g)
        .filter(v => v !== '')
        .map(v => parseFloat(v, 10))
      break

    // string
    case 'fontName':
    case 'fullName':
    case 'familyName':
    case 'characterSet':
      properties[key] = val
      break

    // ignore other properties
    default:
      // console.log('property', key, 'ignored')
      break
    }
  }

  properties.kerning = kerning

  const widths = new Array(256)
  for (let i = 0; i < 256; ++i) {
    widths[i] = glyphWidths[CODE_TO_NAME[i]]
  }

  properties.widths = widths

  const basename = path.basename(filename, '.afm')

  fs.writeFileSync(
    path.join(__dirname, '../', basename + '.json'),
    JSON.stringify(properties),
    { encoding: 'utf8' }
  )

  fs.writeFileSync(
    path.join(__dirname, '../', basename + '.js'),
    `const AFMFont = require('../lib/font/afm')\n` +
    `module.exports = new AFMFont(require('./${basename}.json'))`,
    { encoding: 'utf8' }
  )

  // console.log(widths)
  // console.log(properties)
  // console.log(kerning)
}
