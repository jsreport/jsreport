const unionGlobalObjects = require('./utils/unionGlobalObjects')
const unionPageObjects = require('./utils/unionPageObjects')

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

      unionPageObjects(ext, doc, page)
    }
  }

  unionGlobalObjects(doc, ext)
}
