import { useState, useCallback } from 'react'
import storeMethods from '../../redux/methods'
import { checkIsGroupNode, checkIsGroupEntityNode } from './utils'

export default function useCollapsed ({
  listRef
}) {
  const [collapsedNodes, setCollapsed] = useState({})

  const isNodeCollapsed = useCallback((node) => {
    if (checkIsGroupNode(node) && !checkIsGroupEntityNode(node)) {
      return collapsedNodes[node.id] == null ? false : collapsedNodes[node.id] === true
    }

    return collapsedNodes[node.id] == null ? true : collapsedNodes[node.id] === true
  }, [collapsedNodes])

  const toogleNodeCollapse = useCallback((node, forceState) => {
    const nodesToProcess = Array.isArray(node) ? node : [node]

    if (nodesToProcess.length === 0) {
      return
    }

    const newState = nodesToProcess.reduce((acu, nodeObj) => {
      let newCollapseState

      if (forceState != null) {
        newCollapseState = forceState === true
      } else {
        newCollapseState = !isNodeCollapsed(nodeObj)
      }

      acu[nodeObj.id] = newCollapseState

      return acu
    }, {})

    setCollapsed((prev) => ({
      ...prev,
      ...newState
    }))
  }, [isNodeCollapsed])

  const collapseHandler = useCallback((idOrShortid, state, options = {}) => {
    const { parents, self = true } = options
    const toCollapse = []
    let entity

    if (idOrShortid._id) {
      entity = storeMethods.getEntityById(idOrShortid._id, false)
    } else if (idOrShortid.shortid) {
      entity = storeMethods.getEntityByShortid(idOrShortid.shortid, false)
    }

    if (!entity) {
      return
    }

    if (entity.__entitySet === 'folders' && self === true) {
      toCollapse.push(entity)
    }

    if (parents === true) {
      let currentEntity = entity

      while (currentEntity != null) {
        if (currentEntity.folder != null) {
          currentEntity = storeMethods.getEntityByShortid(currentEntity.folder.shortid, false)

          if (currentEntity != null) {
            toCollapse.unshift(currentEntity)
          }
        } else {
          currentEntity = null
        }
      }
    }

    toogleNodeCollapse(toCollapse.map((folder) => {
      return listRef.current.entityNodesById[folder._id]
    }), state)
  }, [listRef, toogleNodeCollapse])

  return {
    isNodeCollapsed,
    toogleNodeCollapse,
    collapseHandler
  }
}
