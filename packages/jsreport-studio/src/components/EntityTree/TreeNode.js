import React, { useEffect, useRef, useContext, useMemo } from 'react'
import classNames from 'classnames'
import composeRefs from '@seznam/compose-react-refs'
import { useDrag, useDrop } from 'react-dnd'
import EntityTreeContext from './EntityTreeContext'
import acceptDrop from './acceptDrop'
import usePrevious from '../../hooks/usePrevious'
import GroupNode from './GroupNode'
import EntityNode from './EntityNode'
import ENTITY_NODE_DRAG_TYPE from './nodeDragType'
import { checkIsGroupNode, checkIsGroupEntityNode, getNodeDOMId, getNodeTitleDOMId } from './utils'
import styles from './EntityTree.css'

const TreeNode = ({ node, depth, draggable, renderTree }) => {
  const { selectable, isNodeCollapsed, onNodeDragOver, onNodeCollapse } = useContext(EntityTreeContext)
  const isGroupNode = checkIsGroupNode(node)
  const isGroupEntityNode = checkIsGroupEntityNode(node)
  const isEntityNode = checkIsGroupNode(node) ? checkIsGroupEntityNode(node) : true
  const isCollapsed = isNodeCollapsed(node)

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
        isCollapsed: isNodeCollapsed(node),
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
    id,
    titleId,
    node,
    depth,
    isDragging,
    connectDragging
  }

  return (
    <div
      ref={connectDropping}
      className={containerClass}
    >
      {isGroupNode
        ? (
          <GroupNode
            {...commonProps}
            draggable={draggable}
            renderTree={renderTree}
          />
          )
        : (
          <EntityNode
            {...commonProps}
          />
          )}
    </div>
  )
}

export default TreeNode
