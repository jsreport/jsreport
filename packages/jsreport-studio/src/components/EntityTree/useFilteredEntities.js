import { useState } from 'react'
import { entitySets, entityTreeFilterItemResolvers } from '../../lib/configuration.js'

const initialFilterState = {}

function useFilteredEntities (entities) {
  const [filter, setFilter] = useState(initialFilterState)

  const setNewFilter = (newFilterState) => {
    setFilter((prev) => {
      return {
        ...prev,
        ...newFilterState
      }
    })
  }

  return [filterEntities(entities, filter), setNewFilter]
}

function filterEntities (entities, filter) {
  const result = {}

  const allFiltersAreEmpty = Object.keys(filter).every((filterKey) => {
    const filterValue = filter[filterKey]

    if (Array.isArray(filterValue)) {
      return filterValue.length === 0
    }

    return (filterValue === '' || filterValue == null)
  })

  if (allFiltersAreEmpty) {
    return entities
  }

  Object.keys(entities).forEach((k) => {
    result[k] = entities[k].filter((entity) => {
      return entityTreeFilterItemResolvers.every((filterResolver) => {
        const filterResult = filterResolver(entity, entitySets, filter)

        if (typeof filterResult !== 'boolean') {
          throw new Error('filterItemResolver must return boolean values, invalid return found in resolvers')
        }

        return filterResult
      })
    })
  })

  return result
}

export default useFilteredEntities
