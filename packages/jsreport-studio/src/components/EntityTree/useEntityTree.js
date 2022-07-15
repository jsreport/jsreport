import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import isEqual from 'lodash/isEqual'
import useFilteredEntities from './useFilteredEntities'
import useCollapsed from './useCollapsed'
import useContextMenu from './useContextMenu'
import useDropHandler from './useDropHandler'
import useConstructor from '../../hooks/useConstructor'
import HierarchyReplaceEntityModal from '../Modals/HierarchyReplaceEntityModal'
import storeMethods from '../../redux/methods'
import ENTITY_NODE_DRAG_TYPE from './nodeDragType'
import {
  checkIsGroupNode,
  checkIsGroupEntityNode,
  getAllEntitiesInHierarchy,
  getNodeDOMId,
  getNodeTitleDOMId
} from './utils'
import { openModal } from '../../helpers/openModal'
import { registerCollapseEntityHandler, entityTreeDropResolvers } from '../../lib/configuration.js'

const mainEntityDropResolver = {
  type: ENTITY_NODE_DRAG_TYPE,
  handler: () => {}
}

export default function useEntityTree (main, {
  paddingByLevelInTree,
  selectable,
  selectionMode,
  entities,
  editSelection,
  lastEditSelectionFocused,
  selected,
  activeEntity,
  getContextMenuItems,
  openTab,
  editSelect,
  clearEditSelect,
  hierarchyMove,
  onNewEntity,
  onRemove,
  onClone,
  onRename,
  onSelectionChanged,
  listRef,
  contextMenuRef
}) {
  const dragOverContextRef = useRef(null)
  const [clipboard, setClipboard] = useState(null)
  const [highlightedArea, setHighlightedArea] = useState(null)
  const [currentEntities, setFilter] = useFilteredEntities(entities)

  const { isNodeCollapsed, toggleNodeCollapse, collapseHandler } = useCollapsed({
    listRef
  })

  const { contextMenu, showContextMenu, clearContextMenu } = useContextMenu(contextMenuRef)

  const editSelectEntityAboveOrBellow = useCallback((entityId, action) => {
    const relativeEntitiesNodes = listRef.current.getRelativeEntitiesById(entityId)
    const index = relativeEntitiesNodes.findIndex((node) => node.data._id === entityId)
    const limit = action === 'up' ? 0 : relativeEntitiesNodes.length - 1

    if (index !== limit) {
      const targetIndex = action === 'up' ? index - 1 : index + 1
      const targetEntityNode = relativeEntitiesNodes[targetIndex]
      // we just want to toggle the above entity
      editSelect(targetEntityNode.data._id)
    }
  }, [listRef, editSelect])

  useEffect(() => {
    if (main) {
      registerCollapseEntityHandler(collapseHandler)
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

      if (editSelection == null) {
        return
      }

      // we only want to clear on ESC when there is no context menu
      if (contextMenuRef.current == null && ev.which === 27) {
        clearEditSelect()
      }

      // if node that has edit selection enabled has focus then handle arrows keys
      if (
        lastEditSelectionFocused != null &&
        ev.target.dataset != null &&
        (ev.target.dataset.editSelectionEnabled === 'true' || ev.target.dataset.editSelectionEnabled === true) &&
        document.activeElement === ev.target
      ) {
        if (ev.shiftKey && ev.which === 38) {
          editSelectEntityAboveOrBellow(lastEditSelectionFocused, 'up')
        } else if (ev.shiftKey && ev.which === 40) {
          editSelectEntityAboveOrBellow(lastEditSelectionFocused, 'down')
        }
      }
    }

    window.addEventListener('click', tryClearFromClick, true)
    window.addEventListener('keydown', trySelectOrClearFromKey)

    return () => {
      window.removeEventListener('click', tryClearFromClick, true)
      window.removeEventListener('keydown', trySelectOrClearFromKey)
    }
  }, [main, listRef, contextMenuRef, editSelection, lastEditSelectionFocused, editSelectEntityAboveOrBellow, clearEditSelect])

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

  const isValidHierarchyTarget = useCallback((sourceNode, targetNode) => {
    const containersInHierarchyForTarget = []
    let containerSourceEntity
    let containerTargetEntity

    if (sourceNode.data.__entitySet === 'folders') {
      containerSourceEntity = storeMethods.getEntityByShortid(sourceNode.data.shortid)
    } else {
      return true
    }

    if (targetNode.data.__entitySet === 'folders') {
      containerTargetEntity = storeMethods.getEntityByShortid(targetNode.data.shortid)
    } else {
      if (targetNode.data.folder == null) {
        return true
      }

      containerTargetEntity = storeMethods.getEntityByShortid(targetNode.data.folder.shortid)
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
      const parentContainer = storeMethods.getEntityByShortid(currentContainer.folder.shortid)
      containersInHierarchyForTarget.push(parentContainer.shortid)
      currentContainer = parentContainer
    }

    if (
      containersInHierarchyForTarget.indexOf(containerSourceEntity.shortid) !== -1
    ) {
      return false
    }

    return true
  }, [])

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
      const registered = entityTreeDropResolvers.find((r) => r === mainEntityDropResolver)

      if (registered != null) {
        return
      }

      entityTreeDropResolvers.push(mainEntityDropResolver)
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
        hierarchyEntity = storeMethods.getEntityByShortid(targetEntityNode.data.shortid)
        containerTargetInContext = hierarchyEntity
      } else {
        hierarchyEntity = storeMethods.getEntityByShortid(targetEntityNode.data.folder.shortid)
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

        if (isNodeCollapsed(nodeObj)) {
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
  }, [paddingByLevelInTree, clearHighlightedArea, isNodeCollapsed, isValidHierarchyTarget, listRef])

  const { draggedNode, dragOverNode, connectDropTarget } = useDropHandler({
    listRef,
    dragOverContextRef,
    onDragOverNode: showHighlightedArea,
    onDragEnd: clearHighlightedArea,
    onDragOut: clearHighlightedArea
  })

  const connectDropping = !selectable ? connectDropTarget : undefined

  const sharedValues = useMemo(() => {
    return {
      main,
      allEntities: entities,
      paddingByLevel: paddingByLevelInTree,
      editSelection,
      selectable,
      selectionMode,
      contextMenu,
      clipboard,
      contextMenuRef,
      onRemove,
      onClone,
      onRename,
      onNewEntity: (node, ...params) => {
        if (node && node.isEntitySet !== true) {
          toggleNodeCollapse(node, false)
        }

        onNewEntity(...params)
      },
      onOpen: (entity) => {
        openTab({ _id: entity._id })
      },
      onNodeSelect: (node, value, mode) => {
        if (!selectable) {
          return
        }

        const isGroupEntityNode = checkIsGroupEntityNode(node)

        const toProcess = isGroupEntityNode ? getAllEntitiesInHierarchy(node, true) : [node.data._id]

        if (toProcess.length === 0) {
          return
        }

        const updates = {
          ...(mode !== 'single' ? selected : undefined),
          ...toProcess.reduce((acu, currentEntityId) => {
            acu[currentEntityId] = value != null ? value : !selected[currentEntityId]
            return acu
          }, {})
        }

        const newSelected = {}

        // eslint-disable-next-line
        for (const entityId of Object.keys(updates)) {
          if (updates[entityId] === true) {
            newSelected[entityId] = true
          }
        }

        onSelectionChanged(newSelected)
      },
      onNodeEditSelect: (node) => {
        const isGroupEntity = checkIsGroupEntityNode(node)
        const isEntity = !isGroupEntity && !checkIsGroupNode(node)

        if (isEntity || isGroupEntity) {
          editSelect(node.data._id, { initializeWithActive: true })
        }

        clearContextMenu()
      },
      onNodeClick: (node) => {
        const isGroup = checkIsGroupNode(node)
        const isGroupEntity = checkIsGroupEntityNode(node)
        const isEntity = !isGroupEntity && !checkIsGroupNode(node)

        if (isEntity) {
          openTab({ _id: node.data._id })
        } else if (isGroup || isGroupEntity) {
          toggleNodeCollapse(node)
        }

        clearContextMenu()
      },
      onNodeDragOver: dragOverNode,
      onNodeCollapse: toggleNodeCollapse,
      onContextMenu: showContextMenu,
      onClearContextMenu: clearContextMenu,
      onClearEditSelect: clearEditSelect,
      onSetClipboard: (newClipboard) => {
        setClipboard(newClipboard)
      },
      onReleaseClipboardTo: (destination) => {
        if (clipboard == null) {
          return
        }

        copyOrMoveEntity(clipboard.source, {
          shortid: destination.shortid,
          children: destination.children
        }, clipboard.action === 'copy')

        setClipboard(null)
      },
      hasEditSelection: () => {
        return editSelection != null
      },
      isNodeCollapsed,
      isNodeSelected: (node) => {
        return selected[node.data._id] === true
      },
      isNodeEditSelected: (node) => {
        if (editSelection == null) {
          return false
        }

        if (checkIsGroupNode(node) && !checkIsGroupEntityNode(node)) {
          return false
        }

        return editSelection.find((id) => node.data._id === id) != null
      },
      isNodeActive: (node) => {
        let active = false

        if (
          activeEntity != null &&
          (checkIsGroupEntityNode(node) || !checkIsGroupNode(node)) &&
          node.data != null && node.data._id === activeEntity._id
        ) {
          active = true
        }

        return active
      },
      getEntityNodeById: (id) => {
        return listRef.current.entityNodesById[id]
      },
      getContextMenuItems
    }
  }, [
    main,
    entities,
    editSelection,
    paddingByLevelInTree,
    selectable,
    selectionMode,
    contextMenu,
    clipboard,
    selected,
    activeEntity,
    onNewEntity,
    onClone,
    onRename,
    onRemove,
    onSelectionChanged,
    openTab,
    editSelect,
    clearEditSelect,
    getContextMenuItems,
    isNodeCollapsed,
    toggleNodeCollapse,
    dragOverNode,
    showContextMenu,
    clearContextMenu,
    copyOrMoveEntity,
    contextMenuRef,
    listRef
  ])

  return {
    currentEntities,
    highlightedArea,
    draggedNode,
    connectDropping,
    setFilter,
    context: sharedValues
  }
}
