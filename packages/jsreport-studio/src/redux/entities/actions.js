import * as ActionTypes from './constants'
import api from '../../helpers/api'
import * as selectors from './selectors'
import { values as configuration } from '../../lib/configuration'

export const prune = (entity) => {
  const pruned = {}
  Object.keys(entity).forEach((k) => {
    if (k.indexOf('__') !== 0 && k.indexOf('@')) {
      pruned[k] = entity[k]
    }
  })

  return pruned
}

export function update (entity) {
  if (!entity || !entity._id) {
    throw new Error('Invalid entity submitted to update')
  }

  return (dispatch) => dispatch({
    type: ActionTypes.UPDATE,
    entity: entity
  })
}

export function groupedUpdate (entity) {
  if (!entity || !entity._id) {
    throw new Error('Invalid entity submitted to debounced update')
  }

  return (dispatch) => dispatch({
    type: ActionTypes.GROUPED_UPDATE,
    entity: entity
  })
}

export function remove (id, children) {
  return async function (dispatch, getState) {
    const entity = selectors.getById(getState().entities, id)

    if (entity.__isNew) {
      return dispatch({
        type: ActionTypes.REMOVE,
        _id: id,
        children
      })
    }

    dispatch(apiStart())
    try {
      await api.del(`/odata/${entity.__entitySet}(${id})`)

      dispatch({
        type: ActionTypes.REMOVE,
        _id: id,
        children
      })

      dispatch(apiDone())
    } catch (e) {
      dispatch(apiFailed(e))
      throw e
    }
  }
}

export function removeExisting (id, children) {
  return (dispatch) => dispatch({
    type: ActionTypes.REMOVE,
    _id: id,
    children
  })
}

export function add (entity) {
  if (!entity || !entity._id) {
    throw new Error('Invalid entity submitted to add')
  }

  // eslint-disable-next-line
  for (const l of configuration.entityNewListeners) {
    l(entity)
  }

  return (dispatch) => dispatch({
    type: ActionTypes.ADD,
    entity: entity
  })
}

export function addExisting (entity) {
  if (!entity || !entity._id) {
    throw new Error('Invalid entity submitted to add')
  }

  return (dispatch) => dispatch({
    type: ActionTypes.ADD_EXISTING,
    entity: entity
  })
}

export function load (id, force) {
  return async function (dispatch, getState) {
    let entity = selectors.getById(getState().entities, id)

    if (!force && (entity.__isLoaded || entity.__isNew)) {
      return entity
    }

    dispatch(apiStart())

    try {
      entity = (await api.get(`/odata/${entity.__entitySet}(${id})`)).value[0]

      dispatch(apiDone())

      dispatch({
        type: ActionTypes.LOAD,
        entity: entity
      })

      return entity
    } catch (e) {
      dispatch(apiFailed(e))
      throw e
    }
  }
}

export function unload (id) {
  return async function (dispatch, getState) {
    return dispatch({
      type: ActionTypes.UNLOAD,
      _id: id
    })
  }
}

export function unloadAll () {
  return async function (dispatch, getState) {
    return dispatch({
      type: ActionTypes.UNLOAD_ALL
    })
  }
}

export function loadReferences () {
  return async function (dispatch) {
    const entitySetNames = Object.keys(configuration.entitySets)
    const data = []

    for (const entitySet of entitySetNames) {
      let entities

      if (configuration.referencesLoader) {
        entities = await configuration.referencesLoader(entitySet)
      } else {
        const referenceAttributes = configuration.entitySets[entitySet].referenceAttributes
        const entitiesUrl = `/odata/${entitySet}?$select=${referenceAttributes}&$orderby=name`
        entities = (await api.get(entitiesUrl)).value
      }

      data.push({
        entitySet,
        entities
      })
    }

    dispatch({
      type: ActionTypes.LOAD_REFERENCES,
      data
    })
  }
}

export const flushUpdates = () => ({
  type: ActionTypes.FLUSH_UPDATES
})

export const apiDone = () => ({
  type: ActionTypes.API_DONE
})

export const apiStart = () => ({
  type: ActionTypes.API_START
})

export const apiFailed = (e, ignoreModal) => ({
  type: ActionTypes.API_FAILED,
  error: e,
  ignoreModal: ignoreModal === true
})

export const replace = (oldId, entity) => ({
  type: ActionTypes.REPLACE,
  oldId: oldId,
  entity: entity
})

export function save (id, { ignoreFailed = false, validateConcurrent = true } = {}) {
  return async function (dispatch, getState) {
    try {
      const entity = Object.assign({}, selectors.getById(getState().entities, id))

      dispatch(apiStart())

      // eslint-disable-next-line
      for (const l of configuration.entitySaveListeners) {
        await l(entity)
      }

      if (entity.__isNew) {
        const oldId = entity._id
        delete entity._id

        const response = await api.post(`/odata/${entity.__entitySet}`, { data: prune(entity) })

        entity._id = response._id

        dispatch(apiDone())

        dispatch({
          type: ActionTypes.SAVE_NEW,
          oldId: oldId,
          entity: response
        })

        entity._id = response._id
      } else {
        let customHeaders

        if (validateConcurrent === true) {
          customHeaders = {
            'X-Validate-Concurrent-Update': true
          }
        }

        await api.patch(`/odata/${entity.__entitySet}(${entity._id})`, {
          headers: customHeaders,
          data: prune(entity)
        })

        if (entity.modificationDate != null) {
          // we need to ensure that after the update the local store gets updated modificationDate too
          // so next updates can work against the concurrent validation
          const res = await api.get(`/odata/${entity.__entitySet}(${entity._id})?$select=modificationDate`)
          const updatedEntity = res.value[0]

          if (updatedEntity && updatedEntity.modificationDate != null) {
            dispatch({
              type: ActionTypes.UPDATE,
              entity: {
                _id: updatedEntity._id,
                modificationDate: updatedEntity.modificationDate
              }
            })
          }
        }

        dispatch(apiDone())

        dispatch({
          type: ActionTypes.SAVE,
          _id: entity._id
        })
      }

      return entity
    } catch (e) {
      e.entityId = id

      if (ignoreFailed !== true) {
        dispatch(apiFailed(e))
      }

      throw e
    }
  }
}
