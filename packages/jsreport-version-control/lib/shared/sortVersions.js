
module.exports = function sortVersions (versions, sortType) {
  if (sortType !== 'ASC' && sortType !== 'DESC') {
    throw new Error(`Invalid ${sortType} passed when trying to sort versions`)
  }

  return versions.sort((a, b) => {
    if (sortType === 'ASC') {
      return a.creationDate - b.creationDate
    } else {
      return b.creationDate - a.creationDate
    }
  })
}
