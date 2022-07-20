import { useContext, useRef, useCallback } from 'react'
import classNames from 'classnames'
import EntityTreeContext from './EntityTreeContext'
import NodeSelect from './NodeSelect'
import { NodeContextMenu } from './ContextMenu'
import { renderEntityTreeItemComponents, resolveEntityTreeIconStyle, checkIsGroupEntityNode } from './utils'
import { entitySets } from '../../lib/configuration'
import styles from './EntityTree.css'

const isMac = () => window.navigator.platform.toUpperCase().indexOf('MAC') >= 0

const GroupNode = ({ id, titleId, node, depth, draggable, isDragging, connectDragging, renderTree }) => {
  const {
    main,
    paddingByLevel,
    selectable,
    contextMenu,
    contextMenuRef,
    getContextMenuItems,
    isNodeCollapsed,
    hasEditSelection,
    isNodeEditSelected,
    isNodeActive,
    onNewEntity,
    onNodeEditSelect,
    onNodeClick,
    onContextMenu
  } = useContext(EntityTreeContext)

  const titleRef = useRef(null)

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
  const isCollapsed = isNodeCollapsed(node)
  const isActive = isNodeActive(node)

  const groupStyle = node.data != null
    ? resolveEntityTreeIconStyle(node.data, {
        isCollapsed
      })
    : null

  const groupIsEntity = checkIsGroupEntityNode(node)
  const isContextMenuActive = contextMenu != null && groupIsEntity && contextMenu.id === node.data._id

  const containerClass = classNames(styles.link, {
    [styles.focused]: isContextMenuActive,
    [styles.active]: hasEditSelection() ? isNodeEditSelected(node) && !isDragging : isActive && !isDragging,
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
    <div id={id}>
      <div
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
            (isMac() && ev.metaKey))
          ) {
            onNodeEditSelect(node)
          } else {
            onNodeClick(node)
          }
        }}
        onContextMenu={(ev) => {
          if (!groupIsEntity) {
            ev.preventDefault()
            ev.stopPropagation()
          } else {
            onContextMenu(ev, node.data)
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
        {renderEntityTreeItemComponents('groupRight', node.data, undefined)}
        {node.isEntitySet && !selectable && (
          <a
            className={styles.add}
            title={`New ${
              entitySets[node.name] && entitySets[node.name].visibleName
              ? (
                entitySets[node.name].visibleName
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
        {groupIsEntity && (
          <NodeContextMenu
            ref={contextMenuRef}
            node={node}
            getContextMenuItems={getContextMenuItems}
            getCoordinates={getCoordinates}
          />
        )}
      </div>
      <div className={itemsContainerClass}>
        {renderTree(items, depth + 1, nodeId, draggable)}
      </div>
    </div>
  )
}

export default GroupNode
