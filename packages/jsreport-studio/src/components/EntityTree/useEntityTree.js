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
  selected,
  activeEntity,
  getContextMenuItems,
  openTab,
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

  const { isNodeCollapsed, toogleNodeCollapse, collapseHandler } = useCollapsed({
    listRef
  })

  const { contextMenu, showContextMenu, clearContextMenu } = useContextMenu(contextMenuRef)

  useEffect(() => {
    if (main) {
      registerCollapseEntityHandler(collapseHandler)
    }
  }, [main, collapseHandler])

  const copyOrMoveEntity = useCallback((sourceInfo, targetInfo, shouldCopy = false) => {
    hierarchyMove(sourceInfo, targetInfo, shouldCopy, false, true).then((result) => {
      if (targetInfo.shortid != null) {
        const targetEntity = storeMethods.getEntityByShortid(targetInfo.shortid)
        toogleNodeCollapse(listRef.current.entityNodesById[targetEntity._id], false)
      }

      if (!result || result.duplicatedEntity !== true) {
        return
      }

      openModal(HierarchyReplaceEntityModal, {
        sourceId: sourceInfo.id,
        targetShortId: targetInfo.shortid,
        targetChildren: targetInfo.children,
        existingEntity: result.existingEntity,
        existingEntityEntitySet: result.existingEntityEntitySet,
        shouldCopy
      })
    })
  }, [hierarchyMove, toogleNodeCollapse, listRef])

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

      const hierachyEntityTitleDimensions = hierarchyEntityTitleDOMNode.getBoundingClientRect()

      newHighlightedArea.label = {
        top: hierachyEntityTitleDimensions.top,
        left: hierachyEntityTitleDimensions.left,
        width: hierachyEntityTitleDimensions.width,
        height: hierachyEntityTitleDimensions.height
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
          top: hierachyEntityTitleDimensions.top + (hierachyEntityTitleDimensions.height + 4),
          left: hierachyEntityTitleDimensions.left,
          width: `${paddingByLevelInTree}rem`,
          height: hierarchyEntityDimensions.height - (hierachyEntityTitleDimensions.height + 4)
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
      allEntities: entities,
      paddingByLevel: paddingByLevelInTree,
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
          toogleNodeCollapse(node, false)
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
      onNodeClick: (node) => {
        const isGroup = checkIsGroupNode(node)
        const isGroupEntity = checkIsGroupEntityNode(node)
        const isEntity = !isGroupEntity && !checkIsGroupNode(node)

        if (isEntity) {
          openTab({ _id: node.data._id })
        } else if (isGroup || isGroupEntity) {
          toogleNodeCollapse(node)
        }

        clearContextMenu()
      },
      onNodeDragOver: dragOverNode,
      onNodeCollapse: toogleNodeCollapse,
      onContextMenu: showContextMenu,
      onClearContextMenu: clearContextMenu,
      onSetClipboard: (newClipboard) => {
        setClipboard(newClipboard)
      },
      onReleaseClipboardTo: (destination) => {
        if (clipboard == null) {
          return
        }

        copyOrMoveEntity({
          id: clipboard.entityId,
          entitySet: clipboard.entitySet
        }, {
          shortid: destination.shortid,
          children: destination.children
        }, clipboard.action === 'copy')

        setClipboard(null)
      },
      isNodeCollapsed,
      isNodeSelected: (node) => {
        return selected[node.data._id] === true
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
      getContextMenuItems
    }
  }, [
    entities,
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
    getContextMenuItems,
    isNodeCollapsed,
    toogleNodeCollapse,
    dragOverNode,
    showContextMenu,
    clearContextMenu,
    copyOrMoveEntity,
    contextMenuRef
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
