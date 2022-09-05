const { SignPdf } = require('@jsreport/node-signpdf')
const PDF = require('../object')
const { formatDate } = require('../util')

module.exports = (doc) => {
  doc.sign = (options) => {
    doc.finalizers.push(() => addSignaturePlaceholder(doc, options.reason, options.maxSignaturePlaceholderLength))
    doc.postprocessors.push((buffer) => sign(doc, buffer, options))
  }
}

function sign (doc, buffer, options) {
  const signer = new SignPdf()
  return signer.sign(buffer, options.certificateBuffer, options.password ? { passphrase: options.password } : undefined)
}

class PDFHexString {
  constructor (v) {
    this.str = v
  }

  toString () {
    return `<${this.str}>`
  }
}

const DEFAULT_BYTE_RANGE_PLACEHOLDER = '**********'
const DEFAULT_MAX_SIGNATURE_PLACEHOLDER_LENGTH = 8192
function addSignaturePlaceholder (doc, reason, maxSignaturePlaceholderLength) {
  const sig = new PDF.Object('Sig')
  sig.prop('Filter', 'Adobe.PPKLite')
  sig.prop('SubFilter', 'adbe.pkcs7.detached')
  sig.prop('ByteRange', new PDF.Array([
    0,
      `/${DEFAULT_BYTE_RANGE_PLACEHOLDER}`,
      `/${DEFAULT_BYTE_RANGE_PLACEHOLDER}`,
      `/${DEFAULT_BYTE_RANGE_PLACEHOLDER}`
  ]))

  sig.prop('Contents', new PDFHexString('0'.repeat(maxSignaturePlaceholderLength || DEFAULT_MAX_SIGNATURE_PLACEHOLDER_LENGTH)))
  sig.prop('Reason', new PDF.String(reason || 'Signed'))
  sig.prop('M', new PDF.String(formatDate(new Date())))

  const annot = new PDF.Object('Annot')
  annot.prop('Subtype', 'Widget')
  annot.prop('FT', 'Sig')
  annot.prop('Rect', new PDF.Array([0, 0, 0, 0]))
  annot.prop('V', sig.toReference())
  annot.prop('T', new PDF.String('Signature1'))
  annot.prop('F', 4)

  doc.catalog.properties.get('AcroForm').object.prop('SigFlags', 3)
  doc.catalog.properties.get('AcroForm').object.prop('Fields', new PDF.Array([...doc.catalog.properties.get('AcroForm').object.properties.get('Fields'), annot.toReference()]))

  for (const page of doc.catalog.properties.get('Pages').object.properties.get('Kids')) {
    page.object.prop('Annots', new PDF.Array([...(page.object.properties.get('Annots') || []), annot.toReference()]))
  }
}
