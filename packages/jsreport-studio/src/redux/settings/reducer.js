import * as ActionTypes from './constants.js'
import createReducer from '../createReducer.js'
import zipObject from 'lodash/zipObject'

const reducer = createReducer({})

export default reducer.export()

reducer.handleAction([ActionTypes.SETTINGS_LOAD], (state, action) => zipObject(action.settings.map((s) => s._id), action.settings))

reducer.handleAction([ActionTypes.SETTINGS_UPDATE], (state, action) => ({
  ...state,
  [action.setting._id]: action.setting
}))
