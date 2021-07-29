
function getEntityTreeOrder (entityTreeOrderFromUserOptions, entitySets) {
  let entityTreeOrder = []
  let entityTreeOrderPosition = []
  let entityTreeOrderByUser = entityTreeOrderFromUserOptions || []
  let entitySetsNames = Object.keys(entitySets)

  // filter possibly non-existent entity sets in user configuration
  entityTreeOrderByUser = entityTreeOrderByUser.filter((entityName) => {
    if (entitySetsNames.indexOf(entityName) === -1) {
      return false
    }

    return true
  })

  // first, sort by string, to ensure a default order by entitySet name for
  // entities with no `entityTreePosition`
  entitySetsNames = entitySetsNames.sort()

  // normalizing position values in entities
  entitySetsNames.forEach((entitySetName) => {
    const entitySet = entitySets[entitySetName]
    let entityPosition = entitySet.entityTreePosition

    // ignore if entitySet is in user configuration,
    // the position of this entitySet will always be in the way that the user defined it
    if (entityTreeOrderByUser.indexOf(entitySetName) !== -1) {
      return
    }

    if (entityPosition == null) {
      entityPosition = 0
    }

    entityTreeOrderPosition.push({
      name: entitySetName,
      // index to preserve original order (by name) when we later encounter entity sets with same position
      idx: entityTreeOrderPosition.length,
      position: entityPosition
    })
  })

  // sort based on position values
  entityTreeOrderPosition = entityTreeOrderPosition.sort((a, b) => {
    if (a.position > b.position) {
      return -1
    }

    if (a.position < b.position) {
      return 1
    }

    // when entity sets have the same position, preserve its original order
    return a.idx - b.idx
  })

  entityTreeOrderPosition = entityTreeOrderPosition.map((entity) => entity.name)

  entityTreeOrder = [...entityTreeOrderByUser, ...entityTreeOrderPosition]

  return entityTreeOrder
}

export default getEntityTreeOrder
