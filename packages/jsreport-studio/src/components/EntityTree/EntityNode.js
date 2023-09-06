import React, { useRef, useCallback } from 'react'
import classNames from 'classnames'
import composeRefs from '@seznam/compose-react-refs'
import NodeSelect from './NodeSelect'
import { renderEntityTreeItemComponents } from './utils'
import { values as configuration } from '../../lib/configuration'
import resolveEntityTreeIconStyle from '../../helpers/resolveEntityTreeIconStyle'
import styles from './EntityTree.css'

const isMac = () => window.navigator.platform.toUpperCase().indexOf('MAC') >= 0

const EntityNode = React.memo(({
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
  isNodeEditSelected,
  onNodeEditSelect,
  onNodeClick,
  onContextMenu
}) => {
  const containerRef = useRef(null)
  const titleRef = useRef(null)

  const onContextShow = useCallback(() => {
    if (containerRef.current == null) {
      return
    }

    containerRef.current.classList.add(styles.focused)
  }, [])

  const onContextHide = useCallback(() => {
    if (containerRef.current == null) {
      return
    }

    containerRef.current.classList.remove(styles.focused)
  }, [])

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

  const containerClass = classNames(styles.link, {
    [styles.active]: isNodeEditSelected ? !isDragging : isActive && !isDragging,
    [styles.dragging]: isDragging
  })

  const displayContainerClass = classNames(styles.nodeBoxItemContent, {
    [styles.dragging]: isDragging
  })

  const iconClass = classNames(
    styles.entityIcon,
    'fa',
    entityStyle || (configuration.entitySets[entity.__entitySet].faIcon || styles.entityDefaultIcon)
  )

  const selectId = `select-${node.id}`

  const editSelectionEnabledProps = {}

  if (main) {
    editSelectionEnabledProps['data-edit-selection-enabled'] = true
    // tabIndex is used to make the label focusable, so it can get focus when click on it
    editSelectionEnabledProps.tabIndex = '-1'
  }

  return (
    <label
      ref={containerRef}
      key={entity._id}
      id={id}
      className={containerClass}
      {...editSelectionEnabledProps}
      htmlFor={selectId}
      style={{ display: 'block', userSelect: 'none', paddingLeft: `${(depth + 1) * paddingByLevel + 0.6}rem` }}
      onClick={(e) => {
        if (selectable) { return }

        // handles ctrl/CMD + click
        if (
          main &&
          ((!isMac() && e.ctrlKey) ||
          (isMac() && e.metaKey) ||
          (e.shiftKey))
        ) {
          onNodeEditSelect(node, e.shiftKey === true)
        } else {
          onNodeClick(node)
        }
      }}
      onContextMenu={(ev) => onContextMenu(ev, {
        node,
        getCoordinates,
        onShow: onContextShow,
        onHide: onContextHide
      })}
    >
      <div
        ref={composeRefs(titleRef, connectDragging)}
        key={`container-entity-${name}`}
        id={titleId}
        className={displayContainerClass}
      >
        <NodeSelect id={selectId} node={node} />
        <i key='entity-icon' className={iconClass} />
        <a key='entity-name'>{entity.name + (entity.__isDirty ? '*' : '')}</a>
        {renderEntityTreeItemComponents('right', { entity })}
      </div>
    </label>
  )
})

export default EntityNode
