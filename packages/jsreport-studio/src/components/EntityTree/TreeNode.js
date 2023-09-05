import React, { useEffect, useRef, useContext, useMemo } from 'react'
import { useSelector } from 'react-redux'
import classNames from 'classnames'
import composeRefs from '@seznam/compose-react-refs'
import { useDrag, useDrop } from 'react-dnd'
import EntityTreeContext from './EntityTreeContext'
import acceptDrop from './acceptDrop'
import usePrevious from '../../hooks/usePrevious'
import GroupNode from './GroupNode'
import EntityNode from './EntityNode'
import ENTITY_NODE_DRAG_TYPE from './nodeDragType'
import { getNodeDOMId, getNodeTitleDOMId } from './utils'
import { createSelector, createGetActiveEntitySelector } from '../../redux/editor/selectors'
import { checkIsGroupNode, checkIsGroupEntityNode } from '../../helpers/checkEntityTreeNodes'
import styles from './EntityTree.css'

const TreeNode = React.memo(({ node, depth, draggable, renderTree }) => {
  const {
    main,
    selectable,
    paddingByLevel,
    hasEditSelection,
    isNodeEditSelected,
    onNewEntity,
    onNodeDragOver,
    onNodeCollapse,
    onNodeEditSelect,
    onNodeClick,
    onContextMenu
  } = useContext(EntityTreeContext)

  const props = {
    node,
    depth,
    draggable,
    main,
    selectable,
    paddingByLevel,
    hasEditSelection,
    isNodeEditSelected,
    renderTree,
    onNewEntity,
    onNodeDragOver,
    onNodeCollapse,
    onNodeEditSelect,
    onNodeClick,
    onContextMenu
  }

  const TreeNodeItem = main ? ConnectedTreeNodeItem : RawTreeNodeItem

  return (
    <TreeNodeItem
      {...props}
    />
  )
})

const RawTreeNodeItem = React.memo(({
  node,
  depth,
  draggable,
  renderTree,
  main,
  selectable,
  paddingByLevel,
  hasEditSelection,
  isNodeEditSelected,
  isActive = false,
  onNewEntity,
  onNodeDragOver,
  onNodeCollapse,
  onNodeEditSelect,
  onNodeClick,
  onContextMenu
}) => {
  const isGroupNode = checkIsGroupNode(node)
  const isGroupEntityNode = checkIsGroupEntityNode(node)
  const isEntityNode = checkIsGroupNode(node) ? checkIsGroupEntityNode(node) : true
  const isCollapsed = node.collapsed === true

  const dragPreviewOptions = useMemo(() => ({
    captureDraggingState: true
  }), [])

  const [{ isOverShallow }, connectDropTarget] = useDrop({
    accept: acceptDrop(),
    collect: (monitor) => ({
      isOverShallow: monitor.isOver({ shallow: true })
    }),
    hover: (item, monitor) => {
      if (!monitor.isOver({ shallow: true })) {
        return
      }

      onNodeDragOver({
        entitySet: node.data.__entitySet,
        isGroupEntity: isGroupEntityNode,
        isCollapsed,
        targetNode: node
      })
    }
  })

  const [{ isDragging }, connectDragSource, connectDragPreview] = useDrag({
    item: { type: ENTITY_NODE_DRAG_TYPE },
    collect: (monitor) => {
      return {
        isDragging: monitor.isDragging()
      }
    },
    previewOptions: dragPreviewOptions,
    begin: () => {
      return {
        entitySet: node.data.__entitySet,
        isGroupEntity: checkIsGroupEntityNode(node),
        isCollapsed,
        node
      }
    }
  })

  const draggingExpandTimeoutRef = useRef(null)
  const prevIsOverShallow = usePrevious(isOverShallow)

  useEffect(() => {
    if (prevIsOverShallow === false && isOverShallow === true) {
      clearTimeout(draggingExpandTimeoutRef.current)

      if (!isGroupEntityNode || !isCollapsed) {
        return
      }

      draggingExpandTimeoutRef.current = setTimeout(() => {
        if (!isGroupEntityNode || !isCollapsed) {
          return
        }

        onNodeCollapse(node)
      }, 700)
    } else if (prevIsOverShallow === true && isOverShallow === false) {
      clearTimeout(draggingExpandTimeoutRef.current)
    }
  })

  const containerClass = classNames(styles.nodeBox, {
    [styles.nodeBoxItem]: !isGroupNode
  })

  let connectDragging = composeRefs(connectDragSource, (node) => {
    connectDragPreview(node, dragPreviewOptions)
  })

  let connectDropping = connectDropTarget

  if (selectable || !draggable || !isEntityNode) {
    connectDragging = undefined
    connectDropping = undefined
  }

  let id
  let titleId

  if (isEntityNode) {
    id = getNodeDOMId(node.data)
    titleId = getNodeTitleDOMId(node.data)
  }

  const commonProps = {
    main,
    selectable,
    paddingByLevel,
    id,
    titleId,
    node,
    depth,
    isDragging,
    connectDragging,
    isActive,
    hasEditSelection,
    isNodeEditSelected,
    onNodeEditSelect,
    onNodeClick,
    onContextMenu
  }

  const groupProps = {
    isCollapsed,
    draggable,
    renderTree,
    onNewEntity
  }

  const entityProps = {}

  return (
    <div
      ref={connectDropping}
      className={containerClass}
    >
      {isGroupNode
        ? (
          <GroupNode
            {...commonProps}
            {...groupProps}
          />
          )
        : (
          <EntityNode
            {...commonProps}
            {...entityProps}
          />
          )}
    </div>
  )
})

const createIsNodeActiveSelector = () => createSelector(
  createGetActiveEntitySelector(),
  (_, node) => node,
  (activeEntity, node) => {
    let active = false

    if (
      activeEntity != null &&
      (checkIsGroupEntityNode(node) || !checkIsGroupNode(node)) &&
      node.data != null && node.data._id === activeEntity._id
    ) {
      active = true
    }

    return active
  }
)

const ConnectedTreeNodeItem = (props) => {
  const { node } = props

  const isNodeActive = useMemo(createIsNodeActiveSelector, [])
  const isActive = useSelector((state) => isNodeActive(state, node))

  return (
    <RawTreeNodeItem
      {...props}
      isActive={isActive}
    />
  )
}

export default TreeNode
