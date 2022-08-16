const PDF = require('../object')
module.exports = (doc) => {
  doc.outlines = (aoutlines) => doc.finalizers.push(() => outlines(aoutlines, doc))
}

function outlines (aoutlines, doc) {
  const rootOutline = new PDF.Object('Outlines')
  rootOutline.data = {}
  doc.catalog.prop('Outlines', rootOutline.toReference())

  const outlinesObjects = [rootOutline]
  for (const { title, parent, id } of aoutlines) {
    const outline = new PDF.Object()
    outline.data = { title, id, parent }
    outline.prop('Title', new PDF.String(title))
    outline.prop('A', new PDF.Dictionary({
      S: 'GoTo',
      D: doc.catalog.properties.get('Dests').object.properties.get(id)
    }))
    outlinesObjects.push(outline)
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
}
