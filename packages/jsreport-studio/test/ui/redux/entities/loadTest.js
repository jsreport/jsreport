import 'should'
import { actions, ActionTypes } from '../../../../src/redux/entities'
import { describeAsyncStore, itAsync } from '../asyncStore.js'

describeAsyncStore('entities.actions.load', async ({ store, api, history }) => {
  itAsync('should request API and update state with entity', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity' } } })
    api.get((p) => ({ value: [{ _id: '1', name: 'foo' }] }))

    await store.dispatch(actions.load('1'))
    store.getState().entities['1'].name.should.be.eql('foo')
  })

  itAsync('should not request API if already loaded', async () => {
    store.update({ entities: { 1: { __isLoaded: true, __entitySet: 'testEntity' } } })
    let called = false
    api.get((p) => (called = true))

    await store.dispatch(actions.load('1'))
    called.should.be.False()
  })

  itAsync('should request API if loaded but forced by param', async () => {
    store.update({ entities: { 1: { __isLoaded: true, __entitySet: 'testEntity' } } })
    api.get((p) => ({ value: [{ _id: '1', prop: 'foo' }] }))

    await store.dispatch(actions.load('1', true))
    store.getState().entities['1'].prop.should.be.eql('foo')
  })

  itAsync('should not request API if already entity is new - not yet persisted', async () => {
    store.update({ entities: { 1: { __isNew: true, __entitySet: 'testEntity' } } })
    let called = false
    api.get((p) => (called = true))

    await store.dispatch(actions.load('1'))
    called.should.be.False()
  })

  itAsync('should trigger API_START and API_DONE events', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity' } } })
    api.get((p) => ({ value: [{ _id: '1', name: 'foo' }] }))

    await store.dispatch(actions.load('1'))
    history.should.have.key(ActionTypes.API_START)
    history.should.have.key(ActionTypes.API_DONE)
  })

  itAsync('should trigger API_FAILED when remote call fails', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity' } } })
    api.get((p) => { throw new Error('API failed') })

    try {
      await store.dispatch(actions.load('1'))
    } catch (e) {
      history.should.have.key(ActionTypes.API_FAILED)
    }
  })
})
