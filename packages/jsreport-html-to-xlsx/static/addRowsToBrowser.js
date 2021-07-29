// eslint-disable-next-line no-unused-vars
function addRows (placeholderRowId, rowsStr) {
  var placeholderRowNode = document.getElementById(placeholderRowId)
  var templateNode = document.createElement('template')

  var findParentTableNode = function (node) {
    var currentNode = node

    while (currentNode.tagName !== 'TABLE') {
      currentNode = currentNode.parentNode
    }

    return currentNode
  }

  templateNode.innerHTML = rowsStr

  var tableNode = findParentTableNode(placeholderRowNode)
  var commentRef = document.createComment('row-placeholder-end')

  placeholderRowNode.parentNode.insertBefore(commentRef, placeholderRowNode.nextSibling)
  placeholderRowNode.parentNode.insertBefore(templateNode.content, commentRef)

  var rowRef = placeholderRowNode.nextElementSibling
  var rows = []

  placeholderRowNode.parentNode.removeChild(placeholderRowNode)

  var currentNode = rowRef

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
