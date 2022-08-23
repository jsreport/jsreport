/* eslint no-unused-vars: 0 */
function pdfFormField (el) {
  // handlebars
  if (el && el.hash) {
    el = el.hash
  }
  // jsrender
  if (this && this.tagCtx && this.tagCtx.props) {
    el = this.tagCtx.props
  }

  if (el == null || el.type == null || el.name == null || el.width == null || el.height == null) {
    throw new Error('pdfFormField requires name, type, width, height params ')
  }

  if (!el.width.includes('px')) {
    throw new Error('pdfFormField width should be in px')
  }

  el.width = parseInt(el.width.substring(0, el.width.length - 2))

  if (!el.height.includes('px')) {
    throw new Error('pdfFormField height should be in px')
  }

  el.height = parseInt(el.height.substring(0, el.height.length - 2))

  if (el.fontSize != null) {
    if (!el.fontSize.includes('px')) {
      throw new Error('pdfFormField fontSize should be in px')
    }

    el.fontSize = parseInt(el.fontSize.substring(0, el.fontSize.length - 2))
  }

  if (el.items && typeof el.items === 'string') {
    el.items = el.items.split(',')
  }

  if (el.type === 'combo' && el.items == null) {
    throw new Error('pdfFormField with combo type needs requires items attribute')
  }

  if (el.fontFamily != null) {
    const stdFonts = ['Times-Roman', 'Times-Bold', 'Time-Italic', 'Time-BoldItalic', 'Courier', 'Courier-Bold', 'Courier-Oblique', 'Helvetica', 'Helvetica-Bold',
      'Helvetica-Oblique', 'Helvetica-BoldOblique', 'Symbol', 'ZapfDingbats', 'Courier-BoldOblique']

    if (!stdFonts.includes(el.fontFamily)) {
      throw new Error('pdfFormField supports only pdf base 14 fonts in fontFamily attribute.')
    }
  }

  const params = JSON.stringify(el)
  const value = Buffer.from(params).toString('base64')

  return `<span class='jsreport-pdf-utils-form-element jsreport-pdf-utils-hidden-element' style='font-family: Helvetica;display: inline-block;vertical-align:middle;text-transform:none;font-size:1.1px;width: ${el.width}px; height: ${el.height}px'>form@@@${value}@@@</span>`
}

function pdfCreatePagesGroup (groupId) {
  // handlebars
  if (groupId && groupId.hash) {
    groupId = groupId.hash
  }
  // jsrender
  if (this && this.tagCtx && this.tagCtx.props) {
    groupId = this.tagCtx.props
  }
  // otherwise just simple one value param is supported

  if (groupId == null) {
    const err = new Error('"pdfCreatePagesGroup" was called with undefined parameter. One parameter was expected.')
    err.stack = null
    throw err
  }

  const jsonStrOriginalValue = JSON.stringify(groupId)
  const value = Buffer.from(jsonStrOriginalValue).toString('base64')
  // we use position: absolute to make the element to not participate in flexbox layout
  // (making it not a flexbox child)
  const result = `<span class='jsreport-pdf-utils-page-group jsreport-pdf-utils-hidden-element' style='font-family: Helvetica;position:absolute;text-transform: none;opacity: 0.01;font-size:1.1px'>group@@@${value}@@@</span>`
  console.log(`Pdf utils adding group field, value: ${jsonStrOriginalValue}`)
  return result
}

function pdfAddPageItem (item) {
  // handlebars
  if (item && item.hash) {
    item = item.hash
  }
  // jsrender
  if (this && this.tagCtx && this.tagCtx.props) {
    item = this.tagCtx.props
  }
  // otherwise just simple one value param is supported

  if (item == null) {
    const err = new Error('"pdfAddPageItem" was called with undefined parameter. One parameter was expected.')
    err.stack = null
    throw err
  }

  const jsonStrOriginalValue = JSON.stringify(item)
  const value = Buffer.from(jsonStrOriginalValue).toString('base64')
  // we use position: absolute to make the element to not participate in flexbox layout
  // (making it not a flexbox child)
  const result = `<span class='jsreport-pdf-utils-page-item jsreport-pdf-utils-hidden-element' style='font-family: Helvetica;position:absolute;text-transform: none;opacity: 0.01;font-size:1.1px'>item@@@${value}@@@</span>`
  console.log(`Pdf utils adding item field, value: ${jsonStrOriginalValue}`)
  return result
}

function pdfDest (id) {
  return `<span class='jsreport-pdf-utils-dest jsreport-pdf-utils-hidden-element' style='font-family: Helvetica;position:absolute;text-transform: none;opacity: 0.01;font-size:1.1px'>dest@@@${id}@@@</span>`
}
