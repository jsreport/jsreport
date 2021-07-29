import 'should'
import { actions } from '../../../../src/redux/editor'
import { describeAsyncStore, itAsync } from './../asyncStore.js'

describeAsyncStore('editor.actions.activateTab', ({ store, api, history }) => {
  itAsync('should update state to new tab key', async () => {
    store.update({ editor: { tabs: [{ key: '1' }] } })

    await store.dispatch(actions.activateTab('1'))

    store.getState().editor.activeTabKey.should.be.eql('1')
  })

  itAsync('should set lastActiveTemplateKey if new tab has entitySet eql templates', async () => {
    store.update({ editor: { tabs: [{ key: '1' }, { key: '2', entitySet: 'templates', _id: '3' }] } })

    await store.dispatch(actions.activateTab('2'))

    store.getState().editor.lastActiveTemplateKey.should.be.eql('3')
  })
})
