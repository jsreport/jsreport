import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import isEqual from 'lodash/isEqual'
import useFilteredEntities from './useFilteredEntities'
import useCollapsed from './useCollapsed'
import useContextMenu from './useContextMenu'
import useDropHandler from './useDropHandler'
import useConstructor from '../../hooks/useConstructor'
import HierarchyReplaceEntityModal from '../Modals/HierarchyReplaceEntityModal'
import storeMethods from '../../redux/methods'
import ENTITY_NODE_DRAG_TYPE from './nodeDragType'
import { getAllEntitiesInHierarchy, getNodeDOMId, getNodeTitleDOMId } from './utils'
import { checkIsGroupNode, checkIsGroupEntityNode } from '../../helpers/checkEntityTreeNodes'
import { openModal } from '../../helpers/openModal'
import { values as configuration } from '../../lib/configuration'

const mainEntityDropResolver = {
  type: ENTITY_NODE_DRAG_TYPE,
  handler: () => {}
}

export default function useEntityTree (main, {
  paddingByLevelInTree,
  selectable,
  selectionMode,
  entities,
  openTab,
  editSelect,
  clearEditSelect,
  hierarchyMove,
  onNewEntity,
  onRemove,
  onClone,
  onRename,
  listRef,
  contextMenuRef
}) {
  const defaultGroupMode = configuration.extensions.studio.options.entityTreeGroupMode
  const dragOverContextRef = useRef(null)
  const dragCacheRef = useRef(null)
  const [groupMode, setGroupMode] = useState(defaultGroupMode)
  const [clipboard, setClipboard] = useState(null)
  const [highlightedArea, setHighlightedArea] = useState(null)
  const [currentEntities, setFilter] = useFilteredEntities(entities)

  const handleSetGroupMode = useCallback((modeOrFn) => {
    const getMode = (_mode) => {
      return _mode != null ? _mode : defaultGroupMode
    }

    if (typeof modeOrFn === 'function') {
      setGroupMode((prevMode) => {
        const newMode = modeOrFn(prevMode)
        return getMode(newMode)
      })
    } else {
      setGroupMode(getMode(modeOrFn))
    }
  }, [defaultGroupMode, groupMode])

  const { collapsedInfo, toggleNodeCollapse, collapseHandler } = useCollapsed({
    listRef
  })

  const { contextMenu, showContextMenu, clearContextMenu } = useContextMenu(contextMenuRef)

  const editSelectEntityWithSequence = useCallback((currentEntityId, references, action) => {
    const relativeEntitiesNodes = listRef.current.getRelativeEntitiesById(currentEntityId)
    const currentIndex = relativeEntitiesNodes.findIndex((node) => node.data._id === currentEntityId)
    const refEntityId = references.length > 0 ? references[references.length - 1].id : currentEntityId
    const refRelativeEntitiesNodes = listRef.current.getRelativeEntitiesById(refEntityId)
    const refIndex = refRelativeEntitiesNodes.findIndex((node) => node.data._id === refEntityId)
    const limit = action === 'up' ? 0 : relativeEntitiesNodes.length - 1
    let targetEntityId

    if (currentIndex !== limit) {
      const shouldUseStep = action === 'up' ? currentIndex <= refIndex : currentIndex >= refIndex
      const actionStep = action === 'up' ? -1 : 1
      const step = shouldUseStep ? actionStep : 0
      const targetIndex = currentIndex + step
      const targetEntityNode = relativeEntitiesNodes[targetIndex]
      // we just want to toggle the next entity
      targetEntityId = targetEntityNode.data._id

      const selectOpts = {}

      const targetFoundInReferences = references.find((r) => r.id === targetEntityId)

      if (targetFoundInReferences != null) {
        // if references are already selected, keep it that way
        selectOpts.value = true
      }

      if (!shouldUseStep) {
        const lastFocused = relativeEntitiesNodes[targetIndex + actionStep]

        if (lastFocused != null) {
          selectOpts.lastFocused = lastFocused.data._id
        }
      }

      editSelect(targetEntityId, selectOpts)
    }
  }, [listRef, editSelect])

  useEffect(() => {
    if (main) {
      configuration.registerCollapseEntityHandler(collapseHandler)
    }
  }, [main, collapseHandler])

  // handle click outside of tree list and ESC keypress to clear editSelection
  useEffect(() => {
    if (!main) {
      return
    }

    function tryClearFromClick (ev) {
      const LEFT_CLICK = 1
      const button = ev.which || ev.button

      if (ev.target.type === 'file') {
        return
      }

      if (listRef.current == null || listRef.current.node == null) {
        return
      }

      const editSelection = storeMethods.getEditorEditSelection()

      if (editSelection == null) {
        return
      }

      ev.preventDefault()

      if (
        !listRef.current.node.contains(ev.target)
      ) {
        // only stop propagation when the click does not come from context menu,
        // if it comes from context menu we want to clear selection and also close context menu
        // at the same time
        if (contextMenuRef.current == null || !contextMenuRef.current.contains(ev.target)) {
          ev.stopPropagation()
        }

        // handle quirk in firefox that fires and additional click event during
        // contextmenu event, this code prevents the context menu to
        // immediately be closed after being shown in firefox.
        // only clear edit selection if there is no context menu
        if (
          button === LEFT_CLICK &&
          contextMenuRef.current == null
        ) {
          clearEditSelect()
        }
      }
    }

    function trySelectOrClearFromKey (ev) {
      if (listRef.current == null || listRef.current.node == null) {
        return
      }

      const editSelection = storeMethods.getEditorEditSelection()

      if (editSelection == null) {
        return
      }

      // we only want to clear on ESC when there is no context menu
      if (contextMenuRef.current == null && ev.which === 27) {
        clearEditSelect()
      }

      const lastEditSelectionFocused = storeMethods.getEditorLastEditSelectionFocused()

      // if node that has edit selection enabled has focus then handle arrows keys
      if (
        lastEditSelectionFocused != null &&
        ev.target.dataset != null &&
        (ev.target.dataset.editSelectionEnabled === 'true' || ev.target.dataset.editSelectionEnabled === true) &&
        document.activeElement === ev.target
      ) {
        const editSelectionRefs = storeMethods.getEditorEditSelectionRefs()
        const references = (editSelectionRefs || []).map((refId) => ({ id: refId, selected: editSelection.includes(refId) }))

        if (ev.shiftKey && ev.which === 38) {
          editSelectEntityWithSequence(lastEditSelectionFocused, references, 'up')
        } else if (ev.shiftKey && ev.which === 40) {
          editSelectEntityWithSequence(lastEditSelectionFocused, references, 'down')
        }
      }
    }

    window.addEventListener('click', tryClearFromClick, true)
    window.addEventListener('keydown', trySelectOrClearFromKey)

    return () => {
      window.removeEventListener('click', tryClearFromClick, true)
      window.removeEventListener('keydown', trySelectOrClearFromKey)
    }
  }, [main, listRef, contextMenuRef, editSelectEntityWithSequence, clearEditSelect])

  const copyOrMoveEntity = useCallback((sourceInfo, targetInfo, shouldCopy = false) => {
    const isSingleSource = Array.isArray(sourceInfo) ? sourceInfo.length === 1 : true

    // we only want to retry/show the replace modal when doing single source action
    hierarchyMove(sourceInfo, targetInfo, shouldCopy, false, isSingleSource).then((result) => {
      if (targetInfo.shortid != null) {
        const targetEntity = storeMethods.getEntityByShortid(targetInfo.shortid)
        toggleNodeCollapse(listRef.current.entityNodesById[targetEntity._id], false)
      }

      if (!result || result.duplicatedEntity !== true) {
        return
      }

      if (isSingleSource) {
        const singleSource = Array.isArray(sourceInfo) ? sourceInfo[0] : sourceInfo

        openModal(HierarchyReplaceEntityModal, {
          sourceId: singleSource.id,
          targetShortId: targetInfo.shortid,
          targetChildren: targetInfo.children,
          existingEntity: result.existingEntity,
          existingEntityEntitySet: result.existingEntityEntitySet,
          shouldCopy
        })
      }
    })
  }, [hierarchyMove, toggleNodeCollapse, listRef])

  const getEntityByShortidOptimizedForDrag = useCallback((shortid) => {
    let result

    if (dragCacheRef.current != null) {
      result = dragCacheRef.current.entitiesByShortid.get(shortid)
    }

    if (result != null) {
      return result
    }

    result = storeMethods.getEntityByShortid(shortid)

    if (dragCacheRef.current != null) {
      dragCacheRef.current.entitiesByShortid.set(shortid, result)
    }

    return result
  }, [])

  const isValidHierarchyTarget = useCallback((sourceNode, targetNode) => {
    const containersInHierarchyForTarget = []
    let containerSourceEntity
    let containerTargetEntity

    if (sourceNode.data.__entitySet === 'folders') {
      containerSourceEntity = getEntityByShortidOptimizedForDrag(sourceNode.data.shortid)
    } else {
      return true
    }

    if (targetNode.data.__entitySet === 'folders') {
      containerTargetEntity = getEntityByShortidOptimizedForDrag(targetNode.data.shortid)
    } else {
      if (targetNode.data.folder == null) {
        return true
      }

      containerTargetEntity = getEntityByShortidOptimizedForDrag(targetNode.data.folder.shortid)
    }

    let currentContainer = containerTargetEntity

    if (containerSourceEntity.shortid === containerTargetEntity.shortid) {
      return false
    }

    containersInHierarchyForTarget.push(containerTargetEntity.shortid)

    while (
      currentContainer.shortid !== containerSourceEntity.shortid &&
      currentContainer.folder != null
    ) {
      const parentContainer = getEntityByShortidOptimizedForDrag(currentContainer.folder.shortid)
      containersInHierarchyForTarget.push(parentContainer.shortid)
      currentContainer = parentContainer
    }

    if (
      containersInHierarchyForTarget.indexOf(containerSourceEntity.shortid) !== -1
    ) {
      return false
    }

    return true
  }, [getEntityByShortidOptimizedForDrag])

  mainEntityDropResolver.handler = async ({ draggedItem, dragOverContext, dropComplete }) => {
    const sourceEntitySet = draggedItem.entitySet
    const sourceNode = draggedItem.node
    const targetNode = dragOverContext ? dragOverContext.targetNode : undefined
    let sourceInfo
    let targetInfo

    if (sourceNode && dragOverContext && !dragOverContext.containerTargetEntity) {
      if (!dragOverContext.overRoot) {
        if (!isValidHierarchyTarget(sourceNode, targetNode)) {
          return
        }
      }

      // drop will be at the same root level, so we stop it
      if (sourceNode.data.folder == null) {
        return
      }

      sourceInfo = {
        id: sourceNode.data._id,
        entitySet: sourceEntitySet
      }

      targetInfo = {
        shortid: null
      }
    } else if (
      sourceNode &&
      dragOverContext &&
      dragOverContext.containerTargetEntity
    ) {
      if (!isValidHierarchyTarget(sourceNode, targetNode)) {
        return
      }

      // skip drop over same hierarchy
      if (
        (sourceNode.data.__entitySet === 'folders' &&
        sourceNode.data.shortid === dragOverContext.containerTargetEntity.shortid) ||
        (sourceNode.data.folder && sourceNode.data.folder.shortid === dragOverContext.containerTargetEntity.shortid)
      ) {
        return
      }

      sourceInfo = {
        id: sourceNode.data._id,
        entitySet: sourceEntitySet
      }

      targetInfo = {
        shortid: dragOverContext.containerTargetEntity.shortid,
        children: getAllEntitiesInHierarchy(listRef.current.entityNodesById[dragOverContext.containerTargetEntity._id])
      }
    }

    if (sourceInfo && targetInfo) {
      dropComplete()
      copyOrMoveEntity(sourceInfo, targetInfo)
    }
  }

  useConstructor(() => {
    if (main) {
      const registered = configuration.entityTreeDropResolvers.find((r) => r === mainEntityDropResolver)

      if (registered != null) {
        return
      }

      configuration.entityTreeDropResolvers.push(mainEntityDropResolver)
    }
  })

  const clearHighlightedArea = useCallback(() => {
    setHighlightedArea(null)
  }, [])

  const showHighlightedArea = useCallback((sourceEntityNode, targetEntityNode) => {
    const newHighlightedArea = {}
    let containerTargetInContext

    if (
      !targetEntityNode ||
      // support highlight root hierarchy when over entities at root
      (targetEntityNode.data.__entitySet !== 'folders' &&
      targetEntityNode.data.folder == null)
    ) {
      const hierarchyEntityDimensions = listRef.current.node.getBoundingClientRect()

      newHighlightedArea.hierarchy = {
        top: hierarchyEntityDimensions.top - 2,
        left: hierarchyEntityDimensions.left + 6,
        width: `${paddingByLevelInTree}rem`,
        height: hierarchyEntityDimensions.height + 4
      }

      if (dragOverContextRef.current) {
        dragOverContextRef.current.overRoot = true
      }
    } else if (targetEntityNode.data.folder != null || targetEntityNode.data.__entitySet === 'folders') {
      let hierarchyEntity

      if (dragOverContextRef.current) {
        dragOverContextRef.current.overRoot = false
      }

      if (targetEntityNode.data.__entitySet === 'folders') {
        hierarchyEntity = getEntityByShortidOptimizedForDrag(targetEntityNode.data.shortid)
        containerTargetInContext = hierarchyEntity
      } else {
        hierarchyEntity = getEntityByShortidOptimizedForDrag(targetEntityNode.data.folder.shortid)
        containerTargetInContext = hierarchyEntity
      }

      if (sourceEntityNode && sourceEntityNode.data.__entitySet === 'folders') {
        if (!isValidHierarchyTarget(sourceEntityNode, targetEntityNode)) {
          return clearHighlightedArea()
        }
      }

      const hierarchyEntityNodeId = getNodeDOMId(hierarchyEntity)
      const hierarchyEntityTitleNodeId = getNodeTitleDOMId(hierarchyEntity)

      if (!hierarchyEntityNodeId || !hierarchyEntityTitleNodeId) {
        return
      }

      const hierarchyEntityDOMNode = document.getElementById(hierarchyEntityNodeId)
      const hierarchyEntityTitleDOMNode = document.getElementById(hierarchyEntityTitleNodeId)

      if (!hierarchyEntityDOMNode || !hierarchyEntityTitleDOMNode) {
        return
      }

      const hierarchyEntityTitleDimensions = hierarchyEntityTitleDOMNode.getBoundingClientRect()

      newHighlightedArea.label = {
        top: hierarchyEntityTitleDimensions.top,
        left: hierarchyEntityTitleDimensions.left,
        width: hierarchyEntityTitleDimensions.width,
        height: hierarchyEntityTitleDimensions.height
      }

      let containerTargetIsCollapsed = false
      let containerTargetHasEntities = false

      if (containerTargetInContext && listRef.current.entityNodesById[containerTargetInContext._id]) {
        const nodeObj = listRef.current.entityNodesById[containerTargetInContext._id]

        if (getAllEntitiesInHierarchy(nodeObj, false, true).length > 0) {
          containerTargetHasEntities = true
        }

        const nodeObjDOMId = getNodeDOMId(nodeObj.data)
        const nodeObjEl = nodeObjDOMId != null ? document.getElementById(nodeObjDOMId) : null

        if (nodeObjEl?.dataset?.collapsed === 'true') {
          containerTargetIsCollapsed = true
        }
      }

      if (containerTargetInContext && (containerTargetIsCollapsed || !containerTargetHasEntities)) {
        newHighlightedArea.hierarchy = null
      } else {
        const hierarchyEntityDimensions = hierarchyEntityDOMNode.getBoundingClientRect()

        newHighlightedArea.hierarchy = {
          top: hierarchyEntityTitleDimensions.top + (hierarchyEntityTitleDimensions.height + 4),
          left: hierarchyEntityTitleDimensions.left,
          width: `${paddingByLevelInTree}rem`,
          height: hierarchyEntityDimensions.height - (hierarchyEntityTitleDimensions.height + 4)
        }
      }
    }

    if (Object.keys(newHighlightedArea).length > 0) {
      if (dragOverContextRef.current) {
        dragOverContextRef.current.containerTargetEntity = containerTargetInContext
      }

      setHighlightedArea((prev) => {
        if (isEqual(prev, newHighlightedArea)) {
          return prev
        }

        return newHighlightedArea
      })
    }
  }, [paddingByLevelInTree, getEntityByShortidOptimizedForDrag, clearHighlightedArea, isValidHierarchyTarget, listRef])

  const { draggedNode, dragOverNode, connectDropTarget } = useDropHandler({
    listRef,
    dragOverContextRef,
    onDragOverNode: showHighlightedArea,
    onDragEnd: clearHighlightedArea,
    onDragOut: clearHighlightedArea
  })

  const isDragging = draggedNode != null

  // re-set dragCache
  useLayoutEffect(() => {
    if (isDragging) {
      dragCacheRef.current = { entitiesByShortid: new Map() }
    } else {
      dragCacheRef.current = null
    }
  }, [isDragging])

  const connectDropping = !selectable ? connectDropTarget : undefined

  const sharedOnNewEntity = useCallback(function sharedOnNewEntity (node, ...params) {
    if (node && node.isEntitySet !== true) {
      toggleNodeCollapse(node, false)
    }

    onNewEntity(...params)
  }, [toggleNodeCollapse, onNewEntity])

  const onOpen = useCallback(function onOpen (entity) {
    openTab({ _id: entity._id })
  }, [openTab])

  const onNodeEditSelect = useCallback(function onNodeEditSelect (node, createRange = false) {
    const isGroupEntity = checkIsGroupEntityNode(node)
    const isEntity = !isGroupEntity && !checkIsGroupNode(node)

    if (isEntity || isGroupEntity) {
      const originalTargetEntityId = node.data._id
      const selectReference = [originalTargetEntityId]
      let targetEntityId = originalTargetEntityId

      if (createRange) {
        const activeEntity = storeMethods.getEditorActiveEntity()
        const editSelectionRefs = storeMethods.getEditorEditSelectionRefs()
        let startEntityId

        if (editSelectionRefs != null && editSelectionRefs.length > 0) {
          startEntityId = editSelectionRefs[editSelectionRefs.length - 1]
        } else if (activeEntity != null) {
          // start the range with active entity if there was no previous selection
          startEntityId = activeEntity._id

          if (!selectReference.includes(startEntityId)) {
            selectReference.push(startEntityId)
          }
        }

        const startRelativeEntitiesNodes = startEntityId != null ? listRef.current.getRelativeEntitiesById(startEntityId) : []
        const endExistsInRelativesOfStart = startRelativeEntitiesNodes.find((n) => n.data._id === targetEntityId) != null

        if (startEntityId != null && startEntityId !== targetEntityId && endExistsInRelativesOfStart) {
          const startIndex = startRelativeEntitiesNodes.findIndex((node) => node.data._id === startEntityId)
          const endIndex = startRelativeEntitiesNodes.findIndex((node) => node.data._id === targetEntityId)
          const step = endIndex > startIndex ? 1 : -1
          const limit = endIndex + step

          targetEntityId = []

          let currentIndex = startIndex

          do {
            targetEntityId.push(startRelativeEntitiesNodes[currentIndex].data._id)
            currentIndex = currentIndex + step
          } while (currentIndex !== limit)
        }
      }

      const selectOpts = { initializeWithActive: true, reference: selectReference }

      if (createRange) {
        selectOpts.value = true
      }

      editSelect(targetEntityId, selectOpts)
    }

    clearContextMenu()
  }, [listRef, editSelect, clearContextMenu])

  const onNodeClick = useCallback(function onNodeClick (node) {
    const isGroup = checkIsGroupNode(node)
    const isGroupEntity = checkIsGroupEntityNode(node)
    const isEntity = !isGroupEntity && !checkIsGroupNode(node)

    if (isEntity) {
      openTab({ _id: node.data._id })
    } else if (isGroup || isGroupEntity) {
      toggleNodeCollapse(node)
    }

    clearContextMenu()
  }, [openTab, toggleNodeCollapse, clearContextMenu])

  const onSetClipboard = useCallback(function onSetClipboard (newClipboard) {
    setClipboard(newClipboard)
  }, [setClipboard])

  const onReleaseClipboardTo = useCallback(function onReleaseClipboardTo (destination) {
    if (clipboard == null) {
      return
    }

    copyOrMoveEntity(clipboard.source, {
      shortid: destination.shortid,
      children: destination.children
    }, clipboard.action === 'copy')

    setClipboard(null)
  }, [clipboard, copyOrMoveEntity, setClipboard])

  const getEntityNodeById = useCallback(function getEntityNodeById (id) {
    return listRef.current.entityNodesById[id]
  }, [])

  const sharedValues = useMemo(() => {
    return {
      main,
      paddingByLevel: paddingByLevelInTree,
      selectable,
      selectionMode,
      onRemove,
      onClone,
      onRename,
      onNewEntity: sharedOnNewEntity,
      onOpen,
      onNodeEditSelect,
      onNodeClick,
      onNodeDragOver: dragOverNode,
      onNodeCollapse: toggleNodeCollapse,
      onContextMenu: showContextMenu,
      onClearContextMenu: clearContextMenu,
      onClearEditSelect: clearEditSelect,
      getEntityNodeById
    }
  }, [
    main,
    paddingByLevelInTree,
    selectable,
    selectionMode,
    onRemove,
    onClone,
    onRename,
    sharedOnNewEntity,
    onOpen,
    onNodeEditSelect,
    onNodeClick,
    dragOverNode,
    toggleNodeCollapse,
    showContextMenu,
    clearContextMenu,
    clearEditSelect,
    getEntityNodeById
  ])

  return {
    groupMode,
    currentEntities,
    contextMenu,
    collapsedInfo,
    clipboard,
    highlightedArea,
    draggedNode,
    connectDropping,
    setFilter,
    setGroupMode: handleSetGroupMode,
    onSetClipboard,
    onReleaseClipboardTo,
    context: sharedValues
  }
}
