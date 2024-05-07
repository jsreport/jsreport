const PDF = require('../../object')

module.exports = (doc, ext, options) => {
  if (ext.catalog.properties.get('Info')?.object) {
    const extInfo = ext.catalog.properties.get('Info').object
    const docInfo = doc.catalog.properties.get('Info').object

    for (const key in extInfo.properties.dictionary) {
      const infoName = key.substring(1)
      docInfo.properties.set(infoName, extInfo.properties.get(key))
    }
  }

  // chrome generats pdf with default en language, but we want to keep the lang only from the root doc
  if (!doc.isLanguageFilled && ext.catalog.properties.get('Lang')) {
    doc.isLanguageFilled = true
    doc.catalog.prop('Lang', ext.catalog.properties.get('Lang'))
  }

  if (ext.catalog.properties.get('Names') && ext.catalog.properties.get('Names').object.properties.get('EmbeddedFiles')) {
    const embeddedFilesDictionary = doc.catalog.properties.get('Names').object.properties.get('EmbeddedFiles')
    embeddedFilesDictionary.set('Names', new PDF.Array([...embeddedFilesDictionary.get('Names'), ...ext.catalog.properties.get('Names').object.properties.get('EmbeddedFiles').get('Names')]))
  }

  unionOutlines(ext, doc)

  if (options.copyAccessibilityTags) {
    mergeStructTree(ext, doc)
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

    if (extAcroForm.properties.get('DR')?.get && extAcroForm.properties.get('DR')?.get('Font')) {
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

function unionOutlines (ext, doc) {
  const docOutline = doc.catalog.properties.get('Outlines')?.object
  const extOutline = ext.catalog.properties.get('Outlines')?.object

  if (extOutline == null) {
    return
  }

  if (docOutline == null) {
    doc.catalog.properties.set('Outlines', extOutline.toReference())
    return
  }

  if (docOutline.properties.get('First').object && extOutline.properties.get('Last').object) {
    const docDests = doc.catalog.properties.get('Dests')?.object?.properties
    const extDests = ext.catalog.properties.get('Dests')?.object?.properties

    if (!docDests || !extDests) {
    // something wrong, there needs to be dests when we want to union outlines
      return
    }

    for (const key in extDests.dictionary) {
      if (docDests.has(key)) {
        // when we unioned Dests, the outlines are likely merged as well
        return
      }
    }

    let currentNext = docOutline.properties.get('First').object
    while (currentNext?.properties.get('Next')?.object) {
      currentNext = currentNext.properties.get('Next').object
    }

    extOutline.properties.get('First').object.properties.set('Prev', currentNext.toReference())
    currentNext.properties.set('Next', extOutline.properties.get('First'))
    docOutline.properties.set('Last', extOutline.properties.get('Last'))
  }
}

function mergeStructTree (ext, doc) {
  const docStructTreeRoot = doc.catalog.properties.get('StructTreeRoot')?.object
  const extStructTreeRoot = ext.catalog.properties.get('StructTreeRoot')?.object

  if (!extStructTreeRoot) {
    return
  }

  if (!docStructTreeRoot) {
    if (doc.pages.length !== 0) {
      // if there is something in the document, that isn't marked, we cant continue
      return
    }
    doc.catalog.properties.set('StructTreeRoot', extStructTreeRoot.toReference())
    doc.catalog.properties.set('MarkInfo', ext.catalog.properties.get('MarkInfo'))
    for (const page of ext.pages) {
      page.properties.set('StructTreeMerged', true)
    }
    return
  }

  const docIDTree = docStructTreeRoot.properties.get('IDTree').object.properties.get('Kids')[0].object
  const extIDTree = extStructTreeRoot.properties.get('IDTree').object.properties.get('Kids')[0].object

  const docNames = docIDTree.properties.get('Names')
  const extNames = extIDTree.properties.get('Names')

  const lastDocName = docIDTree.properties.get('Limits')[1].str

  // this is expected format produced by chrome
  // node00000002
  if (lastDocName.length !== 'node00000002'.length && !lastDocName.startsWith('node')) {
    return
  }

  let lastDocNameId = parseInt(lastDocName.substring('node'.length))

  const extNamesMapping = {}

  for (let i = 0; i < extNames.length; i += 2) {
    if (extNames[i + 1].object.properties.get('S').name !== 'Document') {
      const newName = 'node' + (++lastDocNameId).toString().padStart('00000002'.length, '0')
      docNames.push(new PDF.String(newName))
      docNames.push(extNames[i + 1])
      extNamesMapping[extNames[i].str] = newName
    }
  }

  docIDTree.properties.get('Limits')[1] = docNames[docNames.length - 2]

  const firstExtNodes = extStructTreeRoot.properties.get('K').object.properties.get('K')
  for (const node of firstExtNodes) {
    updateStructIds(node.object, extNamesMapping)
    updateStructP(node.object, docStructTreeRoot.properties.get('K').object, extStructTreeRoot.properties.get('K').object)
  }

  const docMainNode = docStructTreeRoot.properties.get('K').object
  docMainNode.properties.set('K', new PDF.Array([...docMainNode.properties.get('K'), ...firstExtNodes]))
}

function updateStructP (node, docDocument, extDocument) {
  if (!node || !node.properties.has('P')) {
    return
  }

  if (node.properties.get('P').object === extDocument) {
    node.properties.set('P', docDocument.toReference())
  }

  for (const child of node.properties.get('K')) {
    updateStructP(child.object, docDocument, extDocument)
  }
}

function updateStructIds (node, extNamesMapping) {
  if (!node || !node.properties.has('ID')) {
    return
  }

  node.properties.set('ID', new PDF.String(extNamesMapping[node.properties.get('ID').str]))

  for (const child of node.properties.get('K')) {
    updateStructIds(child.object, extNamesMapping)
  }
}
