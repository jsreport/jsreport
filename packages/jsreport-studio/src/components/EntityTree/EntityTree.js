import React, { useRef, useCallback, useMemo } from 'react'
import classNames from 'classnames'
import { useDispatch } from 'react-redux'
import useEntityTree from './useEntityTree'
import EntityTreeContext from './EntityTreeContext'
import Toolbar from './Toolbar'
import TreeList from './TreeList'
import HighlightedArea from './HighlightedArea'
import ContextMenu from './ContextMenu'
import { actions as editorActions } from '../../redux/editor'
import styles from './EntityTree.css'

const paddingByLevelInTree = 0.8

const EntityTree = ({
  main,
  toolbar,
  selectable,
  selectionMode,
  selected,
  entities,
  getContextMenuItems,
  onNewEntity,
  onRemove,
  onClone,
  onRename,
  onSelectionChanged
}) => {
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

  const {
    groupMode,
    currentEntities,
    contextMenu,
    collapsedNodes,
    collapsedDefaultValue,
    highlightedArea,
    draggedNode,
    connectDropping,
    setFilter,
    setGroupMode,
    context
  } = useEntityTree(main, {
    paddingByLevelInTree,
    selectable,
    selectionMode,
    entities,
    selected,
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
  })

  const collapsedInfo = useMemo(() => ({
    nodes: collapsedNodes,
    defaultValue: collapsedDefaultValue
  }), [collapsedNodes, collapsedDefaultValue])

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
            collapsedInfo={collapsedInfo}
          />
          <HighlightedArea
            highlightedArea={highlightedArea}
            getContainerDimensions={getListContainerDimensions}
          />
        </div>
        {renderContextMenu(contextMenu, contextMenuRef, getContextMenuItems)}
      </div>
    </EntityTreeContext.Provider>
  )
}

function renderContextMenu (contextMenu, contextMenuRef, getContextMenuItems) {
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
    getContextMenuItems,
    getCoordinates: contextMenu.getCoordinates
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
