const PDF = require('../object')
const parseColor = require('parse-color')
const zlib = require('zlib')

module.exports = (doc) => {
  doc.catalog.prop('AcroForm', new PDF.Object().toReference())
  doc.catalog.properties.get('AcroForm').object.prop('Fields', new PDF.Array())

  doc.acroForm = (options) => doc.finalizers.push(() => acroForm(doc, options))
}

function acroForm (doc, formSpec) {
  doc.catalog.properties.get('AcroForm').object.prop('NeedAppearances', true)
  if (!doc.catalog.properties.get('AcroForm').object.properties.has('DR')) {
    doc.catalog.properties.get('AcroForm').object.prop('DR', new PDF.Dictionary({
      Font: new PDF.Dictionary()
    }))
  }

  const annotsObj = new PDF.Object('Annot')
  doc.catalog.properties.get('AcroForm').object.prop('Fields', new PDF.Array([
    ...doc.catalog.properties.get('AcroForm').object.properties.get('Fields'),
    annotsObj.toReference()
  ]))

  const pageObject = doc.catalog.properties.get('Pages').object.properties.get('Kids')[formSpec.pageIndex].object

  annotsObj.prop('Subtype', 'Widget')
  annotsObj.prop('T', new PDF.String(formSpec.name))
  annotsObj.prop('F', 4)
  annotsObj.prop('P', pageObject.toReference())

  processType(formSpec, annotsObj, doc, formSpec.position)
  processValue(formSpec, annotsObj)
  processBorder(formSpec, annotsObj)
  processText(formSpec, annotsObj, doc)
  processBackgroundColor(formSpec, annotsObj)
  processLabel(formSpec, annotsObj)
  processTextAlign(formSpec, annotsObj)
  processFlags(formSpec, annotsObj)
  processFormat(formSpec, annotsObj)
  processRectangle(formSpec, annotsObj, formSpec.position)

  if (pageObject.properties.get('Annots')) {
    pageObject.properties.get('Annots').push(annotsObj.toReference())
  } else {
    pageObject.prop('Annots', new PDF.Array([annotsObj.toReference()]))
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

  if (doc.catalog.properties.get('AcroForm').object.properties.get('DR').get('Font').get(fontFamily) != null) {
    return
  }

  // without encoding the czech čšěčšě chars wrongly paints in Acrobat Reader
  const encodingObject = new PDF.Object('Encoding')
  encodingObject.prop('BaseEncoding', 'WinAnsiEncoding')// StandardEncoding not working

  const fontObject = new PDF.Object('Font')
  fontObject.prop('BaseFont', fontFamily)
  fontObject.prop('Name', fontFamily)
  fontObject.prop('Subtype', 'Type1')
  fontObject.prop('Encoding', encodingObject.toReference())

  doc.catalog.properties.get('AcroForm').object.properties.get('DR').get('Font').set(fontFamily, fontObject.toReference())
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

function processType (formSpec, annotation, doc, position) {
  switch (formSpec.type) {
    case 'text': return processTextType(formSpec, annotation)
    case 'signature': return processSignatureType(formSpec, annotation)
    case 'button': return processButtonType(formSpec, annotation)
    case 'combo': return processComboType(formSpec, annotation)
    case 'checkbox': return processCheckbox(formSpec, annotation, doc, position)
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

function visualCharFromType (formSpec) {
  const checkboxType = formSpec.visualType || 'check'
  switch (checkboxType) {
    case 'check': return '4'
    case 'square': return 'n'
    default: throw new Error(`Unkwnown checkbox visualType ${checkboxType}`)
  }
}

function processCheckbox (formSpec, annotation, doc, position) {
  // we just use the default ZaDb for displaying checkbox marks
  formSpec.fontFamily = 'ZaDb'

  annotation.prop('FT', 'Btn')
  annotation.prop('AS', 'Off')
  if (formSpec.value != null) {
    annotation.prop('V', formSpec.value ? 'Yes' : 'Off')
    formSpec.value = null
  }
  if (formSpec.defaultValue != null) {
    annotation.prop('DV', formSpec.defaultValue ? 'Yes' : 'Off')
    annotation.prop('AS', formSpec.defaultValue ? 'Yes' : 'Off')
    formSpec.defaultValue = null
  }

  // the pdf works the strange way, you need to set here the character that should be displayed when it is selected
  // but if user actualy focus the checkbox and clicks there, the streams specified later are used to display the value
  // in the end the streams are just trying to display the same char on the same position and size, as acrobat does based on this one line spec
  const visualChar = visualCharFromType(formSpec)
  annotation.prop('MK', new PDF.Dictionary())
  annotation.properties.get('MK').set('CA', new PDF.String(visualChar))

  if (doc.catalog.properties.get('AcroForm').object.properties.get('DR').get('Font').get('ZaDb') == null) {
    const zapfFontObject = new PDF.Object()
    zapfFontObject.prop('BaseFont', 'ZapfDingbats')
    zapfFontObject.prop('Name', 'ZaDb')
    zapfFontObject.prop('Subtype', 'Type1')
    zapfFontObject.prop('Type', 'Font')
    doc.catalog.properties.get('AcroForm').object.properties.get('DR').get('Font').set('ZaDb', zapfFontObject.toReference())
  }

  const zapfFontObject = doc.catalog.properties.get('AcroForm').object.properties.get('DR').get('Font').get('ZaDb').object

  const dimension = [
    position[4],
    position[5] - (formSpec.height * position[3]),
    position[4] + (formSpec.width * position[0]),
    position[5]
  ]
  const bbox = [
    0,
    0,
    (dimension[2] - dimension[0]).toFixed(3),
    (dimension[3] - dimension[1]).toFixed(3)
  ]

  // there is some magic here...
  // the markSizeForFont should cover the whole box, but visually it is for some reason smaller
  // the 1.48 constant just works fine for most of the cases, I didn't find out how to be able to assemble it properly
  const markSizeForFont = Math.min(bbox[2], bbox[3])
  const markSize = Math.min(bbox[2], bbox[3]) / 1.48

  const apStreamYesContent = `q
  ${parseColor(formSpec.color || '#000000').rgb.map(c => c / 255).join(' ') + ' rg'}
  BT
  /ZaDb ${markSizeForFont} Tf
  ${((bbox[2] / 2) - (markSize / 2)).toFixed()} ${((bbox[3] / 2) - (markSize / 2)).toFixed()} Td
  (${visualChar}) Tj
  ET
  Q`
  const yesStreamObject = new PDF.Object()
  const apYesStream = new PDF.Stream(yesStreamObject)
  apYesStream.object.prop('Filter', 'FlateDecode')
  apYesStream.content = zlib.deflateSync(apStreamYesContent)
  apYesStream.object.prop('Length', apYesStream.content.length)
  apYesStream.object.prop('Type', 'XObject')
  apYesStream.object.prop('Subtype', 'Form')
  apYesStream.object.prop('FormType', 1)
  apYesStream.object.prop('BBox', new PDF.Array(bbox))
  apYesStream.object.prop('Resources', new PDF.Dictionary())
  apYesStream.object.properties.get('Resources').set('Font', new PDF.Dictionary())
  apYesStream.object.properties.get('Resources').get('Font').set('ZaDb', zapfFontObject.toReference())

  const apStreamOffContent = `q
  Q`

  const offStreamObject = new PDF.Object()
  const apOffStream = new PDF.Stream(offStreamObject)
  apOffStream.object.prop('Filter', 'FlateDecode')
  apOffStream.content = zlib.deflateSync(apStreamOffContent)
  apOffStream.object.prop('Length', apOffStream.content.length)
  apOffStream.object.prop('Type', 'XObject')
  apOffStream.object.prop('Subtype', 'Form')
  apOffStream.object.prop('FormType', 1)
  apOffStream.object.prop('BBox', new PDF.Array(bbox))
  apOffStream.object.prop('Resources', new PDF.Dictionary())

  const statesDictionary = new PDF.Dictionary()
  statesDictionary.set('Yes', yesStreamObject.toReference())
  statesDictionary.set('Off', offStreamObject.toReference())

  const apDictionary = new PDF.Dictionary()
  apDictionary.set('N', statesDictionary)
  // acrobat create the same new streams also to the attribute D of the dictionary
  // but I didn't notice some significant impact so I keep it just in the N
  annotation.prop('AP', apDictionary)
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
