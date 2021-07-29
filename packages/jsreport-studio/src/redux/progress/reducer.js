import * as ActionTypes from './constants.js'
import { ActionTypes as EntityActionTypes } from '../entities'
import createReducer from '../createReducer.js'

const reducer = createReducer({
  isPending: false
})
export default reducer.export()

reducer.handleActions([ActionTypes.PROGRESS_START, EntityActionTypes.API_START], (state) => ({
  ...state,
  isPending: true
}))

reducer.handleActions([ActionTypes.PROGRESS_END, EntityActionTypes.API_FAILED, EntityActionTypes.API_DONE], (state) => ({
  ...state,
  isPending: false
}))
