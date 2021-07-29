import should from 'should'
import { actions } from '../../../../src/redux/editor'
import * as entities from '../../../../src/redux/entities'
import { describeAsyncStore, itAsync } from './../asyncStore.js'

describeAsyncStore('editor.actions.closeTab', ({ store, api, history }) => {
  itAsync('should remove tab from collection and unload', async () => {
    store.update({
      entities: { 1: { __entitySet: 'testEntity', _id: '1', shortid: 'foo' } },
      editor: { tabs: [{ key: '1', _id: '1', type: 'entity', entitySet: 'testEntity' }], activeTabKey: '1' }
    })

    await store.dispatch(actions.closeTab('1'))

    history.should.have.key(entities.ActionTypes.UNLOAD)
    history[entities.ActionTypes.UNLOAD]._id.should.be.eql('1')

    store.getState().editor.tabs.should.have.length(0)
    should(store.getState().editor.activeTabKey).not.be.ok()
    should(store.getState().editor.lastActiveTemplateKey).not.be.ok()
  })

  itAsync('should activate the next tab if the current is active', async () => {
    store.update({
      editor: { tabs: [{ key: '1' }, { key: '2' }], activeTabKey: '1' }
    })

    await store.dispatch(actions.closeTab('1'))

    store.getState().editor.activeTabKey.should.be.eql('2')
  })

  itAsync('should activate the closest tab if the current is active', async () => {
    store.update({
      editor: { tabs: [{ key: '1' }, { key: '2' }], activeTabKey: '2' }
    })

    await store.dispatch(actions.closeTab('2'))

    store.getState().editor.activeTabKey.should.be.eql('1')
  })

  itAsync('should keep selected tab if not closing the current', async () => {
    store.update({
      editor: { tabs: [{ key: '1' }, { key: '2' }], activeTabKey: '2' }
    })

    await store.dispatch(actions.closeTab('1'))

    store.getState().editor.activeTabKey.should.be.eql('2')
  })

  itAsync('should update lastActiveTemplateKey with new activeTabKey', async () => {
    store.update({
      editor: { tabs: [{ key: '1' }, { key: '2', _id: '2', entitySet: 'templates' }], activeTabKey: '1' }
    })

    await store.dispatch(actions.closeTab('1'))

    store.getState().editor.lastActiveTemplateKey.should.be.eql('2')
  })

  itAsync('should keep lastActiveTemplateKey if new active tab not eligible', async () => {
    store.update({
      editor: { tabs: [{ key: '1' }, { key: '2', _id: '2' }, { key: '3', _id: '3', __entitySet: 'templates' }], activeTab: '1', lastActiveTemplateKey: '3' }
    })

    await store.dispatch(actions.closeTab('1'))

    store.getState().editor.lastActiveTemplateKey.should.be.eql('3')
  })
})
