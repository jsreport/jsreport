const PDF = require('../object/')
module.exports = (doc) => {
  doc.append = (ext, pageNumbers) => doc.finalizers.push(() => append(ext, doc, pageNumbers))
}

function append (ext, doc, pageNumbers) {
  const pages = ext.catalog.properties.get('Pages').object.properties.get('Kids').map(kid => kid.object)
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]

    if (pageNumbers == null || pageNumbers.includes(i)) {
      page.prop('Parent', doc.catalog.properties.get('Pages'))
      doc.catalog.properties.get('Pages').object.prop('Count', doc.catalog.properties.get('Pages').object.properties.get('Count') + 1)
      doc.catalog.properties.get('Pages').object.properties.get('Kids').push(page.toReference())
    }
  }

  // todo shouldn't we merge the values there? and do the same also in the merge?
  if (ext.catalog.properties.get('Dests')) {
    doc.catalog.prop('Dests', ext.catalog.properties.get('Dests'))
  }

  // append fields from acroform
  if (ext.catalog.properties.get('AcroForm') && ext.catalog.properties.get('AcroForm').object.properties.get('Fields')) {
    let fieldsToMerge = ext.catalog.properties.get('AcroForm').object.properties.get('Fields')
    if (pageNumbers) {
      fieldsToMerge = fieldsToMerge.filter(f => pageNumbers.includes(pages.indexOf(f.object.properties.get('P').object)))
    }

    // union fields from both, fields are just refs already registered in the page->annotation so don't need registration
    doc.catalog.properties.get('AcroForm').object.prop('Fields', new PDF.Array([...doc.catalog.properties.get('AcroForm').object.properties.get('Fields'), ...fieldsToMerge]))
  }

  if (ext.catalog.properties.get('AcroForm') && ext.catalog.properties.get('AcroForm').object.properties.get('SigFlags')) {
    // doc.catalog.properties.get('AcroForm').object.prop('SigFlags', ext.catalog.properties.get('AcroForm').object.properties.get('SigFlags'))
  }
}
