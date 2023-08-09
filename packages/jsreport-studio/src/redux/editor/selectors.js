import { selectors } from '../entities'
import { createSelector } from 'reselect'

const getActiveTabKey = (state) => state.editor.activeTabKey
const getLastActiveTemplateKey = (state) => state.editor.lastActiveTemplateKey
const getTabs = (state) => state.editor.tabs
const getEntities = (state) => state.entities

export const getActiveTab = (activeTabKey, tabs) => {
  if (activeTabKey) {
    return tabs.filter((t) => t.key === activeTabKey)[0]
  }

  return null
}

export const createGetActiveTabSelector = () => {
  return createSelector(
    [getActiveTabKey, getTabs],
    getActiveTab
  )
}

export const getTabWithEntities = (tabs, entities) => tabs.map((t) => ({
  entity: t.type === 'entity' ? selectors.getById(entities, t._id) : (typeof t.getEntity === 'function' ? t.getEntity() : null),
  tab: t
}))

export const createGetTabWithEntitiesSelector = () => {
  return createSelector(
    [getTabs, getEntities],
    getTabWithEntities
  )
}

export const getActiveEntity = (activeTabKey, tabs, entities) => {
  if (!activeTabKey) {
    return null
  }

  const tab = getActiveTab(activeTabKey, tabs)

  if (!tab) {
    return null
  }

  return tab.type === 'entity' ? selectors.getById(entities, tab._id, false) : (typeof tab.getEntity === 'function' ? tab.getEntity() : null)
}

export const createGetActiveEntitySelector = () => {
  return createSelector(
    [getActiveTabKey, getTabs, getEntities],
    getActiveEntity
  )
}

export const getActiveTabWithEntity = (activeTabKey, tabs, entities) => {
  const tab = getActiveTab(activeTabKey, tabs)

  if (!tab || (tab.type !== 'entity' && typeof tab.getEntity !== 'function')) {
    return { tab }
  }

  return {
    tab,
    entity: tab.type === 'entity' ? selectors.getById(entities, tab._id) : (typeof tab.getEntity === 'function' ? tab.getEntity() : null)
  }
}

export const createGetActiveTabWithEntitySelector = () => {
  return createSelector(
    [getActiveTabKey, getTabs, getEntities],
    getActiveTabWithEntity
  )
}

export const getLastActiveTemplate = (lastActiveTemplateKey, entities) => {
  if (!lastActiveTemplateKey) {
    return null
  }

  return selectors.getById(entities, lastActiveTemplateKey)
}

export const createGetLastActiveTemplateSelector = () => {
  return createSelector(
    [getLastActiveTemplateKey, getEntities],
    getLastActiveTemplate
  )
}

export const getCanRun = (activeTabKey, lastActiveTemplateKey, tabs) => {
  const activeTab = getActiveTab(activeTabKey, tabs)

  if (activeTab != null) {
    return !!lastActiveTemplateKey && activeTab.type === 'entity'
  }

  return !!lastActiveTemplateKey
}

export const createGetCanRunSelector = () => {
  return createSelector(
    [getActiveTabKey, getLastActiveTemplateKey, getTabs],
    getCanRun
  )
}

export const getCanSave = (activeTabKey, tabs, entities) => {
  const entity = getActiveEntity(activeTabKey, tabs, entities)

  return entity ? !!entity.__isDirty : false
}

export const createGetCanSaveSelector = () => {
  return createSelector(
    [getActiveTabKey, getTabs, getEntities],
    getCanSave
  )
}

export const getCanSaveAll = (tabs, entities) => {
  return getTabWithEntities(tabs, entities).filter((t) => t.entity && t.entity.__isDirty).length > 0
}

export const createGetCanSaveAllSelector = () => {
  return createSelector(
    [getTabs, getEntities],
    getCanSaveAll
  )
}

export { createSelector }
