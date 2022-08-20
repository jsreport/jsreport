const PDF = require('../object/')
module.exports = (doc) => {
  doc.append = (ext, pageIndexes) => doc.finalizers.push(() => append(ext, doc, pageIndexes))
}

function append (ext, doc, pageIndexes) {
  const pages = ext.pages
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]

    if (pageIndexes == null || pageIndexes.includes(i)) {
      page.prop('Parent', doc.catalog.properties.get('Pages'))
      doc.catalog.properties.get('Pages').object.prop('Count', doc.catalog.properties.get('Pages').object.properties.get('Count') + 1)
      doc.catalog.properties.get('Pages').object.properties.get('Kids').push(page.toReference())
    }
  }

  // todo shouldn't we merge the values there? and do the same also in the merge?
  if (ext.catalog.properties.get('Dests')) {
    doc.catalog.prop('Dests', ext.catalog.properties.get('Dests'))
  }

  const extAcroForm = ext.catalog.properties.get('AcroForm')?.object

  // append fields from acroform
  if (extAcroForm && extAcroForm.properties.get('Fields')) {
    let fieldsToMerge = extAcroForm.properties.get('Fields')
    if (pageIndexes) {
      fieldsToMerge = fieldsToMerge.filter(f => pageIndexes.includes(pages.indexOf(f.object.properties.get('P').object)))
    }

    // union fields from both, fields are just refs already registered in the page->annotation so don't need registration
    doc.catalog.properties.get('AcroForm').object.prop('Fields', new PDF.Array([...doc.catalog.properties.get('AcroForm').object.properties.get('Fields'), ...fieldsToMerge]))
  }

  if (extAcroForm && extAcroForm.properties.get('SigFlags')) {
    // TODO what is this?
    // doc.catalog.properties.get('AcroForm').object.prop('SigFlags', ext.catalog.properties.get('AcroForm').object.properties.get('SigFlags'))
  }

  if (extAcroForm) {
    const docAcroForm = doc.catalog.properties.get('AcroForm').object
    if (extAcroForm.properties.has('NeedAppearances')) {
      docAcroForm.properties.set('NeedAppearances', extAcroForm.properties.get('NeedAppearances'))
    }
    if (extAcroForm.properties.has('SigFlags')) {
      docAcroForm.properties.set('SigFlags', extAcroForm.properties.get('SigFlags'))
    }

    if (extAcroForm.properties.has('DR')) {
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

  if (ext.catalog.properties.get('Names') && ext.catalog.properties.get('Names').object.properties.get('EmbeddedFiles')) {
    const embeddedFilesDictionary = doc.catalog.properties.get('Names').object.properties.get('EmbeddedFiles')
    embeddedFilesDictionary.set('Names', new PDF.Array([...embeddedFilesDictionary.get('Names'), ...ext.catalog.properties.get('Names').object.properties.get('EmbeddedFiles').get('Names')]))
  }

  if (ext.catalog.properties.get('Info')?.object) {
    const extInfo = ext.catalog.properties.get('Info').object
    const docInfo = doc.catalog.properties.get('Info').object

    for (const key in extInfo.properties.dictionary) {
      const infoName = key.substring(1)
      docInfo.properties.set(infoName, extInfo.properties.get(key))
    }
  }
}
