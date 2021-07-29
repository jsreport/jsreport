import 'should'
import { actions } from '../../../../src/redux/entities'
import { describeAsyncStore, itAsync } from '../asyncStore.js'

describeAsyncStore('entities.actions.add', async ({ store, api, history }) => {
  itAsync('should include entity in state and set __isNew, __isDirty, __name metadata', async () => {
    const entity = { __entitySet: 'testEntity', name: 'foo', _id: '1' }
    await store.dispatch(actions.add(entity))

    const entityInState = store.getState().entities['1']
    entityInState.__isNew.should.be.ok()
    entityInState.__isDirty.should.be.ok()
    entityInState.__name.should.be.eql('foo')
  })
})
