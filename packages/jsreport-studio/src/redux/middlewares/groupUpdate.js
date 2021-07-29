import { ActionTypes } from '../entities'

// here we are grouping the updates from the ace editor, this is performance optimization
// which avoids the whole state update after every key press, we do only do state update
// after first and last change

let entity
export default (store) => (next) => (action) => {
  if (ActionTypes.GROUPED_UPDATE === action.type) {
    // dispatch the first action always, this will mark the tab as modified
    if (!entity) {
      next({
        type: ActionTypes.UPDATE,
        entity: action.entity
      })
    }

    entity = Object.assign({}, entity, action.entity)
    return
  }

  if (entity) {
    const flush = Object.assign({}, entity)
    entity = null
    store.dispatch({
      type: ActionTypes.UPDATE,
      entity: flush
    })

    // ensures that when the action is update we get the last template content/helpers
    // that was flushed too
    if (action.type === ActionTypes.UPDATE && flush._id === action.entity._id) {
      action.entity = Object.assign({}, action.entity, flush)
    }
  }

  return next(action)
}
