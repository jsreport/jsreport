import 'should'
import { actions } from '../../../../src/redux/editor'
import resolveUrl from '../../../../src/helpers/resolveUrl.js'
import { describeAsyncStore, itAsync } from './../asyncStore.js'

describeAsyncStore('editor.actions.updateHistory', ({ store, api, history }) => {
  itAsync('should push to history routes based on active entity', async () => {
    store.update({
      entities: { 1: { __entitySet: 'testEntity', _id: '1', shortid: 'foo' } },
      editor: { tabs: [{ key: '1', _id: '1', type: 'entity', entitySet: 'testEntity' }], activeTabKey: '1' },
      router: { location: { pathname: resolveUrl('/') } }
    })

    await store.dispatch(actions.updateHistory())

    history['@@router/CALL_HISTORY_METHOD'].payload.args.should.containEql(resolveUrl('/studio/testEntity/foo'))
  })

  itAsync('should push to history only if the route is different', async () => {
    store.update({
      entities: { 1: { __entitySet: 'testEntity', _id: '1', shortid: 'foo' } },
      editor: { tabs: [{ key: '1', _id: '1', type: 'entity', entitySet: 'testEntity' }], activeTabKey: '1' },
      router: { location: { pathname: resolveUrl('/studio/testEntity/foo') } }
    })

    await store.dispatch(actions.updateHistory())

    history.should.not.have.key('@@router/CALL_HISTORY_METHOD')
  })
})
