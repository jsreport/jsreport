import * as ActionTypes from './constants.js'
import * as selectors from './selectors.js'
import * as ProgressActionTypes from '../progress/constants'
import api from '../../helpers/api.js'

export const load = () => {
  return async (dispatch) => {
    const response = await api.get('/odata/settings')

    dispatch({
      type: ActionTypes.SETTINGS_LOAD,
      settings: response.value
    })
  }
}

export const update = (key, value) => {
  const svalue = typeof value !== 'string' ? JSON.stringify(value) : value

  return async (dispatch, getState) => {
    try {
      dispatch({
        type: ProgressActionTypes.PROGRESS_START
      })

      const existingEntry = selectors.getByKey(getState().settings, key, false)
      let _id
      if (existingEntry) {
        _id = existingEntry._id
        await api.patch(`/odata/settings(${existingEntry._id})`, {
          data: {
            ...existingEntry,
            value: svalue
          }
        })
      } else {
        const response = await api.post('/odata/settings', {
          data: {
            key: key,
            value: svalue
          }
        })
        _id = response._id
      }

      dispatch({
        type: ActionTypes.SETTINGS_UPDATE,
        setting: {
          _id: _id,
          key: key,
          value: svalue
        }
      })
    } finally {
      dispatch({
        type: ProgressActionTypes.PROGRESS_END
      })
    }
  }
}
