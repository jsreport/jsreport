import fileSaver from 'filesaver.js-npm'
import * as entities from '../entities'
import * as progress from '../progress'
import * as ActionTypes from './constants'
import uid from '../../helpers/uid'
import api from '../../helpers/api'
import * as selectors from './selectors'
import { push } from 'connected-react-router'
import shortid from 'shortid'
import ErrorModal from '../../components/Modals/ErrorModal'
import { openModal } from '../../helpers/openModal'
import reformatter from '../../helpers/reformatter'
import { openPreviewWindow, getPreviewWindowOptions } from '../../helpers/previewWindow'
import createTemplateRenderFilesHandler from '../../helpers/createTemplateRenderFilesHandler'
import executeTemplateRender from '../../helpers/executeTemplateRender'
import resolveUrl from '../../helpers/resolveUrl'

import {
  addEvent as addProfileEvent
} from '../../helpers/profileDataManager'

import {
  engines,
  recipes,
  runListeners,
  locationResolver,
  editorComponents,
  concurrentUpdateModal
} from '../../lib/configuration'

const runningControllers = {}

export function closeTab (id) {
  return (dispatch, getState) => {
    const entity = entities.selectors.getById(getState().entities, id, false)

    if (entity) {
      const dependantEntityTabs = getState().editor.tabs.filter((t) => {
        return (
          t.type === 'entity' &&
          t._id === id &&
          // this check includes tabs like header-footer/pdf-utils
          t.key !== t._id
        )
      })

      // close also dependant tabs (like header-footer, pdf-utils, etc)
      // if the entity is new of if it is dirty
      dependantEntityTabs.forEach((t) => {
        if (entity.__isNew || entity.__isDirty) {
          dispatch({
            type: ActionTypes.CLOSE_TAB,
            key: t.key
          })
        }
      })
    }

    dispatch({
      type: ActionTypes.CLOSE_TAB,
      key: id
    })

    if (entity) {
      dispatch(entities.actions.unload(id))
    }

    dispatch(updateHistory())
  }
}

export function openTab (tab, activate = true) {
  return async function (dispatch, getState) {
    if (tab.shortid && !tab._id) {
      try {
        tab._id = entities.selectors.getByShortid(getState().entities, tab.shortid)._id
      } catch (e) {
        dispatch(push(resolveUrl('/')))
        return
      }
    }

    if (tab._id) {
      await entities.actions.load(tab._id)(dispatch, getState)
      tab.entitySet = entities.selectors.getById(getState().entities, tab._id).__entitySet
    }

    tab.type = tab._id ? 'entity' : 'custom'
    tab.key = tab.key || tab._id

    dispatch({
      type: ActionTypes.OPEN_TAB,
      tab: tab
    })

    const shouldActivate = activate == null ? true : activate

    if (shouldActivate) {
      dispatch(activateTab(tab.key))
    }
  }
}

export function openNewTab ({ entitySet, entity, name }, activate = true) {
  const shouldClone = entity != null && entity._id != null

  return async function (dispatch, getState) {
    const id = uid()
    let newEntity
    let clonedEntity

    if (shouldClone) {
      await entities.actions.load(entity._id)(dispatch, getState)
      clonedEntity = entities.selectors.getById(getState().entities, entity._id)

      newEntity = {
        ...clonedEntity,
        _id: id,
        __entitySet: entitySet,
        shortid: shortid.generate(),
        name
      }
    } else {
      if (entity != null) {
        newEntity = Object.assign({}, entity)
      }

      newEntity = Object.assign(newEntity, {
        _id: id,
        __entitySet: entitySet,
        shortid: shortid.generate(),
        name
      })

      if (entitySet === 'templates') {
        if (newEntity.recipe == null) {
          newEntity.recipe = recipes.includes('chrome-pdf') ? 'chrome-pdf' : 'html'
        }

        if (newEntity.engine == null) {
          newEntity.engine = engines.includes('handlebars') ? 'handlebars' : engines[0]
        }
      }
    }

    dispatch(entities.actions.add(newEntity))

    const shouldActivate = activate == null ? true : activate

    dispatch({
      type: ActionTypes.OPEN_NEW_TAB,
      tab: {
        _id: id,
        key: id,
        entitySet: entitySet,
        type: 'entity'
      },
      activateTab: shouldActivate
    })

    return newEntity
  }
}

export function activateTab (id) {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.ACTIVATE_TAB,
      key: id
    })

    dispatch(updateHistory())
  }
}

