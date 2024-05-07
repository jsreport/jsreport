const PDF = require('../../object')

module.exports = (ext, doc, { newPage, originalPage, xobj, copyAccessibilityTags }) => {
  const extAcroForm = ext.catalog.properties.get('AcroForm')?.object

  // append fields from acroform
  if (extAcroForm && extAcroForm.properties.get('Fields')) {
    const fieldsToMerge = extAcroForm.properties.get('Fields').filter(f => f.object.properties.get('P').object === newPage)
    // union fields from both, fields are just refs already registered in the page->annotation so don't need registration
    doc.catalog.properties.get('AcroForm').object.prop('Fields', new PDF.Array([...doc.catalog.properties.get('AcroForm').object.properties.get('Fields'), ...fieldsToMerge]))
  }

  copyDests(ext, doc, newPage, originalPage)
  updatePageInOutlineDests(doc, newPage, originalPage)

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

  let parentTreeNextKey = structTreeRoot.properties.get('ParentTreeNextKey')

  const structsInPage = findStructsForPageAndReplaceOldPg(structTreeRoot, newPage, originalPage, xobj)

  // the parents from the xobjects are in individual buckets, however this approach as well as putting the parents to the same bucket
  // as the ones from page content causes Acrobat prefilight error "Inconsistent parent tree mapping"

  const pageContents = new PDF.Object()
  pageContents.content = new PDF.Array(structsInPage.filter(s => xobj || s.node.get('Stm') == null).map(s => s.parent.toReference()))

  const contentObject = xobj || newPage
  contentObject.properties.set('StructParents', parentTreeNextKey)

  parentTree.properties.set('Nums', new PDF.Array([
    ...parentTree.properties.get('Nums'),
    parentTreeNextKey++,
    pageContents.toReference()
  ]))

  if (!xobj) {
    // every xobject content structure parents goes to individual parent tree bucket
    const xobjStructsInPage = structsInPage.filter(s => s.node.get('Stm') != null)
    const groupedStructsByXObj = xobjStructsInPage.reduce(
      (entryMap, { node, parent }) => entryMap.set(node.get('Stm'), [...entryMap.get(node.get('Stm')) || [], parent]),
      new Map()
    )

    for (const [stm, parents] of groupedStructsByXObj) {
      const xobjContents = new PDF.Object()
      xobjContents.content = new PDF.Array(parents.map(p => p.toReference()))
      stm.object.properties.set('StructParents', parentTreeNextKey)
      parentTree.properties.set('Nums', new PDF.Array([
        ...parentTree.properties.get('Nums'),
        parentTreeNextKey++,
        xobjContents.toReference()
      ]))
    }
  }

  structTreeRoot.properties.set('ParentTreeNextKey', parentTreeNextKey)
}

function findStructsForPageAndReplaceOldPg (structTreeRoot, newPage, originalPage, xobj) {
  const structsInPage = []
  const f = (nodeOrDict, parent) => {
    if (nodeOrDict.get && nodeOrDict.get('Pg')?.object === newPage) {
      nodeOrDict.set('Pg', (originalPage || newPage).toReference())
      if (xobj) {
        nodeOrDict.set('Stm', xobj.toReference())
      }
      return structsInPage.push({ parent, node: nodeOrDict })
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

function copyDests (ext, doc, newPage, originalPage) {
  if (ext.catalog.properties.get('Dests')) {
    const docDests = doc.catalog.properties.get('Dests').object.properties
    const extDests = ext.catalog.properties.get('Dests').object.properties

    for (const key in extDests.dictionary) {
      const dest = extDests.get(key)

      if (dest[0].object !== newPage) {
        // we skip dests that are not for this page
        continue
      }

      if (originalPage) {
        dest[0] = originalPage.toReference()
      }

      docDests.set(key, dest)
    }
  }
}

function updatePageInOutlineDests (doc, newPage, originalPage) {
  if (!originalPage) {
    return
  }

  const docOutline = doc.catalog.properties.get('Outlines')?.object

  if (!docOutline) {
    return
  }

  let currentNext = docOutline.properties.get('First')?.object

  if (!currentNext) {
    return
  }

  do {
    const d = currentNext.properties.get('A')?.get('D')
    if (Array.isArray(d) && d[0].object === newPage) {
      d[0] = originalPage.toReference()
    }
  } while ((currentNext = currentNext?.properties.get('Next')?.object))
}
