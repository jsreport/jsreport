import 'should'
import { createStore, applyMiddleware } from 'redux'
import createReducer from '../../../src/redux/reducer'
import { onLocationChanged } from '../../../src/lib/connected-react-router'
import { thunk } from 'redux-thunk'
import _assign from 'lodash/assign'
import { stub as api } from '../../../src/helpers/api'
import Invariant from 'redux-immutable-state-invariant'
import { values as configuration } from '../../../src/lib/configuration'

export const itAsync = (name, fn) => {
  it(name, (done) => {
    fn().then(done).catch(done)
  })
}

const actionHistoryMiddleware = (router) => ({ dispatch, getState }) => (next) => (action) => {
  router[action.type] = action
  next(action)
}

export const describeAsyncStore = (name, nestedDescribe) => {
  const store = {}
  const router = {}

  describe(name, () => {
    beforeEach(() => {
      Object.keys(router).forEach((a) => delete router[a])
      // eslint-disable-next-line no-import-assign
      configuration.entitySets = { testEntity: { nameAttribute: 'name', referenceAttributes: ['name', 'shortid'] } }

      const reducer = createReducer()

      const rootReducer = (state, action) => {
        if (action.type === '@RESET') {
          return reducer(undefined, action)
        }

        if (action.type === '@UPDATE') {
          return _assign({}, state, action.value)
        }

        return reducer(state, action)
      }

      const _store = createStore(rootReducer, applyMiddleware(thunk, Invariant(), actionHistoryMiddleware(router)))
      _store.dispatch({ type: '@RESET' })
      _store.dispatch(onLocationChanged({ pathname: '/' }, 'POP', true))
      store.update = (val) => _store.dispatch({ type: '@UPDATE', value: val })
      store.getState = _store.getState
      store.dispatch = _store.dispatch
    })

    nestedDescribe({ store: store, api: api, router })
  })
}
