import React, { useRef, useCallback } from 'react'
import classNames from 'classnames'
import { useDispatch } from 'react-redux'
import useEntityTree from './useEntityTree'
import EntityTreeContext from './EntityTreeContext'
import Toolbar from './Toolbar'
import TreeList from './TreeList'
import HighlightedArea from './HighlightedArea'
import { RootContextMenu } from './ContextMenu'
import { actions as editorActions } from '../../redux/editor'
import styles from './EntityTree.css'

const paddingByLevelInTree = 0.8

const EntityTree = ({
  main,
  toolbar,
  selectable,
  selectionMode,
  selected,
  activeEntity,
  entities,
  getContextMenuItems,
  onNewEntity,
  onRemove,
  onClone,
  onRename,
  onSelectionChanged,
  children
}) => {
  const dispatch = useDispatch()

  const openTab = useCallback((...params) => {
    return dispatch(editorActions.openTab(...params))
  }, [dispatch])

  const hierarchyMove = useCallback((...params) => {
    return dispatch(editorActions.hierarchyMove(...params))
  }, [dispatch])

  const listContainerRef = useRef(null)
  const listRef = useRef(null)
  const contextMenuRef = useRef(null)

  const {
    currentEntities,
    highlightedArea,
    draggedNode,
    connectDropping,
    setFilter,
    context
  } = useEntityTree(main, {
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
      <div
        ref={connectDropping}
        className={treeListContainerClass}
        onContextMenu={(e) => context.onContextMenu(e, null)}
      >
        {toolbar && (
          <Toolbar
            setFilter={setFilter}
            onNewEntity={onNewEntity}
          />
        )}
        <div ref={listContainerRef} className={styles.nodesBox}>
          <TreeList
            ref={listRef}
            entities={currentEntities}
          >
            {children}
          </TreeList>
          <HighlightedArea
            highlightedArea={highlightedArea}
            getContainerDimensions={getListContainerDimensions}
          />
        </div>
        <RootContextMenu
          ref={contextMenuRef}
          getContextMenuItems={getContextMenuItems}
        />
      </div>
    </EntityTreeContext.Provider>
  )
}

export default EntityTree