export function updateHistory () {
  return (dispatch, getState) => {
    const { tab, entity } = selectors.getActiveTabWithEntity(
      getState().editor.activeTabKey,
      getState().editor.tabs,
      getState().entities
    )

    let path

    if (tab && tab.customUrl) {
      path = tab.customUrl
    } else if (entity && entity.shortid) {
      path = resolveUrl(`/studio/${entity.__entitySet}/${entity.shortid}`)
    } else {
      path = resolveUrl('/')
    }

    if (locationResolver) {
      path = locationResolver(path, entity)
    }

    if (path !== getState().router.location.pathname) {
      dispatch(push(path))
    }
  }
}

export function update (entity) {
  return async function (dispatch, getState) {
    await entities.actions.update(entity)(dispatch, getState)
  }
}

export function groupedUpdate (entity) {
  return async function (dispatch, getState) {
    await entities.actions.groupedUpdate(entity)(dispatch, getState)
  }
}

export function hierarchyMove (source, target, shouldCopy = false, replace = false, retry = true) {
  return async function (dispatch, getState) {
    let response

    let sourceEntity = entities.selectors.getById(getState().entities, source.id)

    if (sourceEntity.__isNew || sourceEntity.__isDirty) {
      dispatch(entities.actions.flushUpdates())

      sourceEntity = entities.selectors.getById(getState().entities, source.id)

      dispatch(entities.actions.update(Object.assign({}, sourceEntity, {
        folder: target.shortid != null ? { shortid: target.shortid } : null
      })))
    } else {
      try {
        dispatch(entities.actions.apiStart())

        response = await api.post('/studio/hierarchyMove', {
          data: {
            source: {
              entitySet: source.entitySet,
              id: source.id,
              onlyChildren: source.onlyChildren
            },
            target: {
              shortid: target.shortid,
              updateReferences: target.updateReferences
            },
            copy: shouldCopy === true,
            replace: replace === true
          }
        })

        if (replace === true) {
          if (Array.isArray(target.children)) {
            const sourceEntity = entities.selectors.getById(getState().entities, source.id, false)

            let childTargetId
            const childTargetChildren = []

            const allFoldersInsideTarget = target.children.reduce((acu, childId) => {
              const childEntity = entities.selectors.getById(getState().entities, childId, false)

              if (
                ((target.shortid == null && childEntity.folder == null) ||
                (target.shortid != null && childEntity.folder.shortid === target.shortid)) &&
                childEntity.name === sourceEntity.name
              ) {
                childTargetId = childEntity._id
              }

              if (childEntity.__entitySet === 'folders') {
                acu.push(childEntity.shortid)
              }

              return acu
            }, [])

            target.children.forEach((childId) => {
              const childEntity = entities.selectors.getById(getState().entities, childId, false)

              if (childEntity.folder && allFoldersInsideTarget.indexOf(childEntity.folder.shortid) !== -1) {
                childTargetChildren.push(childEntity._id)
              }
            })

            if (childTargetId) {
              dispatch(entities.actions.removeExisting(childTargetId, childTargetChildren))
            }
          }
        }

        response.items.forEach((item) => {
          dispatch(entities.actions.addExisting(item))
        })

        dispatch(entities.actions.apiDone())
      } catch (e) {
        if (retry && e.code === 'DUPLICATED_ENTITY' && e.existingEntityEntitySet !== 'folders') {
          dispatch(entities.actions.apiDone())

          return {
            duplicatedEntity: true,
            existingEntity: e.existingEntity,
            existingEntityEntitySet: e.existingEntityEntitySet
          }
        }

        dispatch(entities.actions.apiFailed(e))
      }

      if (target.updateReferences) {
        // refresh target
        const targetEntity = entities.selectors.getByShortid(getState().entities, target.shortid)
        await entities.actions.load(targetEntity._id, true)(dispatch, getState)
      }

      return response.items
    }
  }
}

export function save () {
  return async function (dispatch, getState) {
    let entityId

    try {
      entityId = selectors.getActiveTab(getState().editor.activeTabKey, getState().editor.tabs)._id

      dispatch({
        type: ActionTypes.SAVE_STARTED
      })

      await entities.actions.save(entityId, { ignoreFailed: true })(dispatch, getState)

      dispatch({
        type: ActionTypes.SAVE_SUCCESS
      })
    } catch (e) {
      if (e.error && e.error.code === 'CONCURRENT_UPDATE_INVALID') {
        dispatch(progress.actions.stop())

        openModal(concurrentUpdateModal, {
          entityId: entityId,
          modificationDate: e.error.modificationDate
        })
      } else {
        dispatch(entities.actions.apiFailed(e))
      }
    }
  }
}

