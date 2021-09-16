const PDF = require('@jsreport/pdfjs/lib/object')
const parseColor = require('parse-color')

module.exports = (doc, ext) => {
  return function processForm ({
    doc,
    text,
    position,
    page
  }) {
    try {
      doc._acroFormObj.prop('NeedAppearances', true)
      doc._acroFormObj.prop('DR', new PDF.Dictionary({
        Font: new PDF.Dictionary()
      }))

      const formSpec = JSON.parse(Buffer.from(text, 'base64').toString())

      const annotsObj = new PDF.Object('Annot')
      doc._registerObject(annotsObj)
      doc._acroFormObj.prop('Fields', new PDF.Array([...doc._acroFormObj.properties.get('Fields'), annotsObj.toReference()]))

      annotsObj.prop('Subtype', 'Widget')
      annotsObj.prop('T', new PDF.String(formSpec.name))
      annotsObj.prop('F', 4)
      annotsObj.prop('P', page.toReference())

      processValue(formSpec, annotsObj)
      processBorder(formSpec, annotsObj)
      processText(formSpec, annotsObj, doc)
      processBackgroundColor(formSpec, annotsObj)
      processLabel(formSpec, annotsObj)
      processTextAlign(formSpec, annotsObj)
      processType(formSpec, annotsObj)
      processFlags(formSpec, annotsObj)
      processFormat(formSpec, annotsObj)
      processRectangle(formSpec, annotsObj, position)

      if (page.properties.get('Annots')) {
        page.properties.get('Annots').push(annotsObj.toReference())
      } else {
        page.prop('Annots', new PDF.Array([annotsObj.toReference()]))
      }
    } catch (e) {
      e.isFormError = true
      throw e
    }
  }
}

function processRectangle (formSpec, annotation, position) {
  const dimension = [
    position[4],
    position[5] - (formSpec.height * position[3]),
    position[4] + (formSpec.width * position[0]),
    position[5]
  ]

  annotation.prop('Rect', new PDF.Array(dimension))
}

function processBorder (formSpec, annotation) {
  let borderArray = [0, 0, 0]
  if (formSpec.border) {
    borderArray = formSpec.border.split(',')
  }
  annotation.prop('Border', new PDF.Array(borderArray))
}

function flags (def, vals) {
  let result = 0
  Object.keys(def).forEach(key => {
    if (vals[key] === true) {
      result |= def[key]
    }
  })
  return result
}

function processValue (formSpec, annotation) {
  if (formSpec.value != null) {
    annotation.prop('V', new PDF.String(formSpec.value))
  }

  if (formSpec.defaultValue != null) {
    annotation.prop('DV', new PDF.String(formSpec.defaultValue))
  }
}

function processText (formSpec, annotation, doc) {
  let color = '0 g'
  if (formSpec.color) {
    color = parseColor(formSpec.color).rgb.map(c => c / 255).join(' ') + ' rg'
  }
  const fontSize = formSpec.fontSize ? formSpec.fontSize : 0
  const fontFamily = formSpec.fontFamily || 'Helvetica'
  annotation.prop('DA', new PDF.String(`/${fontFamily} ${fontSize} Tf ${color}`))

  if (doc._acroFormObj.properties.get('DR').get('Font').get(fontFamily) != null) {
    return
  }

  // without encoding the czech čšěčšě chars wrongly paints in Acrobat Reader
  const encodingObject = new PDF.Object('Encoding')
  doc._registerObject(encodingObject)
  encodingObject.prop('BaseEncoding', 'WinAnsiEncoding')// StandardEncoding not working

  const fontObject = new PDF.Object('Font')
  doc._registerObject(fontObject)
  fontObject.prop('BaseFont', fontFamily)
  fontObject.prop('Name', fontFamily)
  fontObject.prop('Subtype', 'Type1')
  fontObject.prop('Encoding', encodingObject.toReference())

  doc._acroFormObj.properties.get('DR').get('Font').set(fontFamily, fontObject.toReference())
}

function processBackgroundColor (formSpec, annotation) {
  if (formSpec.backgroundColor != null) {
    annotation.prop('MK', annotation.properties.get('MK') || new PDF.Dictionary())
    const mkDictionary = annotation.properties.get('MK')
    mkDictionary.set('BG', new PDF.Array(parseColor(formSpec.backgroundColor).rgb.map(c => c / 255)))
  }
}

function processLabel (formSpec, annotation) {
  if (formSpec.label != null) {
    annotation.prop('MK', annotation.properties.get('MK') || new PDF.Dictionary())
    const mkDictionary = annotation.properties.get('MK')
    mkDictionary.set('CA', new PDF.String(formSpec.label))
  }
}

function processTextAlign (formSpec, annotation) {
  function resolveTextAlign (a) {
    switch (a) {
      case 'left': return 0
      case 'center': return 1
      case 'right': return 2
      default: throw new Error(`Unkwnown textAlign ${a}`)
    }
  }

  if (formSpec.textAlign != null) {
    annotation.prop('Q', resolveTextAlign(formSpec.textAlign))
  }
}

