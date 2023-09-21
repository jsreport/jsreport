import { checkIsGroupNode, checkIsGroupEntityNode } from './checkEntityTreeNodes'

function getEntityTreeCollapsedDefaultValue (node) {
  if (checkIsGroupNode(node) && !checkIsGroupEntityNode(node)) {
    return false
  }

  return true
}

export default getEntityTreeCollapsedDefaultValue