export function saveAll () {
  return async function (dispatch, getState) {
    try {
      dispatch({
        type: ActionTypes.SAVE_STARTED
      })

      const entitiesToUpdate = getState().editor.tabs.filter((t) => {
        return (
          t.type === 'entity' &&
          // this check excludes tabs like header-footer/pdf-utils
          t.key === t._id
        )
      })

      await Promise.all(entitiesToUpdate.map((t) => {
        const entity = entities.selectors.getById(getState().entities, t._id)

        // only save for new or entities that have changed
        if (entity.__isNew || entity.__isDirty) {
          return entities.actions.save(t._id, { ignoreFailed: true })(dispatch, getState)
        }

        return null
      }))

      dispatch({
        type: ActionTypes.SAVE_SUCCESS
      })
    } catch (e) {
      if (e.error && e.error.code === 'CONCURRENT_UPDATE_INVALID') {
        dispatch(progress.actions.stop())

        openModal(concurrentUpdateModal, {
          entityId: e.entityId
        })
      } else {
        dispatch(entities.actions.apiFailed(e))
      }
    }
  }
}

export function reformat (shouldThrow = false) {
  return async function (dispatch, getState) {
    // this flushed the updates
    dispatch(entities.actions.flushUpdates())

    const tab = selectors.getActiveTab(getState().editor.activeTabKey, getState().editor.tabs)

    const editorReformat = editorComponents[tab.editorComponentKey || tab.entitySet].reformat

    if (!editorReformat && !shouldThrow) {
      return false
    }

    const activeEntity = selectors.getActiveEntity(getState().editor.activeTabKey, getState().editor.tabs, getState().entities)
    const toUpdate = editorReformat(reformatter, activeEntity, tab)

    dispatch(update(Object.assign({ _id: activeEntity._id }, toUpdate)))

    return true
  }
}

export function remove () {
  return async function (dispatch, getState) {
    const tab = selectors.getActiveTab(getState().editor.activeTabKey, getState().editor.tabs)
    await dispatch(entities.actions.remove(tab._id))
  }
}

export function preview ({ id, type, data = null, activeTab, completed = false }) {
  const previewId = id || uid()

  return (dispatch) => {
    dispatch({
      type: ActionTypes.PREVIEW,
      preview: {
        id: previewId,
        type,
        data,
        activeTab,
        completed
      }
    })

    return previewId
  }
}

export function updatePreview (id, params = {}) {
  const toUpdate = {}

  if (Object.hasOwnProperty.call(params, 'data')) {
    toUpdate.data = params.data
  }

  if (Object.hasOwnProperty.call(params, 'activeTab')) {
    toUpdate.activeTab = params.activeTab
  }

  if (Object.hasOwnProperty.call(params, 'completed')) {
    toUpdate.completed = params.completed
  }

  return {
    type: ActionTypes.UPDATE_PREVIEW,
    preview: {
      id,
      ...toUpdate
    }
  }
}

export function clearPreview () {
  return (dispatch) => {
    dispatch(preview({ type: 'empty', completed: true }))
  }
}

