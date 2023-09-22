import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import storeMethods from '../../redux/methods'
import { checkIsGroupNode, checkIsGroupEntityNode } from '../../helpers/checkEntityTreeNodes'
import getEntityTreeCollapsedDefaultValue from '../../helpers/getEntityTreeCollapsedDefaultValue'
import { getNodeTitleDOMId } from './utils'

export default function useCollapsed ({
  listRef
}) {
  const [collapsedNodes, setCollapsed] = useState({})
  const pendingAfterCollapsingRef = useRef([])
  // using memo because we want to ensure stable reference to the exposed [collapsedNodes, setCollapsed]
  // useState seems to not return stable array on each render
  const collapsedInfo = useMemo(() => [collapsedNodes, setCollapsed], [collapsedNodes, setCollapsed])

  const toggleNodeCollapse = useCallback((node, forceState, revealEntityId) => {
    const nodesToProcess = Array.isArray(node) ? node : [node]

    if (nodesToProcess.length === 0) {
      return
    }

    setCollapsed((prev) => {
      const newState = nodesToProcess.reduce((acu, nodeObj) => {
        let newCollapseState

        if (forceState != null) {
          newCollapseState = forceState === true
        } else {
          const currentCollapsed = prev[node.id] == null ? getEntityTreeCollapsedDefaultValue(node) : prev[node.id]
          newCollapseState = !currentCollapsed
        }

        acu[nodeObj.id] = newCollapseState

        return acu
      }, {})

      const targetNodeReveal = listRef.current.entityNodesById[revealEntityId]
      const isGroupNode = targetNodeReveal != null ? checkIsGroupNode(targetNodeReveal) : false
      const isGroupEntityNode = targetNodeReveal != null ? checkIsGroupEntityNode(targetNodeReveal) : false
      let isEntity = false

      if (targetNodeReveal != null) {
        isEntity = isGroupNode ? isGroupEntityNode : true
      }

      if (revealEntityId != null && isEntity) {
        pendingAfterCollapsingRef.current.push(revealEntityId)
      }

      return {
        ...prev,
        ...newState
      }
    })
  }, [])

  const collapseHandler = useCallback((idOrShortid, state, options = {}) => {
    const { parents, self = true, revealEntityId } = options
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

    toggleNodeCollapse(toCollapse.map((folder) => {
      return listRef.current.entityNodesById[folder._id]
    }), state, revealEntityId)
  }, [listRef, toggleNodeCollapse])

  const tryToScrollToListEl = useCallback(async (elId) => {
    let el
    let lastEndIndex

    // NOTE: this logic is needed to scroll and trigger the load of not visible elements,
    // this is needed in order for the reveal to work, the target el to reveal is probably not loaded yet
    // and we must scroll until it is loaded in order to be revealed.
    // the logic here is a bit hacky because it assumes some things about the way the
    // virtual list works, it assumes that list is virtualized but nodes are not removed
    // after they are first rendered, this is fine, but if this was the case not all checks
    // here will be not appropriate, so if at some point we change how the virtual list work
    // we should review this logic again
    while (el == null) {
      el = document.getElementById(elId)

      if (el != null) {
        el.scrollIntoView({ block: 'center', inline: 'center' })
      } else {
        const [, endIndex] = listRef.current.virtualList.getVisibleRange()

        // we hit the end of list
        if (lastEndIndex === endIndex) {
          break
        }

        listRef.current.virtualList.scrollTo(endIndex)

        // delay a bit the next iteration so there is some time for the
        // list to render
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }, [])

  useEffect(() => {
    // we want to trigger this effect anytime collapsedNodes is changed
    if (pendingAfterCollapsingRef.current.length === 0) {
      return
    }

    const pending = pendingAfterCollapsingRef.current

    while (pending.length > 0) {
      const entityId = pending.shift()
      const nodeToReveal = listRef.current.entityNodesById[entityId]

      if (!nodeToReveal) {
        return
      }

      const entityNodeId = getNodeTitleDOMId(nodeToReveal.data)

      if (!entityNodeId) {
        return
      }

      tryToScrollToListEl(entityNodeId)
    }
  }, [collapsedNodes, tryToScrollToListEl])

  return {
    collapsedInfo,
    toggleNodeCollapse,
    collapseHandler
  }
}