function processType (formSpec, annotation) {
  switch (formSpec.type) {
    case 'text': return processTextType(formSpec, annotation)
    case 'signature': return processSignatureType(formSpec, annotation)
    case 'button': return processButtonType(formSpec, annotation)
    case 'combo': return processComboType(formSpec, annotation)
    default: throw new Error(`Unsupported pdfFormElement type ${formSpec.type}`)
  }
}

function processTextType (formSpec, annotation) {
  annotation.prop('FT', 'Tx')
}

function processSignatureType (formSpec, annotation) {
  annotation.prop('FT', 'Sig')
}

function processComboType (formSpec, annotation) {
  formSpec.combo = true
  annotation.prop('FT', 'Ch')
  annotation.prop('Opt', new PDF.Array(formSpec.items.map(i => `(${i})`)))
}

const SUBMIT_FORM_FLAGS = {
  includeNoValueFields: 2,
  exportFormat: 4,
  getMethod: 8,
  submitCoordinates: 16,
  XFDF: 32,
  includeAppendSaves: 64,
  includeAnnotations: 128,
  submitPDF: 256,
  canonicalFormat: 512,
  exclNonUserAnnots: 1024,
  excldFKEy: 2048,
  embedForm: 8192
}

function processButtonType (formSpec, annotation) {
  formSpec.pushButton = true
  annotation.prop('FT', 'Btn')

  if (formSpec.type === 'button' && formSpec.action === 'submit') {
    const aDicitonary = new PDF.Dictionary({
      S: 'SubmitForm',
      Type: 'Action',
      Flags: flags(SUBMIT_FORM_FLAGS, formSpec)
    })

    if (formSpec.url != null) {
      aDicitonary.set('F', new PDF.String(formSpec.url))
    }

    annotation.prop('A', aDicitonary)
  }

  if (formSpec.type === 'button' && formSpec.action === 'reset') {
    annotation.prop('A', new PDF.Dictionary({
      S: 'ResetForm',
      Type: 'Action'
    }))
  }
}

const FIELD_FLAGS = {
  readOnly: 1,
  required: 2,
  noExport: 4,
  multiline: 4096,
  password: 8192,
  pushButton: 65536,
  combo: 131072
}

function processFlags (formSpec, annotsObj) {
  const result = flags(FIELD_FLAGS, formSpec)

  if (result !== 0) {
    annotsObj.prop('Ff', result)
  }
}

const FORMAT_SPECIAL = {
  zip: '0',
  zipPlus4: '1',
  zip4: '1',
  phone: '2',
  ssn: '3'
}
const FORMAT_DEFAULT = {
  number: {
    fractionalDigits: 0,
    sepComma: false,
    negStyle: 'MinusBlack',
    currency: '',
    currencyPrepend: true
  },
  percent: {
    fractionalDigits: 0,
    sepComma: false
  }
}

function processFormat (formSpec, annotsObj) {
  if (formSpec.formatType == null) {
    return
  }

  const f = {}
  for (const key in formSpec) {
    if (key.startsWith('format')) {
      let tk = key.substring('format'.length)
      tk = tk.charAt(0).toLowerCase() + tk.substring(1)
      f[tk] = formSpec[key]
    }
  }

  let fnKeystroke
  let fnFormat
  let params = ''

  if (FORMAT_SPECIAL[f.type] !== undefined) {
    fnKeystroke = 'AFSpecial_Keystroke'
    fnFormat = 'AFSpecial_Format'
    params = FORMAT_SPECIAL[f.type]
  } else {
    const format = f.type.charAt(0).toUpperCase() + f.type.slice(1)
    fnKeystroke = `AF${format}_Keystroke`
    fnFormat = `AF${format}_Format`

    if (f.type === 'date') {
      fnKeystroke += 'Ex'
      fnFormat += 'Ex'
      params = `"${f.mask}"`
    } else if (f.type === 'time') {
      if (f.mask === 'HH:mm') {
        params = 0
      }
      if (f.mask === 'hh:mm') {
        params = 1
      }
      if (f.mask === 'HH:mm:ss') {
        params = 2
      }
      if (f.mask === 'hh:mm:ss') {
        params = 3
      }
    } else if (f.type === 'number') {
      const p = Object.assign({}, FORMAT_DEFAULT.number, f)
      params = [
        p.fractionalDigits,
        p.sepComma ? '0' : '1',
        '"' + p.negStyle + '"',
        'null',
        '"' + p.currency + '"',
        p.currencyPrepend
      ].join(',')
    } else if (f.type === 'percent') {
      const p = Object.assign({}, FORMAT_DEFAULT.percent, f)
      params = String([p.fractionalDigits, p.sepComma ? '0' : '1'].join(','))
    }
  }

  annotsObj.prop('AA', new PDF.Dictionary({
    K: new PDF.Dictionary({
      S: 'JavaScript',
      JS: new PDF.String(`${fnKeystroke}(${params});`)
    }),
    F: new PDF.Dictionary({
      S: 'JavaScript',
      JS: new PDF.String(`${fnFormat}(${params});`)
    })
  }))
}