export function run (params = {}, opts = {}) {
  return async function (dispatch, getState) {
    const supportedTargets = ['preview', 'download', 'window']
    const template = params.template != null ? params.template : Object.assign({}, selectors.getLastActiveTemplate(getState().editor.lastActiveTemplateKey, getState().entities))
    const templateName = template.name

    const request = {
      template,
      options: params.options != null ? params.options : {}
    }

    const undockMode = getState().editor.undockMode

    let targetType
    let profiling

    if (opts.target != null) {
      targetType = opts.target
    } else if (undockMode) {
      targetType = 'window'
    } else {
      targetType = 'preview'
    }

    if (supportedTargets.indexOf(targetType) === -1) {
      throw new Error(`Run template preview target type "${targetType}" is not supported`)
    }

    let profilerMode = 'standard'

    if (typeof opts.profilerMode === 'string') {
      profilerMode = opts.profilerMode
    }

    if (profilerMode !== 'standard' && profilerMode !== 'full') {
      throw new Error(`Run profilerMode "${profilerMode}" is not supported`)
    }

    if (targetType === 'preview') {
      profiling = opts.profilerMode !== false
    } else {
      profiling = false
    }

    const entities = Object.assign({}, getState().entities)

    await Promise.all([...runListeners.map((l) => l(request, entities))])

    let previewId
    let previewWindow

    let previewData = {
      template: {
        name: template.name,
        shortid: template.shortid
      },
      reportSrc: null,
      reportFile: null
    }

    let storedPreviewData

    if (profiling) {
      previewData.profileOperations = []
      previewData.profileLogs = []
    }

    const runId = uid()

    dispatch({ type: ActionTypes.RUN_STARTED, id: runId })

    const renderController = new AbortController()
    runningControllers[runId] = renderController

    if (targetType === 'preview') {
      storedPreviewData = previewData

      previewId = dispatch(preview({
        id: runId,
        type: profiling ? 'report-profile' : 'report',
        data: previewData
      }))
    } else if (targetType === 'window') {
      previewWindow = openPreviewWindow(getPreviewWindowOptions(template != null ? template.shortid : undefined))
    }

    try {
      await executeTemplateRender(request, {
        signal: renderController.signal,
        profilerMode,
        onStart: () => {
          if (targetType === 'window') {
            previewWindow.focus()
          }
        },
        onFiles: createTemplateRenderFilesHandler({
          profiling,
          batchCompleted: (pendingFiles) => {
            if (storedPreviewData === previewData) {
              return
            }

            storedPreviewData = previewData

            const completed = pendingFiles.length === 0

            const updateChanges = {
              data: previewData
            }

            if (completed) {
              updateChanges.completed = completed
            }

            dispatch(updatePreview(previewId, updateChanges))
          },
          onLog: (log) => {
            previewData = addProfileEvent(previewData, log)
          },
          onOperation: (operation) => {
            previewData = addProfileEvent(previewData, operation)
          },
          onError: (errorInfo) => {
            if (targetType === 'download') {
              openModal(ErrorModal, { title: 'Download Error', error: errorInfo })
              return
            }

            if (profiling) {
              previewData = addProfileEvent(previewData, errorInfo)
            }

            const reportSrc = URL.createObjectURL(
              new Blob([
                `Report${templateName != null ? ` "${templateName}"` : ''} render failed.\n\n${errorInfo.message}\n${errorInfo.stack}`
              ], { type: 'text/plain' })
            )

            if (targetType === 'window') {
              previewWindow.location.href = reportSrc
            } else {
              previewData = {
                ...previewData,
                reportSrc
              }
            }
          },
          onReport: (reportFileInfo) => {
            if (targetType === 'download') {
              fileSaver.saveAs(new Blob([reportFileInfo.rawData.buffer], {
                type: reportFileInfo.contentType
              }), reportFileInfo.filename)
              return
            }

            const reportSrc = URL.createObjectURL(
              new window.File([reportFileInfo.rawData.buffer], reportFileInfo.filename, {
                type: reportFileInfo.contentType
              })
            )

            if (targetType === 'window') {
              previewWindow.location.href = reportSrc
            } else {
              previewData = {
                ...previewData,
                reportSrc,
                reportFile: {
                  filename: reportFileInfo.filename,
                  rawData: reportFileInfo.rawData,
                  contentType: reportFileInfo.contentType
                }
              }
            }
          }
        })
      })
    } catch (error) {
      if (targetType === 'download') {
        openModal(ErrorModal, { title: 'Download Error', error })
      } else {
        if (targetType === 'preview' && profiling) {
          previewData = addProfileEvent(previewData, {
            type: 'error',
            message: error.message,
            stack: error.stack
          })
        }

        const errorURLBlob = URL.createObjectURL(new Blob([`${error.message}\n\n${error.stack}`], { type: 'text/plain' }))

        if (targetType === 'window') {
          previewWindow.location.href = errorURLBlob
        } else {
          previewData = {
            ...previewData,
            reportSrc: errorURLBlob
          }
        }

        if (targetType === 'preview') {
          dispatch(updatePreview(previewId, { data: previewData, completed: true }))
        }
      }
    } finally {
      delete runningControllers[runId]
      dispatch({ type: ActionTypes.RUN_ENDED, id: runId })
    }
  }
}

export function stopRun (runId) {
  if (runningControllers[runId] != null) {
    const controller = runningControllers[runId]
    delete runningControllers[runId]
    controller.abort()
  }

  return {
    type: ActionTypes.RUN_STOPPED
  }
}

export function activateUndockMode () {
  return {
    type: ActionTypes.ACTIVATE_UNDOCK_MODE
  }
}

export function desactivateUndockMode () {
  return {
    type: ActionTypes.DESACTIVATE_UNDOCK_MODE
  }
}
