import React, { useRef, useCallback } from 'react'
import classNames from 'classnames'
import NodeSelect from './NodeSelect'
import { renderEntityTreeItemComponents } from './utils'
import { values as configuration } from '../../lib/configuration'
import { checkIsGroupEntityNode } from '../../helpers/checkEntityTreeNodes'
import resolveEntityTreeIconStyle from '../../helpers/resolveEntityTreeIconStyle'
import styles from './EntityTree.css'

const isMac = () => window.navigator.platform.toUpperCase().indexOf('MAC') >= 0

const GroupNode = React.memo(({
  main,
  selectable,
  paddingByLevel,
  id,
  titleId,
  node,
  depth,
  draggable,
  isDragging,
  connectDragging,
  renderTree,
  isActive,
  isCollapsed,
  isNodeEditSelected,
  onNewEntity,
  onNodeEditSelect,
  onNodeClick,
  onContextMenu
}) => {
  const containerRef = useRef(null)
  const titleRef = useRef(null)

  const groupIsEntity = checkIsGroupEntityNode(node)

  const onContextShow = useCallback(() => {
    if (!groupIsEntity) {
      return
    }

    if (containerRef.current == null) {
      return
    }

    containerRef.current.classList.add(styles.focused)
  }, [groupIsEntity])

  const onContextHide = useCallback(() => {
    if (!groupIsEntity) {
      return
    }

    if (containerRef.current == null) {
      return
    }

    containerRef.current.classList.remove(styles.focused)
  }, [groupIsEntity])

  const getCoordinates = useCallback(() => {
    const dimensions = titleRef.current.getBoundingClientRect()

    return {
      x: dimensions.x != null ? dimensions.x : dimensions.left,
      y: (dimensions.y != null ? dimensions.y : dimensions.top) + dimensions.height
    }
  }, [])

  const nodeId = node.id
  const name = node.name
  const items = node.items

  const groupStyle = node.data != null
    ? resolveEntityTreeIconStyle(node.data, {
        isCollapsed
      })
    : null

  const containerClass = classNames(styles.link, {
    [styles.active]: isNodeEditSelected ? !isDragging : isActive && !isDragging,
    [styles.dragging]: isDragging
  })

  const displayContainerClass = classNames(styles.nodeBoxItemContent, {
    [styles.dragging]: isDragging
  })

  const titleClass = classNames(styles.nodeTitle, {
    [styles.collapsed]: isCollapsed
  })

  const iconClass = classNames(
    styles.entityIcon,
    'fa',
    groupStyle
  )

  const itemsContainerClass = classNames(styles.nodeContainer, {
    [styles.dragging]: isDragging,
    [styles.collapsed]: isCollapsed
  })

  const editSelectionEnabledProps = {}

  if (main && groupIsEntity) {
    editSelectionEnabledProps['data-edit-selection-enabled'] = true
    // tabIndex is used to make the label focusable, so it can get focus when click on it
    editSelectionEnabledProps.tabIndex = '-1'
  }

  return (
    <div id={id} data-collapsed={isCollapsed}>
      <div
        ref={containerRef}
        className={containerClass}
        {...editSelectionEnabledProps}
        style={{ paddingLeft: `${(depth + 1) * paddingByLevel}rem` }}
        onClick={(ev) => {
          if (selectable) { return }

          ev.preventDefault()
          ev.stopPropagation()

          // handles ctrl/CMD + click
          if (
            main &&
            groupIsEntity &&
            ((!isMac() && ev.ctrlKey) ||
            (isMac() && ev.metaKey) ||
            (ev.shiftKey))
          ) {
            onNodeEditSelect(node, ev.shiftKey === true)
          } else {
            onNodeClick(node)
          }
        }}
        onContextMenu={(ev) => {
          if (!groupIsEntity) {
            ev.preventDefault()
            ev.stopPropagation()
          } else {
            onContextMenu(ev, {
              node,
              getCoordinates,
              onShow: onContextShow,
              onHide: onContextHide
            })
          }
        }}
      >
        <NodeSelect node={node} />
        <span
          ref={titleRef}
          id={titleId}
          className={titleClass}
          onClick={(ev) => {
            if (!selectable) { return }
            ev.preventDefault()
            ev.stopPropagation()
            onNodeClick(node)
          }}
        >
          <i className={styles.nodeTitleIcon} />
          <div
            ref={connectDragging}
            className={displayContainerClass}
          >
            {groupStyle && (
              <i key='entity-icon' className={iconClass} />
            )}
            {name + (groupIsEntity && node.data.__isDirty ? '*' : '')}
          </div>
        </span>
        {renderEntityTreeItemComponents('groupRight', node.data)}
        {node.isEntitySet && !selectable && (
          <a
            className={styles.add}
            title={`New ${
              configuration.entitySets[node.name] && configuration.entitySets[node.name].visibleName
              ? (
                configuration.entitySets[node.name].visibleName
              )
              : node.name
            }`}
            onClick={(ev) => {
              ev.preventDefault()
              ev.stopPropagation()
              onNewEntity(undefined, name)
            }}
          />
        )}
      </div>
      <div className={itemsContainerClass}>
        {!isCollapsed && renderTree(items, depth + 1, nodeId, draggable)}
      </div>
    </div>
  )
})

export default GroupNode
