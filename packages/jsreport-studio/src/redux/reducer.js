import { combineReducers } from 'redux'
import { connectRouter } from 'connected-react-router'

import entities from './entities/reducer'
import editor from './editor/reducer'
import progress from './progress/reducer'
import settings from './settings/reducer'
import modal from './modal/reducer'

export default (history) => {
  const reducer = combineReducers({
    router: connectRouter(history),
    entities,
    editor,
    progress,
    settings,
    modal
  })

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
