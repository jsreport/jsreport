import should from 'should'
import { actions } from '../../../../src/redux/entities'
import { describeAsyncStore, itAsync } from '../asyncStore.js'

describeAsyncStore('entities.actions.unload', async ({ store, api, history }) => {
  itAsync('should false __isLoaded', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity', __isLoaded: true } } })
    await store.dispatch(actions.unload('1'))

    store.getState().entities['1'].__isLoaded.should.not.be.ok()
  })

  itAsync('should false __isLoaded', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity', __name: 'original', name: 'changed', __isNew: false, _id: '1' } } })
    await store.dispatch(actions.unload('1'))

    store.getState().entities['1'].name.should.be.eql('original')
    store.getState().entities['1'].__isLoaded.should.not.be.ok()
  })

  itAsync('should false __isDirty', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity', __isDirty: true } } })
    await store.dispatch(actions.unload('1'))

    store.getState().entities['1'].__isDirty.should.not.be.ok()
  })

  itAsync('should remove all additional loaded properties', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity', someBigData: 'foo' } } })
    await store.dispatch(actions.unload('1'))

    should(store.getState().entities['1'].someBigData).not.be.ok()
  })
})
