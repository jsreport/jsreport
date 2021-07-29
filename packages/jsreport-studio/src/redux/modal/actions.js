import * as ActionTypes from './constants.js'

export const open = () => ({
  type: ActionTypes.OPEN
})

export function close () {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.CLOSE
    })
  }
}
