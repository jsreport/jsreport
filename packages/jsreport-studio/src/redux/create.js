import { createStore as _createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'
import { routerMiddleware } from 'connected-react-router'
import { enableBatching } from 'redux-batched-actions'
import { composeWithDevTools } from '@redux-devtools/extension'
import groupUpdate from './middlewares/groupUpdate'
import { setStore as setStoreForMethods } from './methods'

const logger = createLogger()

export default function createStore (history) {
  const reduxRouterMiddleware = routerMiddleware(history)
  const middleware = [thunk, reduxRouterMiddleware, groupUpdate]

  let finalCreateStore

  // eslint-disable-next-line no-undef
  if (__DEVELOPMENT__) {
    const invariant = require('redux-immutable-state-invariant').default()
    finalCreateStore = applyMiddleware(invariant, ...middleware, logger)
    finalCreateStore = composeWithDevTools(finalCreateStore)
  } else {
    finalCreateStore = applyMiddleware(...middleware)
  }

  finalCreateStore = finalCreateStore(_createStore)

  const reducer = require('./reducer').default(history)
  const store = finalCreateStore(enableBatching(reducer))

  // eslint-disable-next-line no-undef
  if (__DEVELOPMENT__ && import.meta.webpackHot) {
    import.meta.webpackHot.accept('./reducer', () => {
      store.replaceReducer(require('./reducer').default(history))
    })
  }

  setStoreForMethods(store)

  return store
}
