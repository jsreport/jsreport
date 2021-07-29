import should from 'should'
import { actions } from '../../../../src/redux/entities'
import { describeAsyncStore, itAsync } from '../asyncStore.js'

describeAsyncStore('entities.actions.loadReference', ({ store, api, history }) => {
  itAsync('should hash results by _id into the state', async () => {
    api.get((p) => ({ value: [{ _id: '1' }, { _id: '2' }] }))

    await store.dispatch(actions.loadReferences('testEntity'))
    store.getState().entities['1']._id.should.be.eql('1')
    store.getState().entities['2']._id.should.be.eql('2')
  })

  itAsync('should add meta attributes to entity: __entitySet __isLoad=false __name', async () => {
    api.get((p) => ({ value: [{ _id: '1', name: 'foo' }] }))

    await store.dispatch(actions.loadReferences('testEntity'))
    store.getState().entities['1'].__entitySet.should.be.eql('testEntity')
    store.getState().entities['1'].__name.should.be.eql('foo')
    should(store.getState().entities['1'].__isLoad).not.be.ok()
  })

  itAsync('should order by name and select name and shortid', async () => {
    api.get((p) => {
      p.should.containEql('/testEntity')
      p.should.containEql('$orderby=name')
      p.should.containEql('$select=name,shortid')
      return { value: [{ _id: '1' }] }
    })

    await store.dispatch(actions.loadReferences('testEntity'))
  })
})
