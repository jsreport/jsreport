// eslint-disable-next-line no-unused-vars
function addRows (placeholderRowId, rowsStr) {
  const placeholderRowNode = document.getElementById(placeholderRowId)
  const templateNode = document.createElement('template')

  const findParentTableNode = function (node) {
    let currentNode = node

    while (currentNode.tagName !== 'TABLE') {
      currentNode = currentNode.parentNode
    }

    return currentNode
  }

  templateNode.innerHTML = rowsStr

  const tableNode = findParentTableNode(placeholderRowNode)
  const commentRef = document.createComment('row-placeholder-end')

  placeholderRowNode.parentNode.insertBefore(commentRef, placeholderRowNode.nextSibling)
  placeholderRowNode.parentNode.insertBefore(templateNode.content, commentRef)

  const rowRef = placeholderRowNode.nextElementSibling
  const rows = []

  placeholderRowNode.parentNode.removeChild(placeholderRowNode)

  let currentNode = rowRef

  // is comment
  while (currentNode && currentNode.nodeType !== 8 && currentNode.data !== 'row-placeholder-end') {
    if (currentNode.nodeType === 1 && currentNode.tagName === 'TR') {
      rows.push(tableNode.evaluateRow(currentNode))
    }
    currentNode = currentNode.nextSibling
  }

  commentRef.parentNode.replaceChild(placeholderRowNode, commentRef)

  return rows
}
