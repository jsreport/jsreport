import { createSelector } from 'reselect'
import resolveEntityPath from '../../helpers/resolveEntityPath'
import { values as configuration } from '../../lib/configuration'

const getEntities = (state) => state.entities

export const getAll = (entities) => Object.keys(entities).map((e) => entities[e])

export const getById = (entities, id, shouldThrow = true) => {
  if (!entities[id] && shouldThrow) {
    throw new Error(`Unable to find entity with id ${id}`)
  }

  return entities[id]
}

export const createGetByIdSelector = () => {
  return createSelector(
    [getEntities, (_, props) => props.id],
    (entities, id) => getById(entities, id, false)
  )
}

export const getByShortid = (entities, shortid, shouldThrow = true) => {
  const filteredEntities = getAll(entities).filter((e) => e.shortid === shortid)

  if (!filteredEntities.length && shouldThrow) {
    throw new Error(`Unable to find entity with shortid ${shortid}`)
  }

  return filteredEntities.length ? filteredEntities[0] : null
}

export const createGetByShortidSelector = () => {
  return createSelector(
    [getEntities, (_, props) => props.shortid],
    (entities, shortid) => getByShortid(entities, shortid, false)
  )
}

export const getReferences = (entities) => {
  const result = {}

  getAll(entities).forEach((entity) => {
    result[entity.__entitySet] = result[entity.__entitySet] || []
    result[entity.__entitySet].push(entity)
  })

  Object.keys(result).forEach((k) => {
    result[k] = result[k].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
  })

  Object.keys(configuration.entitySets).forEach((e) => (result[e] = result[e] || []))

  return result
}

export const createGetReferencesSelector = () => {
  return createSelector(
    [getEntities],
    getReferences
  )
}

export const getNormalizedEntities = (entities) => {
  const foldersByShortid = Object.keys(entities).reduce((acu, _id) => {
    const entity = entities[_id]
    acu[entity.shortid] = entity
    return acu
  }, {})

  return getAll(entities).map((entity) => {
    return {
      _id: entity._id,
      name: entity.name,
      path: resolveEntityPath(entity, foldersByShortid),
      entity: entity
    }
  })
}

export const createGetNormalizedEntitiesSelector = () => {
  return createSelector(
    [getEntities],
    getNormalizedEntities
  )
}
