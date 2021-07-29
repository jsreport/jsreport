import 'should'
import { actions } from '../../../../src/redux/entities'
import { describeAsyncStore, itAsync } from '../asyncStore.js'

describeAsyncStore('entities.actions.update', async ({ store, api, history }) => {
  itAsync('should update internal state and set __isDirty', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity' } } })

    await store.dispatch(actions.update({ _id: '1', content: 'foo' }))

    store.getState().entities['1'].content.should.be.eql('foo')
    store.getState().entities['1'].__isDirty.should.be.ok()
  })

  itAsync('should keep original name metadata', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity', __name: 'original' } } })

    await store.dispatch(actions.update({ _id: '1', name: 'foo' }))

    store.getState().entities['1'].__name.should.be.eql('original')
  })
})
