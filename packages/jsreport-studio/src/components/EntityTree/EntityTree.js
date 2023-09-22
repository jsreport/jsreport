import React, { useReducer, useRef, useCallback, useMemo, useImperativeHandle } from 'react'
import classNames from 'classnames'
import { useDispatch } from 'react-redux'
import useEntityTree from './useEntityTree'
import EntityTreeContext, { EntityTreeCollapsedContext, EntityTreeSelectedContext } from './EntityTreeContext'
import Toolbar from './Toolbar'
import TreeList from './TreeList'
import HighlightedArea from './HighlightedArea'
import ContextMenu from './ContextMenu'
import { getAllEntitiesInHierarchy } from './utils'
import { checkIsGroupEntityNode } from '../../helpers/checkEntityTreeNodes'
import { actions as editorActions } from '../../redux/editor'
import styles from './EntityTree.css'

const paddingByLevelInTree = 0.8

const EntityTree = React.forwardRef(({
  main,
  toolbar,
  selectable,
  selectionMode,
  initialSelected,
  entities,
  getContextMenuItems,
  onNewEntity,
  onRemove,
  onClone,
  onRename
}, ref) => {
  const [selectedEntities, selectDispatch] = useReducer(selectedReducer, initialSelected, (selected) => selected != null ? selected : {})

  const dispatch = useDispatch()

  const openTab = useCallback((...params) => {
    return dispatch(editorActions.openTab(...params))
  }, [dispatch])

  const editSelect = useCallback((...params) => {
    return dispatch(editorActions.editSelect(...params))
  }, [dispatch])

  const clearEditSelect = useCallback((...params) => {
    return dispatch(editorActions.clearEditSelect(...params))
  }, [dispatch])

  const hierarchyMove = useCallback((...params) => {
    return dispatch(editorActions.hierarchyMove(...params))
  }, [dispatch])

  const listContainerRef = useRef(null)
  const listRef = useRef(null)
  const contextMenuRef = useRef(null)
  // using memo because we want to ensure stable reference to the exposed [selectedEntities, selectDispatch]
  // useState seems to not return stable array on each render
  const selectedInfo = useMemo(() => [selectedEntities, selectDispatch], [selectedEntities, selectDispatch])

  useImperativeHandle(ref, () => ({
    selected: selectedEntities,
    clearSelected: () => {
      selectDispatch({ type: 'clear' })
    }
  }), [selectedEntities, selectDispatch])

  const {
    groupMode,
    currentEntities,
    contextMenu,
    collapsedInfo,
    clipboard,
    highlightedArea,
    draggedNode,
    connectDropping,
    setFilter,
    setGroupMode,
    onSetClipboard,
    onReleaseClipboardTo,
    context
  } = useEntityTree(main, {
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
  })

  const getListContainerDimensions = useCallback(() => {
    const dimensions = listContainerRef.current.getBoundingClientRect()
    const relativeTop = dimensions.top - listContainerRef.current.scrollTop
    const relativeBottom = dimensions.bottom + listContainerRef.current.scrollTop
    const relativeLeft = dimensions.left - listContainerRef.current.scrollLeft
    const relativeRight = dimensions.right + listContainerRef.current.scrollLeft

    return {
      ...dimensions,
      top: relativeTop,
      left: relativeLeft,
      y: relativeTop,
      x: relativeLeft,
      bottom: relativeBottom,
      right: relativeRight
    }
  }, [])

  const treeListContainerClass = classNames(styles.treeListContainer, {
    [styles.dragging]: draggedNode != null
  })

  return (
    <EntityTreeContext.Provider value={context}>
      <EntityTreeCollapsedContext.Provider value={collapsedInfo}>
        <EntityTreeSelectedContext.Provider value={selectedInfo}>
          <div
            ref={connectDropping}
            className={treeListContainerClass}
            onContextMenu={(e) => context.onContextMenu(e, null)}
          >
            {toolbar && (
              <Toolbar
                groupMode={groupMode}
                setFilter={setFilter}
                setGroupMode={setGroupMode}
                onNewEntity={onNewEntity}
              />
            )}
            <div ref={listContainerRef} className={styles.nodesBox}>
              <TreeList
                ref={listRef}
                groupMode={groupMode}
                entities={currentEntities}
              />
              <HighlightedArea
                highlightedArea={highlightedArea}
                getContainerDimensions={getListContainerDimensions}
              />
            </div>
            {renderContextMenu(
              contextMenu,
              contextMenuRef,
              getContextMenuItems,
              clipboard,
              onSetClipboard,
              onReleaseClipboardTo
            )}
          </div>
        </EntityTreeSelectedContext.Provider>
      </EntityTreeCollapsedContext.Provider>
    </EntityTreeContext.Provider>
  )
})

function selectedReducer (state, action) {
  switch (action.type) {
    case 'set': {
      const selected = state
      const { mode, node, value } = action
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

      return newSelected
    }

    case 'clear': {
      return {}
    }
  }
}

function renderContextMenu (contextMenu, contextMenuRef, getContextMenuItems, clipboard, onSetClipboard, onReleaseClipboardTo) {
  if (
    !contextMenu
  ) {
    return null
  }

  let type

  if (contextMenu.id === '__ROOT__') {
    type = 'root'
  } else if (contextMenu.node != null) {
    type = 'node'
  }

  if (type == null) {
    return null
  }

  const props = {
    ref: contextMenuRef,
    clipboard,
    getContextMenuItems,
    getCoordinates: contextMenu.getCoordinates,
    onSetClipboard,
    onReleaseClipboardTo
  }
  if (type === 'node') {
    props.node = contextMenu.node
    props.entity = contextMenu.node.data
  }

  return (
    <ContextMenu
      {...props}
    />
  )
}

export default EntityTree
