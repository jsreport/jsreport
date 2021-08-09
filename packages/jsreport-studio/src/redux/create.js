import { createStore as _createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'
import { routerMiddleware } from 'connected-react-router'
import { enableBatching } from 'redux-batched-actions'
import groupUpdate from './middlewares/groupUpdate'
import { setStore as setStoreForMethods } from './methods'

const logger = createLogger()

export default function createStore (history) {
  const reduxRouterMiddleware = routerMiddleware(history)
  const middleware = [thunk, reduxRouterMiddleware, groupUpdate]

  let finalCreateStore

  finalCreateStore = applyMiddleware(...middleware)(_createStore)

  const reducer = require('./reducer')(history)
  const store = finalCreateStore(enableBatching(reducer))

  if (__DEVELOPMENT__ && module.hot) {
    module.hot.accept('./reducer', () => {
      store.replaceReducer(require('./reducer')(history))
    })
  }

  setStoreForMethods(store)

  return store
}
