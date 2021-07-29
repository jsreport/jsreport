
export default (tagSet, tagShortId) => {
  let tag

  const found = tagSet.some((tagInSet) => {
    tag = tagInSet
    return tagInSet.shortid === tagShortId
  })

  if (found) {
    return tag
  }

  return undefined
}
