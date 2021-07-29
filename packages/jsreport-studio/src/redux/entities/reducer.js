import _omit from 'lodash/omit'
import createReducer from '../createReducer.js'
import * as ActionTypes from './constants.js'
import { entitySets } from '../../lib/configuration.js'

const reducer = createReducer({})
export default reducer.export()

const getMetaReferenceAttributes = (e) => {
  const entitySet = entitySets[e.__entitySet]

  const result = {
    __name: e.name
  }

  entitySet.referenceAttributes.filter((a) => a !== 'name' && e[a] != null).forEach((a) => (result['__' + a] = e[a]))

  return result
}

const getReferenceAttributes = (e) => {
  const entitySet = entitySets[e.__entitySet]

  const result = {
    name: e.__name
  }

  entitySet.referenceAttributes.filter((a) => a !== 'name').forEach((a) => (result[a] = e['__' + a]))

  return result
}

reducer.handleAction(ActionTypes.LOAD, (state, action) => ({
  ...state,
  [action.entity._id]: Object.assign({}, state[action.entity._id], action.entity, {
    __isLoaded: true
  }, getMetaReferenceAttributes(state[action.entity._id]))
}))

reducer.handleActions([ActionTypes.UPDATE, ActionTypes.DEBOUNCED_UPDATE], (state, action) => ({
  ...state,
  [action.entity._id]: Object.assign({}, state[action.entity._id], action.entity, { __isDirty: true })
}))

reducer.handleAction(ActionTypes.ADD, (state, action) => ({
  ...state,
  [action.entity._id]: Object.assign({}, state[action.entity._id], action.entity, {
    __isDirty: true,
    __isNew: true
  }, getMetaReferenceAttributes(action.entity))
}))

reducer.handleAction(ActionTypes.ADD_EXISTING, (state, action) => ({
  ...state,
  [action.entity._id]: Object.assign({}, action.entity, getMetaReferenceAttributes(action.entity))
}))

reducer.handleAction(ActionTypes.SAVE, (state, action) => ({
  ...state,
  [action._id]: Object.assign({}, state[action._id], { __isDirty: false }, getMetaReferenceAttributes(state[action._id]))
}))

reducer.handleAction(ActionTypes.SAVE_NEW, (state, action) => _omit({
  ...state,
  [action.entity._id]: Object.assign({}, state[action.oldId], action.entity, {
    __isDirty: false,
    __isNew: false
  }, getMetaReferenceAttributes(Object.assign({}, state[action.oldId], action.entity)))
}, action.oldId))

reducer.handleAction(ActionTypes.REPLACE, (state, action) => _omit({
  ...state,
  [action.entity._id]: Object.assign({}, state[action.oldId], action.entity, {
    __isDirty: false,
    __isNew: false,
    __isLoaded: action.entity.__isLoaded
  }, getMetaReferenceAttributes(action.entity))
}, action.oldId))

reducer.handleAction(ActionTypes.LOAD_REFERENCES, (state, action) => {
  const newStateRef = Object.assign({}, state)
  action.entities.forEach((e) => {
    e.__entitySet = action.entitySet
    e.__name = e.name
    newStateRef[e._id] = e
  })
  return newStateRef
})

reducer.handleAction(ActionTypes.REMOVE, (state, action) => _omit({ ...state }, [action._id, ...(action.children != null ? action.children : [])]))

reducer.handleAction(ActionTypes.UNLOAD, (state, action) => {
  if (state[action._id].__isNew) {
    return _omit({ ...state }, action._id)
  }

  return {
    ...state,
    [action._id]: Object.assign({
      __isDirty: false,
      __isLoaded: false,
      __entitySet: state[action._id].__entitySet,
      __isNew: state[action._id].__isNew,
      _id: action._id
    }, getReferenceAttributes(state[action._id]))
  }
})

reducer.handleAction(ActionTypes.UNLOAD_ALL, (state, action) => {
  return {}
})
