
export default function getVisibleEntitySetsInTree (entitySets) {
  const sets = []

  Object.keys(entitySets).forEach((setName) => {
    const entitySet = entitySets[setName]

    if (entitySet.visibleInTree === false) {
      return
    }

    sets.push(entitySet)
  })

  return sets
}
