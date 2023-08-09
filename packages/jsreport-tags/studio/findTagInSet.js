
export default (tagSet, tagShortId) => {
  if (typeof tagSet.has === 'function') {
    return tagSet.get(tagShortId)
  }

  const found = tagSet.find((tagInSet) => {
    return tagInSet.shortid === tagShortId
  })

  return found
}
