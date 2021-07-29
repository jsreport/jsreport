import * as ActionTypes from './constants.js'
import * as EntityActionTypes from '../entities/constants.js'
import shortid from 'shortid'
import createReducer from '../createReducer.js'

const reducer = createReducer({
  contentId: null,
  isOpen: false,
  text: null
})
export default reducer.export()

reducer.handleAction(ActionTypes.OPEN, (state) => ({
  ...state,
  contentId: shortid.generate(),
  isOpen: true,
  text: null
}))

reducer.handleAction(ActionTypes.CLOSE, (state) => ({
  ...state,
  contentId: shortid.generate(),
  isOpen: false,
  text: null
}))

reducer.handleAction(EntityActionTypes.API_FAILED, (state, action) => {
  if (action.ignoreModal === true) {
    return state
  }

  return {
    ...state,
    contentId: shortid.generate(),
    isOpen: true,
    text: action.error.message
  }
})
