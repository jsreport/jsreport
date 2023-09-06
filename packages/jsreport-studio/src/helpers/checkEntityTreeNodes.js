
export function checkIsGroupNode (node) {
  return node.isEntitySet === true || node.isGroup === true
}

export function checkIsGroupEntityNode (node) {
  if (checkIsGroupNode(node)) {
    return node.isEntity === true
  }

  return false
}

export function checkIsNodeEditSelected (editSelection, node) {
  if (editSelection == null) {
    return false
  }

  if (checkIsGroupNode(node) && !checkIsGroupEntityNode(node)) {
    return false
  }

  return editSelection.find((id) => node.data._id === id) != null
}
