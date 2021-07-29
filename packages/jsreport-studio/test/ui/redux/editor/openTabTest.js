import 'should'
import { actions } from '../../../../src/redux/editor'
import resolveUrl from '../../../../src/helpers/resolveUrl.js'
import { ActionTypes as EntitiesActionTypes } from '../../../../src/redux/entities'
import { describeAsyncStore, itAsync } from './../asyncStore.js'

describeAsyncStore('editor.actions.openTab', ({ store, api, history }) => {
  itAsync('should add custom tabs collection and activate it', async () => {
    await store.dispatch(actions.openTab({ key: '1' }))
    store.getState().editor.tabs.should.have.length(1)
    store.getState().editor.activeTabKey.should.be.eql('1')
  })

  itAsync('should load entity if _id supplied', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity' } } })
    api.get((p) => ({ value: [{ _id: '1' }] }))

    await store.dispatch(actions.openTab({ _id: '1' }))
    history.should.have.key(EntitiesActionTypes.LOAD)
  })

  itAsync('should be also able to add tab based on shortid', async () => {
    store.update({ entities: { 1: { __entitySet: 'testEntity', shortid: 'foo', __isLoaded: true, _id: '1' } } })

    await store.dispatch(actions.openTab({ shortid: 'foo' }))

    store.getState().editor.tabs[0]._id.should.be.eql('1')
  })

  itAsync('should change route to / if the entity is not found by its shortid', async () => {
    await store.dispatch(actions.openTab({ shortid: 'foo' }))

    history['@@router/CALL_HISTORY_METHOD'].payload.args.should.containEql(resolveUrl('/'))
  })
})
