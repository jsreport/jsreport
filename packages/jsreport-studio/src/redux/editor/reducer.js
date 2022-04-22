import * as ActionTypes from './constants.js'
import { ActionTypes as EntityActionTypes } from '../entities'
import createReducer from '../createReducer.js'
import uid from '../../helpers/uid'
import { previewComponents } from '../../lib/configuration'

const reducer = createReducer({
  tabs: [],
  activeTabKey: null,
  lastActiveTemplateKey: null,
  running: null,
  undockMode: false,
  preview: {
    id: uid(),
    type: 'empty',
    data: null,
    activeTab: null,
    completed: true
  }
})

export default reducer.export()

reducer.handleAction(ActionTypes.OPEN_TAB, (state, { tab }) => {
  const existingTabIndex = state.tabs.findIndex((t) => t.key === tab.key)
  let newTabs

  if (existingTabIndex !== -1) {
    newTabs = [
      ...state.tabs.slice(0, existingTabIndex),
      tab,
      ...state.tabs.slice(existingTabIndex + 1)
    ]
  } else {
    newTabs = [...state.tabs, tab]
  }

  return {
    ...state,
    tabs: newTabs
  }
})

reducer.handleAction(ActionTypes.OPEN_NEW_TAB, (state, { tab, activateTab = true }) => {
  const newState = {
    ...state,
    tabs: [...state.tabs, tab]
  }

  if (activateTab) {
    newState.activeTabKey = tab.key
    newState.lastActiveTemplateKey = (tab.entitySet === 'templates') ? tab._id : state.lastActiveTemplateKey
  }

  return newState
})

reducer.handleActions([EntityActionTypes.REMOVE, ActionTypes.CLOSE_TAB], (state, action) => {
  const newTabs = state.tabs.filter((t) => {
    let shouldStay = t.key !== action.key && (!action._id || t._id !== action._id)

    if (shouldStay && action.children) {
      shouldStay = action.children.every((childId) => {
        return t._id !== childId
      })
    }

    return shouldStay
  })

  let newActiveTabKey = state.activeTabKey

  if (
    state.activeTabKey === action.key ||
    state.activeTabKey === action._id ||
    state.lastActiveTemplateKey === action._id ||
    (
      action.children &&
      action.children.some((childId) => state.activeTabKey === childId)
    )
  ) {
    newActiveTabKey = newTabs.length ? newTabs[newTabs.length - 1].key : null
  }

  const newActiveTab = newActiveTabKey ? newTabs.filter((t) => t.key === newActiveTabKey)[0] : null

  return {
    ...state,
    activeTabKey: newActiveTabKey,
    tabs: newTabs,
    lastActiveTemplateKey: (newActiveTab && newActiveTab.entitySet === 'templates')
      ? newActiveTab._id
      : (newTabs.filter((t) => t._id === state.lastActiveTemplateKey).length ? state.lastActiveTemplateKey : null)
  }
})

reducer.handleAction(ActionTypes.ACTIVATE_TAB, (state, action) => {
  const newTab = state.tabs.filter((t) => t.key === action.key)[0]

  return {
    ...state,
    activeTabKey: action.key,
    lastActiveTemplateKey: newTab.entitySet === 'templates' ? newTab._id : state.lastActiveTemplateKey
  }
})

reducer.handleAction(EntityActionTypes.SAVE_NEW, (state, action) => {
  const indexMap = {}
  const indexes = []
  const tabs = []

  // this code is necessary to support updating header/footer templates
  const modTabs = state.tabs.filter((t, idx) => {
    const keepItem = (t._id === action.oldId)

    if (keepItem) {
      indexes.push(idx)
      indexMap[idx] = indexes.length - 1
    }

    return keepItem
  }).map((tab) => {
    return Object.assign({}, tab, {
      _id: action.entity._id,
      key: tab.key.replace(action.oldId, action.entity._id)
    })
  })

  state.tabs.forEach(function (tab, idx) {
    if (indexes.indexOf(idx) !== -1) {
      return tabs.push(modTabs[indexMap[idx]])
    }

    tabs.push(tab)
  })

  const newActiveTabKey = (state.lastActiveTemplateKey === action.oldId || state.activeTabKey === action.oldId)
    ? ((
      // looking if the last activeTabKey was a header/footer tab
        state.activeTabKey.indexOf(state.lastActiveTemplateKey) === 0 && state.activeTabKey !== state.lastActiveTemplateKey
      )
        ? state.activeTabKey.replace(action.oldId, action.entity._id)
        : action.entity._id)
    : state.activeTabKey

  return {
    ...state,
    tabs: tabs,
    activeTabKey: newActiveTabKey,
    lastActiveTemplateKey: state.lastActiveTemplateKey === action.oldId ? action.entity._id : state.lastActiveTemplateKey
  }
})

reducer.handleAction(EntityActionTypes.REPLACE, (state, action) => {
  if (!state.tabs.filter((t) => t._id === action.oldId).length) {
    return state
  }

  const tabs = state.tabs.map((t) => {
    if (t._id !== action.oldId) {
      return Object.assign({}, t)
    }

    return Object.assign({}, t, {
      _id: action.entity._id,
      key: t.key.replace(action.oldId, action.entity._id)
    })
  })

  const newActiveTabKey = (state.activeTabKey && state.activeTabKey.indexOf(action.oldId) === 0) ? state.activeTabKey.replace(action.oldId, action.entity._id) : state.activeTabKey

  return {
    ...state,
    tabs: tabs,
    activeTabKey: newActiveTabKey,
    lastActiveTemplateKey: state.lastActiveTemplateKey === action.oldId ? action.entity._id : state.lastActiveTemplateKey
  }
})

reducer.handleAction(ActionTypes.RUN_STARTED, (state, action) => {
  return {
    ...state,
    running: action.id
  }
})

reducer.handleAction(ActionTypes.RUN_ENDED, (state, action) => {
  if (state.running != null && state.running === action.id) {
    return {
      ...state,
      running: null
    }
  }

  return state
})

reducer.handleAction(ActionTypes.PREVIEW, (state, action) => {
  let activeTab = null

  const previewType = previewComponents[action.preview.type]

  if (action.preview.activeTab != null) {
    activeTab = action.preview.activeTab
  } else if (state.preview.type === action.preview.type) {
    activeTab = state.preview.activeTab
  } else if (previewType.defaultActiveTab != null) {
    activeTab = previewType.defaultActiveTab
  } else if (previewType.tabs != null && previewType.tabs.length > 0) {
    activeTab = previewType.tabs[0].name
  }

  return {
    ...state,
    preview: { ...action.preview, activeTab }
  }
})

reducer.handleAction(ActionTypes.UPDATE_PREVIEW, (state, action) => {
  if (state.preview.id !== action.preview.id) {
    return state
  }

  return {
    ...state,
    preview: { ...state.preview, ...action.preview }
  }
})

reducer.handleAction(ActionTypes.ACTIVATE_UNDOCK_MODE, (state, action) => {
  return {
    ...state,
    undockMode: true
  }
})

reducer.handleAction(ActionTypes.DESACTIVATE_UNDOCK_MODE, (state, action) => {
  return {
    ...state,
    undockMode: false
  }
})
