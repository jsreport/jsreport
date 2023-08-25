const values = {}

values.version = null
values.engines = []
values.recipes = []
values.previewComponents = {}
values.initializeListeners = []
values.readyListeners = []
values.runListeners = []
values.entityNewListeners = []
values.entitySaveListeners = []
values.textEditorInitializeListeners = []
values.textEditorCreatedListeners = []
values._themeChangedListeners = []
values.entitySets = {}
values.entitySetsDocProps = {}
values.reportPreviewStyleResolvers = []
values.templateEditorModeResolvers = []
values.entityTreeGroupModes = {}
values.entityTreeOrder = []
values.entityTreeIconResolvers = []
values.entityTreeFilterItemResolvers = []
values.entityTreeDropResolvers = []
values.tabTitleComponentKeyResolvers = []
values.entityEditorComponentKeyResolvers = []
values.entityTreeContextMenuItemsResolvers = []

values.entityTreeToolbarComponents = {
  single: [],
  group: []
}

values.entityTreeItemComponents = {
  right: [],
  groupRight: []
}

values.propertiesComponents = []
values.editorComponents = []

values.toolbarComponents = {
  left: [],
  right: [],
  settings: [],
  settingsBottom: []
}

values.tabTitleComponents = []
values.textEditorInstances = []
values.renderedEditorComponentsMeta = { data: {} }

values.toolbarVisibilityResolver = () => true

values.registerModalHandler = (fn) => { values.modalHandler = fn }
values.modalHandler = () => {}

values.concurrentUpdateModal = () => { return null }

values.aboutModal = () => { return null }

values.registerCollapseEntityHandler = (fn) => { values.collapseEntityHandler = fn }
values.collapseEntityHandler = () => {}

values.registerCollapseLeftHandler = (fn) => { values.collapseLeftHandler = fn }
values.collapseLeftHandler = () => {}

values.registerCollapsePreviewHandler = (fn) => { values.collapsePreviewHandler = fn }
values.collapsePreviewHandler = () => {}

values.shouldOpenStartupPage = true

values.apiHeaders = {}

values._splitResizeHandlers = []

values.subscribeToSplitPaneEvents = (el, fnMap) => {
  const handler = {
    el,
    fnMap
  }

  values._splitResizeHandlers.push(handler)

  return () => {
    values._splitResizeHandlers = values._splitResizeHandlers.filter(h => h !== handler)
  }
}

values.subscribeToThemeChange = (fn) => {
  values._themeChangedListeners.push(fn)
  return () => { values._themeChangedListeners = values._themeChangedListeners.filter((s) => s !== fn) }
}

values._tabActiveHandlers = []

values.subscribeToTabActiveEvent = (el, fnHandler) => {
  const handler = {
    el,
    fn: fnHandler
  }

  values._tabActiveHandlers.push(handler)

  return () => {
    values._tabActiveHandlers = values._tabActiveHandlers.filter(h => h !== handler)
  }
}

values.triggerThemeChange = (data) => { values._themeChangedListeners.forEach((fn) => fn(data)) }

values.referencesLoader = null

values.locationResolver = null

values.extensions = []

values.sharedComponents = {}

export { values }

export function rootPath () {
  const _rootPath = window.location.pathname.indexOf('/studio') === -1 ? window.location.pathname : window.location.pathname.substring(0, window.location.pathname.indexOf('/studio'))
  return _rootPath[_rootPath.length - 1] === '/' ? _rootPath.substring(0, _rootPath.length - 1) : _rootPath
}
