import 'should'
import { actions, ActionTypes } from '../../../../src/redux/entities'
import { describeAsyncStore, itAsync } from '../asyncStore.js'

describeAsyncStore('entities.actions.remove', async ({ store, api, history }) => {
  itAsync('should delete to API and remove entity from state', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity' } } })
    let called = false
    api.del((p) => { called = true })

    await store.dispatch(actions.remove('1'))
    called.should.be.ok()
    store.getState().entities.should.not.have.property('1')
  })

  itAsync('should trigger API_START and API_DONE', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity' } } })
    api.del((p) => { })

    await store.dispatch(actions.remove('1'))
    history.should.have.key(ActionTypes.API_START)
    history.should.have.key(ActionTypes.API_DONE)
  })

  itAsync('should trigger API_FAILED when api call throws', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity' } } })
    api.del((p) => { throw new Error('api failed') })

    try {
      await store.dispatch(actions.remove('1'))
    } catch (e) {
      history.should.have.key(ActionTypes.API_FAILED)
    }
  })
})
