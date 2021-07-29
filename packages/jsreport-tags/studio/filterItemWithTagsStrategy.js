
export default (entity, entitySets, filterInfo) => {
  const { tags } = filterInfo
  const allTagsInEntity = entity.tags || []

  if (tags == null) {
    return true
  }

  if (tags.length > 0) {
    return tags.every((tag) => {
      return allTagsInEntity.some((tagInEntity) => tagInEntity.shortid === tag.shortid)
    })
  }

  return true
}
