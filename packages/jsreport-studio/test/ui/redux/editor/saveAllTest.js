import 'should'
import { actions, ActionTypes } from '../../../../src/redux/editor'
import * as entities from '../../../../src/redux/entities'
import { describeAsyncStore, itAsync } from './../asyncStore.js'

describeAsyncStore('editor.actions.saveAll', ({ store, api, history }) => {
  itAsync('should dispatch ENTITIES_SAVE for each tab, SAVE_STARTED and SAVE_SUCCESS', async () => {
    api.patch((p) => ({}))

    store.update({
      entities: { 1: { __entitySet: 'testEntity', _id: '1', shortid: 'foo', __isDirty: true } },
      editor: { tabs: [{ key: '1', _id: '1', type: 'entity', entitySet: 'testEntity' }], activeTab: '1' }
    })

    await store.dispatch(actions.saveAll())

    history.should.have.key(entities.ActionTypes.SAVE)
    history[entities.ActionTypes.SAVE]._id.should.be.eql('1')
    history.should.have.key(ActionTypes.SAVE_STARTED)
    history.should.have.key(ActionTypes.SAVE_SUCCESS)
  })
})
