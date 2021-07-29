import { useContext, useRef, useCallback } from 'react'
import classNames from 'classnames'
import composeRefs from '@seznam/compose-react-refs'
import EntityTreeContext from './EntityTreeContext'
import NodeSelect from './NodeSelect'
import { NodeContextMenu } from './ContextMenu'
import { renderEntityTreeItemComponents, resolveEntityTreeIconStyle } from './utils'
import { entitySets } from '../../lib/configuration'
import styles from './EntityTree.css'

const EntityNode = ({ id, titleId, node, depth, isDragging, connectDragging }) => {
  const {
    paddingByLevel,
    selectable,
    allEntities,
    contextMenu,
    contextMenuRef,
    isNodeActive,
    getContextMenuItems,
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

  const name = node.name
  const entity = node.data
  const entityStyle = resolveEntityTreeIconStyle(entity, {})
  const isActive = isNodeActive(node)
  const isContextMenuActive = contextMenu != null && contextMenu.id === entity._id

  const containerClass = classNames(styles.link, {
    [styles.focused]: isContextMenuActive,
    [styles.active]: isActive && !isDragging,
    [styles.dragging]: isDragging
  })

  const displayContainerClass = classNames(styles.nodeBoxItemContent, {
    [styles.dragging]: isDragging
  })

  const iconClass = classNames(
    styles.entityIcon,
    'fa',
    entityStyle || (entitySets[entity.__entitySet].faIcon || styles.entityDefaultIcon)
  )

  const selectId = `select-${node.id}`

  return (
    <label
      key={entity._id}
      id={id}
      className={containerClass}
      htmlFor={selectId}
      style={{ display: 'block', userSelect: 'none', paddingLeft: `${(depth + 1) * paddingByLevel + 0.6}rem` }}
      onClick={() => !selectable && onNodeClick(node)}
      onContextMenu={(ev) => onContextMenu(ev, entity)}
    >
      {renderEntityTreeItemComponents('container', { entity, entities: allEntities }, [
        <div
          ref={composeRefs(titleRef, connectDragging)}
          key={`container-entity-${name}`}
          id={titleId}
          className={displayContainerClass}
        >
          <NodeSelect id={selectId} node={node} />
          <i key='entity-icon' className={iconClass} />
          <a key='entity-name'>{entity.name + (entity.__isDirty ? '*' : '')}</a>
          {renderEntityTreeItemComponents('right', { entity, entities: allEntities })}
        </div>,
        <NodeContextMenu
          ref={contextMenuRef}
          key={`context-menu-${name}`}
          node={node}
          getContextMenuItems={getContextMenuItems}
          getCoordinates={getCoordinates}
        />
      ])}
    </label>
  )
}

export default EntityNode
