/*eslint-disable*/
export let version = null
export let engines = []
export let recipes = []
export let previewComponents = {}
export let initializeListeners = []
export let readyListeners = []
export let runListeners = []
export let entityNewListeners = []
export let entitySaveListeners = []
export let textEditorInitializeListeners = []
export let textEditorCreatedListeners = []
export let _themeChangedListeners = []
export let entitySets = {}
export let reportPreviewStyleResolvers = []
export let templateEditorModeResolvers = []
export let entityTreeOrder = []
export let entityTreeWrapperComponents = []
export let entityTreeIconResolvers = []
export let entityTreeFilterItemResolvers = []
export let entityTreeDropResolvers = []
export let entityEditorComponentKeyResolvers = []
export let entityTreeContextMenuItemsResolvers = []
export let entityTreeToolbarComponents = {
  single: [],
  group: []
}
export let entityTreeItemComponents = {
  container: [],
  right: [],
  groupRight: []
}
export let propertiesComponents = []
export let editorComponents = []
export let toolbarComponents = {
  left: [],
  right: [],
  settings: [],
  settingsBottom: []
}
export let tabTitleComponents = []
export let textEditorInstances = []

export let toolbarVisibilityResolver = () => true

export let registerModalHandler = (fn) => { modalHandler = fn }
export let modalHandler = () => {}

export let concurrentUpdateModal = () => { return null }

export let aboutModal = () => { return null }

export let registerCollapseEntityHandler = (fn) => { collapseEntityHandler = fn }
export let collapseEntityHandler = () => {}

export let registerCollapseLeftHandler = (fn) => { collapseLeftHandler = fn }
export let collapseLeftHandler = () => {}

export let registerCollapsePreviewHandler = (fn) => { collapsePreviewHandler = fn }
export let collapsePreviewHandler = () => {}

export let shouldOpenStartupPage = true

export let apiHeaders = {}

export let _splitResizeHandlers = []

export let subscribeToSplitPaneEvents = (el, fnMap) => {
  let handler = {
    el,
    fnMap
  }

  _splitResizeHandlers.push(handler)

  return () => {
    _splitResizeHandlers = _splitResizeHandlers.filter(h => h !== handler)
  }
}

export let subscribeToThemeChange = (fn) => {
  _themeChangedListeners.push(fn)
  return () => { _themeChangedListeners = _themeChangedListeners.filter((s) => s !== fn) }
}

export let _tabActiveHandlers = []

export let subscribeToTabActiveEvent = (el, fnHandler) => {
  const handler = {
    el,
    fn: fnHandler
  }

  _tabActiveHandlers.push(handler)

  return () => {
    _tabActiveHandlers = _tabActiveHandlers.filter(h => h !== handler)
  }
}

export let triggerThemeChange = (data) => { _themeChangedListeners.forEach((fn) => fn(data)) }

export let referencesLoader = null

export let removeHandler = null

export let locationResolver = null

export let extensions = []

export function rootPath () {
  let _rootPath = window.location.pathname.indexOf('/studio') === -1 ? window.location.pathname : window.location.pathname.substring(0, window.location.pathname.indexOf('/studio'))
  return _rootPath[_rootPath.length - 1] === '/' ? _rootPath.substring(0, _rootPath.length - 1) : _rootPath
}

export const sharedComponents = {}
