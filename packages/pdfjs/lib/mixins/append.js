const unionGlobalObjects = require('./utils/unionGlobalObjects')
const unionPageObjects = require('./utils/unionPageObjects')

module.exports = (doc) => {
  doc.append = (ext, options = {}) => doc.finalizers.push(() => append(ext, doc, options))
}

function append (ext, doc, options = {}) {
  let appendAfterIndex = options.appendAfterIndex
  unionGlobalObjects(doc, ext, options)
  const pages = ext.pages
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]

    if (options.pageIndexes == null || options.pageIndexes.includes(i)) {
      page.prop('Parent', doc.catalog.properties.get('Pages'))
      doc.catalog.properties.get('Pages').object.prop('Count', doc.catalog.properties.get('Pages').object.properties.get('Count') + 1)

      if (appendAfterIndex != null) {
        doc.catalog.properties.get('Pages').object.properties.get('Kids').splice(++appendAfterIndex, 0, page.toReference())
      } else {
        doc.catalog.properties.get('Pages').object.properties.get('Kids').push(page.toReference())
      }

      unionPageObjects(ext, doc, { copyAccessibilityTags: options.copyAccessibilityTags, newPage: page })
    } else {
      if (options.copyAccessibilityTags) {
        nullPgRef(doc.catalog.properties.get('StructTreeRoot')?.object, page)
      }
    }
  }
}

function nullPgRef (structTreeRoot, page) {
  if (structTreeRoot == null) {
    return
  }
  const structsInPage = []
  const f = (nodeOrDict, parent) => {
    if (nodeOrDict.get && nodeOrDict.get('Pg')?.object === page) {
      nodeOrDict.del('Pg')
      return
    }

    if (nodeOrDict.object) {
      for (const child of nodeOrDict.object.properties.get('K')) {
        f(child, nodeOrDict.object)
      }
    }
  }

  const firstExtNodes = structTreeRoot.properties.get('K').object.properties.get('K')
  for (const node of firstExtNodes) {
    f(node)
  }
  return structsInPage
}
