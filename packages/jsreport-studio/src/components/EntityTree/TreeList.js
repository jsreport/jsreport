import React, { useRef, useCallback, useImperativeHandle, useMemo } from 'react'
import ReactList from 'react-list'
import memoizeOne from 'memoize-one'
import TreeNode from './TreeNode'

import { getNodeId, getSetsToRender } from './utils'
import { checkIsGroupNode, checkIsGroupEntityNode } from '../../helpers/checkEntityTreeNodes'
import { values as configuration } from '../../lib/configuration'

const TreeList = React.forwardRef(function TreeList ({ groupMode, entities }, ref) {
  const containerRef = useRef(null)
  const virtualListRef = useRef(null)
  const allNodesByNodeIdRef = useRef({})
  const rootEntityNodesRef = useRef([])
  const parentNodesByIdRef = useRef({})
  const entityNodesByIdRef = useRef({})

  const createGrouper = useMemo(() => (
    configuration.entityTreeGroupModes[groupMode]?.createGrouper
  ), [groupMode])

  if (createGrouper == null) {
    throw new Error(`groupMode "${groupMode}" is not a valid group mode`)
  }

  const memoizedGroupEntities = useMemo(() => {
    const grouper = createGrouper()

    const executeGroup = (...args) => {
      const results = grouper(...args)

      allNodesByNodeIdRef.current = {}
      rootEntityNodesRef.current = []
      parentNodesByIdRef.current = {}
      entityNodesByIdRef.current = {}

      const pending = [{ parentId: null, nodeList: results }]

      while (pending.length > 0) {
        const { parentId, nodeList } = pending.shift()

        for (const node of nodeList) {
          const isGroupEntityNode = checkIsGroupEntityNode(node)
          const isGroupNode = checkIsGroupNode(node)

          allNodesByNodeIdRef.current[node.id] = node

          if (isGroupEntityNode || !isGroupNode) {
            entityNodesByIdRef.current[node.data._id] = node

            if (
              parentId != null &&
              allNodesByNodeIdRef.current[parentId] != null
            ) {
              parentNodesByIdRef.current[node.data._id] = allNodesByNodeIdRef.current[parentId]
            } else {
              rootEntityNodesRef.current.push(node)
            }
          }

          if (isGroupNode && node.items.length > 0) {
            pending.push({
              parentId: node.id,
              nodeList: node.items
            })
          }
        }
      }

      return results
    }

    return memoizeOne(executeGroup)
  }, [createGrouper])

  const groupHelpers = useMemo(() => ({
    getNodeId,
    getSetsToRender,
    checkIsGroupNode,
    checkIsGroupEntityNode
  }), [])

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

  // we don't define any deps because we want the new ref exposed values to recreate on each render,
  // because we expose object values directly from other internal refs, we are basically copying
  // values from other refs to this one, and since our internal refs values are calculated
  // during render we want to keep up to date values.
  // (if we declare deps the ref handler will be called according to changes to deps and
  // we don't want that)
  useImperativeHandle(ref, () => ({
    entityNodesById: entityNodesByIdRef.current,
    getRelativeEntitiesById,
    node: containerRef.current,
    virtualList: virtualListRef.current
  }))

  /*
    When a render callback (function as child) is passed it means that an extension
    wants to control how entity tree is rendered and we should pass all useful
    information to the callback
  */
  const renderTreeNode = useCallback(function renderTreeNode (node = {}, depth, treeIsDraggable) {
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
  }, [])

  const renderTree = useCallback(function renderTree (nodeList, depth = 0, parentId, treeIsDraggable) {
    const listProps = {
      itemRenderer: (index) => renderTreeNode(
        nodeList[index],
        depth,
        treeIsDraggable
      ),
      length: nodeList.length
    }

    if (depth === 0) {
      listProps.ref = virtualListRef
    }

    return (
      <ReactList
        {...listProps}
      />
    )
  }, [renderTreeNode])

  return (
    <div ref={containerRef}>
      {renderTree(
        memoizedGroupEntities(configuration.entitySets, entities, groupHelpers)
      )}
    </div>
  )
})

export default React.memo(TreeList)
