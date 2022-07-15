import React, { useRef, useCallback, useImperativeHandle } from 'react'
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
  const allNodesByNodeIdRef = useRef({})
  const rootEntityNodesRef = useRef([])
  const parentNodesByIdRef = useRef({})
  const entityNodesByIdRef = useRef({})

  const getRelativeEntitiesById = useCallback(function getRelativeEntitiesById (id) {
    const parentNode = parentNodesByIdRef.current[id]
    const foundInRoot = parentNode == null ? rootEntityNodesRef.current.find((node) => node.data._id === id) != null : false

    if (parentNode != null) {
      return parentNode.items.filter((item) => !checkIsGroupNode(item) || checkIsGroupEntityNode(item))
    } else if (foundInRoot) {
      return rootEntityNodesRef.current
    }

    return []
  }, [])

  useImperativeHandle(ref, () => ({
    entityNodesById: entityNodesByIdRef.current,
    getRelativeEntitiesById,
    node: containerRef.current
  }), [getRelativeEntitiesById])

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
      allNodesByNodeIdRef.current = {}
      rootEntityNodesRef.current = []
      parentNodesByIdRef.current = {}
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

      allNodesByNodeIdRef.current[nodeId] = newNode

      if (isGroupEntityNode || !isGroupNode) {
        entityNodesByIdRef.current[node.data._id] = newNode

        if (
          parentId != null &&
          allNodesByNodeIdRef.current[parentId] != null
        ) {
          parentNodesByIdRef.current[node.data._id] = allNodesByNodeIdRef.current[parentId]
        } else {
          rootEntityNodesRef.current.push(newNode)
        }
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
      // we render the root tree with a wrapper div to be able to
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
