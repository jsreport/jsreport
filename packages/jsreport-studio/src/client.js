import PropTypes from 'prop-types'
import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { createBrowserHistory } from 'history'
import { ConnectedRouter } from 'connected-react-router'
import ReactModal from 'react-modal'
import zipObject from 'lodash/zipObject'
import './theme/style.css'
import createStore from './redux/create'
import getRoutes from './routes'
import fetchExtensions from './lib/fetchExtensions'
import * as entities from './redux/entities'
import * as settings from './redux/settings'
import { values as configuration, rootPath } from './lib/configuration'
import getEntityTreeOrder from './helpers/getEntityTreeOrder'

window.React = React
// NOTE: we add this alias just to be able to support compatibility between
// older extensions and studio with react 16, we plan to remove remove this line in v3
window.React.PropTypes = PropTypes

ReactModal.setAppElement(getAppElement())

// eslint-disable-next-line no-undef, camelcase
__webpack_public_path__ = rootPath() + '/studio/assets/'

// we need to require the configurationDefaults, and Studio files api at this point because it requires some component files
// that need to be evaluated/executed after we set the correct __webpack_public_path__
const defaults = require('./configurationDefaults').default
const { createStudio } = require('./Studio')

defaults()

const browserHistory = createBrowserHistory()
const store = createStore(browserHistory)

const Studio = window.Studio = createStudio(store)

const start = async () => {
  await fetchExtensions()

  const extensionsArray = await Studio.api.get('/api/extensions')

  // eslint-disable-next-line
  configuration.extensions = zipObject(extensionsArray.map((e) => e.name), extensionsArray)

  const oldMonacoGetWorkerUrl = window.MonacoEnvironment.getWorkerUrl

  // we override the function created by monaco-editor-webpack-plugin because
  // it does not require chunks with cache in mind
  window.MonacoEnvironment.getWorkerUrl = function (...args) {
    const url = oldMonacoGetWorkerUrl.apply(window.MonacoEnvironment, args)
    return `${url}?${configuration.extensions.studio.options.serverStartupHash}`
  }

  // eslint-disable-next-line
  for (const key in Studio.initializeListeners) {
    await Studio.initializeListeners[key]()
  }

  // add folders to referenceAttributes for all entities
  Object.keys(Studio.entitySets).forEach((entitySetName) => {
    const entitySet = Studio.entitySets[entitySetName]

    if (entitySet.referenceAttributes.indexOf('folder') === -1) {
      entitySet.referenceAttributes.push('folder')
    }
  })

  // calculate EntityTree order after initializeListeners
  // eslint-disable-next-line
  configuration.entityTreeOrder = getEntityTreeOrder(
    configuration.extensions.studio.options.entityTreeOrder,
    Studio.entitySets
  )

  // check is user theme preference is another than the default one, if yes change the theme
  if (Studio.getCurrentTheme().theme !== configuration.extensions.studio.options.theme) {
    await new Promise((resolve) => {
      Studio.setCurrentTheme({
        theme: Studio.getCurrentTheme().theme
      }, {
        onComplete: resolve,
        onError: resolve
      })
    })
  }

  await Promise.all(
    [
      entities.actions.loadReferences()(store.dispatch),
      Studio.api.get('/studio/text-search-docProps').then((entitySets) => {
        // eslint-disable-next-line
        configuration.entitySetsDocProps = entitySets.reduce((acu, item) => {
          acu[item.entitySet] = item.documentProps
          return acu
        }, {})
      }),
      // eslint-disable-next-line
      Studio.api.get('/api/version', { parseJSON: false }).then((version) => (configuration.version = version)),
      // eslint-disable-next-line
      Studio.api.get('/api/engine').then((engines) => (configuration.engines = engines)),
      // eslint-disable-next-line
      Studio.api.get('/api/recipe').then((recs) => (configuration.recipes = recs)),
      settings.actions.load()(store.dispatch)
    ]
  )

  const routes = getRoutes(window.Studio.routes)

  const component = (
    <ConnectedRouter history={browserHistory}>
      {routes}
    </ConnectedRouter>
  )

  ReactDOM.render(
    <React.StrictMode>
      <Provider store={store} key='provider'>
        {component}
      </Provider>
    </React.StrictMode>,
    getAppElement()
  )

  document.getElementById('loader').style.display = 'none'

  // eslint-disable-next-line
  for (const key in Studio.readyListeners) {
    await Studio.readyListeners[key]()
  }
}

function getAppElement () {
  return document.getElementById('content')
}

start()
