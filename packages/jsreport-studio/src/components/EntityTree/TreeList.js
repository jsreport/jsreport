import React, { useRef, useImperativeHandle } from 'react'
import ReactList from 'react-list'
import TreeNode from './TreeNode'
import {
  getNodeId,
  groupEntitiesByType,
  groupEntitiesByHierarchy,
  getSetsToRender,
  checkIsGroupNode,
  checkIsGroupEntityNode
} from './utils'
import { entitySets } from '../../lib/configuration.js'

const TreeList = React.forwardRef(function TreeList ({ entities, children }, ref) {
  const containerRef = useRef(null)
  const entityNodesByIdRef = useRef({})

  useImperativeHandle(ref, () => ({
    entityNodesById: entityNodesByIdRef.current,
    node: containerRef.current
  }))

  /*
    When a render callback (function as child) is passed it means that an extension
    wants to control how entity tree is rendered and we should pass all useful
    information to the callback
  */
  const renderTreeNode = (node = {}, depth, treeIsDraggable) => {
    const treeDepth = depth || 0
    let isDraggable

    if (treeIsDraggable != null) {
      isDraggable = treeIsDraggable
    } else {
      if (checkIsGroupNode(node)) {
        isDraggable = false

        if (checkIsGroupEntityNode(node)) {
          isDraggable = true
        }
      } else {
        isDraggable = true
      }
    }

    return (
      <TreeNode
        key={node.id}
        node={node}
        depth={treeDepth}
        draggable={isDraggable}
        renderTree={renderTree}
      />
    )
  }

  const renderTree = (nodeList, depth = 0, parentId, treeIsDraggable) => {
    if (depth === 0) {
      entityNodesByIdRef.current = {}
    }

    const nodeListToRender = nodeList.map((node) => {
      const isGroupEntityNode = checkIsGroupEntityNode(node)
      const isGroupNode = checkIsGroupNode(node)
      const isOnlyGroupNode = isGroupNode && !isGroupEntityNode
      const nodeId = getNodeId(node.name, isOnlyGroupNode ? null : node.data, parentId, depth)

      const newNode = {
        id: nodeId,
        ...node
      }

      if (isGroupEntityNode || !isGroupNode) {
        entityNodesByIdRef.current[node.data._id] = newNode
      }

      return newNode
    })

    return (
      <ReactList
        itemRenderer={(index) => renderTreeNode(
          nodeListToRender[index],
          depth,
          treeIsDraggable
        )}
        length={nodeListToRender.length}
      />
    )
  }

  const renderDefaultTree = () => (
    <div ref={containerRef}>
      {renderTree(
        groupEntitiesByHierarchy(entitySets, entities)
      )}
    </div>
  )

  if (typeof children === 'function') {
    return children({
      // we render the root tree with a wraper div to be able to
      // calculate some things for the drag and drop interactions
      renderDefaultTree,
      renderTree: (...args) => (
        <div ref={containerRef}>
          {renderTree(...args)}
        </div>
      ),
      getSetsToRender: getSetsToRender,
      groupEntitiesByType: groupEntitiesByType,
      groupEntitiesByHierarchy: groupEntitiesByHierarchy,
      entitySets,
      entities
    })
  }

  return renderDefaultTree()
})

export default React.memo(TreeList)
