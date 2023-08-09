import { combineReducers } from 'redux'
import { connectRouter } from 'connected-react-router'

import entities from './entities/reducer'
import editor from './editor/reducer'
import progress from './progress/reducer'
import settings from './settings/reducer'
import modal from './modal/reducer'

export default (history) => {
  let reducersInput = {
    router: connectRouter(history),
    entities,
    editor,
    progress,
    settings,
    modal
  }

  // eslint-disable-next-line no-undef
  if (__DEVELOPMENT__) {
    reducersInput = logSlowReducers(reducersInput)
  }

  const reducer = combineReducers(reducersInput)

  return (state, action) => {
    let currentUndockMode

    if (action.type === 'RESET') {
      const { router } = state

      currentUndockMode = state.editor && state.editor.undockMode != null ? state.editor.undockMode : undefined

      state = { router }
    }

    const newState = reducer(state, action)

    // we preserve the undock state after reset
    if (currentUndockMode != null && newState.editor) {
      newState.editor.undockMode = currentUndockMode
    }

    return newState
  }
}

// CODE FROM: https://github.com/michaelcontento/redux-log-slow-reducers
function logSlowReducers (reducers, thresholdInMs = 8) {
  Object.keys(reducers).forEach((name) => {
    const originalReducer = reducers[name]
    reducers[name] = (state, action) => {
      const start = Date.now()
      const result = originalReducer(state, action)
      const diffInMs = Date.now() - start

      if (diffInMs >= thresholdInMs) {
        console.warn('Reducer "' + name + '" took ' + diffInMs + 'ms for ' + action.type)
      }

      return result
    }
  })
  return reducers
}
