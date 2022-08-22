const PDF = require('../../object')

module.exports = (ext, doc, newPage, originalPage) => {
  const extAcroForm = ext.catalog.properties.get('AcroForm')?.object

  // append fields from acroform
  if (extAcroForm && extAcroForm.properties.get('Fields')) {
    const fieldsToMerge = extAcroForm.properties.get('Fields').filter(f => f.object.properties.get('P').object === newPage)
    // union fields from both, fields are just refs already registered in the page->annotation so don't need registration
    doc.catalog.properties.get('AcroForm').object.prop('Fields', new PDF.Array([...doc.catalog.properties.get('AcroForm').object.properties.get('Fields'), ...fieldsToMerge]))
  }

  if (ext.catalog.properties.get('Dests')) {
    const docDests = doc.catalog.properties.get('Dests').object.properties
    const extDests = ext.catalog.properties.get('Dests').object.properties

    for (const key in extDests.dictionary) {
      const dest = extDests.get(key)
      if (originalPage) {
        dest[0] = originalPage.toReference()
      }
      docDests.set(key, dest)
    }
  }

  if (originalPage) {
    const annots = newPage.properties.get('Annots')
    if (Array.isArray(annots)) {
      for (const annot of annots.map(a => a.object)) {
        annot.properties.set('P', originalPage.toReference())
      }
      const docPageAnnots = originalPage.properties.get('Annots') || []
      originalPage.properties.set('Annots', new PDF.Array([...docPageAnnots, ...annots]))
    }
  }
}
