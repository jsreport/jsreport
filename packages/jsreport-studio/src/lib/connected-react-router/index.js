import createConnectedRouter from './ConnectedRouter'
import createConnectRouter from './reducer'
import createSelectors from './selectors'

const plainStructure = {
  fromJS: value => value,
  getIn,
  merge: (state, payload) => ({ ...state, ...payload }),
  toJS: value => value
}

export { LOCATION_CHANGE, CALL_HISTORY_METHOD, onLocationChanged, push, replace, go, goBack, goForward, routerActions } from './actions'
export { default as routerMiddleware } from './middleware'

// eslint-disable-next-line
export const ConnectedRouter = /*#__PURE__*/ createConnectedRouter(plainStructure)
// eslint-disable-next-line
export const connectRouter = /*#__PURE__*/ createConnectRouter(plainStructure)
// eslint-disable-next-line
export const { getLocation, getAction, getHash, getRouter, getSearch, createMatchSelector } = /*#__PURE__*/ createSelectors(plainStructure)

function getIn (state, path) {
  if (!state) {
    return state
  }

  const length = path.length
  if (!length) {
    return undefined
  }

  let result = state
  for (let i = 0; i < length && !!result; ++i) {
    result = result[path[i]]
  }

  return result
}
