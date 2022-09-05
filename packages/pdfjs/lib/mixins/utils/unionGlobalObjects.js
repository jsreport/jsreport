const PDF = require('../../object')

module.exports = (doc, ext) => {
  if (ext.catalog.properties.get('Info')?.object) {
    const extInfo = ext.catalog.properties.get('Info').object
    const docInfo = doc.catalog.properties.get('Info').object

    for (const key in extInfo.properties.dictionary) {
      const infoName = key.substring(1)
      docInfo.properties.set(infoName, extInfo.properties.get(key))
    }
  }

  if (ext.catalog.properties.get('Lang')) {
    doc.catalog.prop('Lang', ext.catalog.properties.get('Lang'))
  }

  if (ext.catalog.properties.get('Names') && ext.catalog.properties.get('Names').object.properties.get('EmbeddedFiles')) {
    const embeddedFilesDictionary = doc.catalog.properties.get('Names').object.properties.get('EmbeddedFiles')
    embeddedFilesDictionary.set('Names', new PDF.Array([...embeddedFilesDictionary.get('Names'), ...ext.catalog.properties.get('Names').object.properties.get('EmbeddedFiles').get('Names')]))
  }

  const extAcroForm = ext.catalog.properties.get('AcroForm')?.object
  if (extAcroForm) {
    const docAcroForm = doc.catalog.properties.get('AcroForm').object
    if (extAcroForm.properties.has('NeedAppearances')) {
      docAcroForm.properties.set('NeedAppearances', extAcroForm.properties.get('NeedAppearances'))
    }
    if (extAcroForm.properties.has('SigFlags')) {
      docAcroForm.properties.set('SigFlags', extAcroForm.properties.get('SigFlags'))
    }

    if (extAcroForm.properties.get('DR')?.get('Font')) {
      let dr = docAcroForm.properties.get('DR')
      if (dr == null) {
        dr = new PDF.Dictionary({
          Font: new PDF.Dictionary()
        })
        docAcroForm.properties.set('DR', dr)
      }

      const extFontDict = extAcroForm.properties.get('DR').get('Font')
      const docFontDict = dr.get('Font')

      for (let fontName in extFontDict.dictionary) {
        fontName = fontName.substring(1)
        if (!docFontDict.has(fontName)) {
          const font = extFontDict.get(fontName)
          docFontDict.set(fontName, font)
        }
      }
    }
  }
}
