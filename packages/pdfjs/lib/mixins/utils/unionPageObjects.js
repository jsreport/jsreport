const PDF = require('../../object')

module.exports = (ext, doc, { newPage, originalPage, xobj, copyAccessibilityTags }) => {
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

  if (copyAccessibilityTags) {
    unionStructTree(ext, doc, newPage, originalPage, xobj)
  }
}

function unionStructTree (ext, doc, newPage, originalPage, xobj) {
  if (newPage.properties.get('StructTreeMerged')) {
    newPage.properties.del('StructTreeMerged')
    return
  }

  if (!doc.catalog.properties.has('StructTreeRoot')) {
    return
  }

  const structTreeRoot = doc.catalog.properties.get('StructTreeRoot').object
  const parentTree = structTreeRoot.properties.get('ParentTree').object

  const structsInPage = findStructsForPageAndReplaceOldPg(structTreeRoot, newPage, originalPage, xobj)

  const pageContents = new PDF.Object()
  pageContents.content = new PDF.Array(structsInPage.map(s => s.toReference()))

  const parentTreeNextKey = parentTree.properties.get('Nums')[parentTree.properties.get('Nums').length - 2]

  parentTree.properties.set('Nums', new PDF.Array([
    ...parentTree.properties.get('Nums'),
    parentTreeNextKey + 1,
    pageContents.toReference()
  ]))
  structTreeRoot.properties.set('ParentTreeNextKey', parentTreeNextKey + 2)
  const contentObject = xobj || newPage
  contentObject.properties.set('StructParents', parentTreeNextKey + 1)
}

function findStructsForPageAndReplaceOldPg (structTreeRoot, newPage, originalPage, xobj) {
  const structsInPage = []
  const f = (nodeOrDict, parent) => {
    if (nodeOrDict.get && nodeOrDict.get('Pg')?.object === newPage) {
      nodeOrDict.set('Pg', (originalPage || newPage).toReference())
      if (xobj) {
        nodeOrDict.set('Stm', xobj.toReference())
      }
      return structsInPage.push(parent)
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
