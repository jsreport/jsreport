import 'should'
import { actions, ActionTypes } from '../../../../src/redux/entities'
import { describeAsyncStore, itAsync } from '../asyncStore.js'

describeAsyncStore('entities.actions.save', async ({ store, api, history }) => {
  itAsync('should patch to API if entity not __isNew and clear __isDirty', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity', __isDirty: true, _id: '1' } } })
    let called = false
    api.patch((p) => { called = true })

    await store.dispatch(actions.save('1'))
    called.should.be.ok()
    store.getState().entities['1'].__isDirty.should.not.be.ok()
  })

  itAsync('patch should prune meta properties before sending', async () => {
    store.update({
      entities: {
        1: {
          __entitySet: 'testEntity',
          __isNew: false,
          __isDirty: true,
          __name: 'name',
          '@foo': 'foo',
          _id: '1'
        }
      }
    })

    api.patch((p, opts) => {
      opts.data.should.have.property('_id')
      opts.data.should.not.have.property('__entitySet')
      opts.data.should.not.have.property('__isNew')
      opts.data.should.not.have.property('__isDirty')
      opts.data.should.not.have.property('@foo')
    })

    await store.dispatch(actions.save('1'))
  })

  itAsync('patch trigger API_START and API_DONE events', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity', _id: '1' } } })
    api.patch((p) => { })

    await store.dispatch(actions.save('1'))
    history.should.have.key(ActionTypes.API_START)
    history.should.have.key(ActionTypes.API_DONE)
  })

  itAsync('patch trigger API_FAILED when API throws', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity' } } })
    api.patch((p) => { throw new Error('api error') })

    try {
      await store.dispatch(actions.save('1'))
    } catch (e) {
      history.should.have.key(ActionTypes.API_FAILED)
    }
  })

  itAsync('should post to API if entity __isNew, update the _id, __isNew and __isDirty', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity', __isNew: true, __isDirty: true, _id: '1' } } })
    api.post((p) => ({ _id: '2' }))

    await store.dispatch(actions.save('1'))

    store.getState().entities.should.have.property('2')
    store.getState().entities['2'].__isDirty.should.not.be.ok()
    store.getState().entities['2'].__isNew.should.not.be.ok()
  })

  itAsync('post should prune meta properties before sending', async () => {
    store.update({
      entities: {
        1: {
          __entitySet: 'testEntity',
          __isNew: true,
          __isDirty: true,
          __name: 'name',
          '@foo': 'foo',
          _id: '1'
        }
      }
    })

    api.post((p, opts) => {
      opts.data.should.not.have.property('__entitySet')
      opts.data.should.not.have.property('__isNew')
      opts.data.should.not.have.property('__isDirty')
      opts.data.should.not.have.property('@foo')
      return { _id: '2' }
    })

    await store.dispatch(actions.save('1'))
  })

  itAsync('post trigger API_START and API_DONE events', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity', __isNew: true, _id: '1' } } })
    api.post((p) => ({ _id: '2' }))

    await store.dispatch(actions.save('1'))
    history.should.have.key(ActionTypes.API_START)
    history.should.have.key(ActionTypes.API_DONE)
  })

  itAsync('post trigger API_FAILED when API throws', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity', __isNew: true } } })
    api.post((p) => { throw new Error('api error') })

    try {
      await store.dispatch(actions.save('1'))
    } catch (e) {
      history.should.have.key(ActionTypes.API_FAILED)
    }
  })
})
