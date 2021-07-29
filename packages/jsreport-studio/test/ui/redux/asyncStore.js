import 'should'
import { createStore, applyMiddleware } from 'redux'
import createReducer from '../../../src/redux/reducer'
import thunk from 'redux-thunk'
import _assign from 'lodash/assign'
import { stub as api } from '../../../src/helpers/api.js'
import Invariant from 'redux-immutable-state-invariant'
import * as configuration from '../../../src/lib/configuration.js'

export const itAsync = (name, fn) => {
  it(name, (done) => {
    fn().then(done).catch(done)
  })
}

const actionHistoryMiddleware = (history) => ({ dispatch, getState }) => (next) => (action) => {
  history[action.type] = action
  next(action)
}

export const describeAsyncStore = (name, nestedDescribe) => {
  const store = {}
  const history = {}

  describe(name, () => {
    beforeEach(() => {
      Object.keys(history).forEach((a) => delete history[a])
      // eslint-disable-next-line no-import-assign
      configuration.entitySets = { testEntity: { nameAttribute: 'name', referenceAttributes: ['name', 'shortid'] } }

      const reducer = createReducer(history)

      const rootReducer = (state, action) => {
        if (action.type === '@RESET') {
          return reducer(undefined, action)
        }

        if (action.type === '@UPDATE') {
          return _assign({}, state, action.value)
        }

        return reducer(state, action)
      }

      const _store = createStore(rootReducer, applyMiddleware(thunk, Invariant(), actionHistoryMiddleware(history)))
      _store.dispatch({ type: '@RESET' })
      store.update = (val) => _store.dispatch({ type: '@UPDATE', value: val })
      store.getState = _store.getState
      store.dispatch = _store.dispatch
    })

    nestedDescribe({ store: store, api: api, history: history })
  })
}
