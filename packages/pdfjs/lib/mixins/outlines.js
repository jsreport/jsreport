const PDF = require('../object')
module.exports = (doc) => {
  doc.outlines = (aoutlines) => doc.finalizers.push(() => outlines(aoutlines, doc))
}

function outlines (aoutlines, doc) {
  const rootOutline = new PDF.Object('Outlines')
  rootOutline.data = {}

  const outlinesObjects = [rootOutline]
  for (const { title, parent, id } of aoutlines) {
    if (!doc.catalog.properties.get('Dests').object.properties.get(id)) {
      continue
    }

    const outline = new PDF.Object()
    outline.data = { title, id, parent }
    outline.prop('Title', new PDF.String(title))
    outline.prop('A', new PDF.Dictionary({
      S: 'GoTo',
      D: doc.catalog.properties.get('Dests').object.properties.get(id)
    }))
    outlinesObjects.push(outline)
  }

  if (outlinesObjects.length === 1) {
    return
  }

  for (let i = 0; i < outlinesObjects.length; i++) {
    const outline = outlinesObjects[i]
    const parentIndex = outline.data.parent == null || outline.data.parent === '' ? 0 : outlinesObjects.findIndex(o => o.data.id === outline.data.parent)

    const siblingsIndexes = outlinesObjects.reduce((result, item, index) => {
      if (index !== 0 && item.data.parentIndex === parentIndex) result.push(index)
      return result
    }, [])

    // Chain to siblings
    const prevSiblingIndex = siblingsIndexes[siblingsIndexes.length - 1]
    if (prevSiblingIndex > 0) {
      // Next
      outlinesObjects[prevSiblingIndex].data.nextId = i
      outlinesObjects[prevSiblingIndex].prop('Next', outline.toReference())
      // Prev
      outline.data.prevId = prevSiblingIndex
      outline.prop('Prev', outlinesObjects[prevSiblingIndex].toReference())
    }

    // Chain to parents
    outline.data.parentIndex = parentIndex
    if (siblingsIndexes.length === 0) {
      // First
      outlinesObjects[parentIndex].data.firstIndex = i
      outlinesObjects[parentIndex].prop('First', outline.toReference())
    }

    // Last
    outlinesObjects[parentIndex].data.lastIndex = i
    outlinesObjects[parentIndex].prop('Last', outline.toReference())

    // count
    if (outlinesObjects[parentIndex].data.count < 1) {
      outlinesObjects[parentIndex].data.count -= 1
      outlinesObjects[parentIndex].prop('Count', outlinesObjects[parentIndex].data.count)
    } else {
      outlinesObjects[parentIndex].data.count = -1
      outlinesObjects[parentIndex].prop('Count', outlinesObjects[parentIndex].data.count)
    }
  }

  // no open outlines at all level by default
  rootOutline.properties.del('Count')

  const docOutline = doc.catalog.properties.get('Outlines')?.object
  if (docOutline == null) {
    doc.catalog.prop('Outlines', rootOutline.toReference())
  } else {
    // append to existing outlines
    let currentNext = docOutline.properties.get('First').object
    while (currentNext?.properties.get('Next')?.object) {
      currentNext = currentNext.properties.get('Next').object
    }

    rootOutline.properties.get('First').object.properties.set('Prev', currentNext.toReference())
    currentNext.properties.set('Next', rootOutline.properties.get('First'))
    docOutline.properties.set('Last', rootOutline.properties.get('Last'))
  }
}
