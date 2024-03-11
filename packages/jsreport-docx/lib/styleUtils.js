
function findCommonParent (runEl, parentsHierarchy = []) {
  if (runEl == null || parentsHierarchy.length === 0) {
    return runEl
  }

  const validParents = [...parentsHierarchy]
  let parentEl = runEl

  while (parentEl.parentNode != null) {
    const expectedTag = validParents.shift()
    const currentTag = parentEl.parentNode.tagName

    if (currentTag !== expectedTag) {
      break
    }

    parentEl = parentEl.parentNode

    if (validParents.length === 0) {
      break
    }
  }

  return parentEl
}

module.exports.findCommonParent = findCommonParent
