import React, { useState, useContext, useRef, useEffect } from 'react'
import classNames from 'classnames'
import ReactDOM from 'react-dom'
import EntityTreeContext from './EntityTreeContext'
import getVisibleEntitySetsInTree from '../../helpers/getVisibleEntitySetsInTree'
import { checkIsGroupNode, checkIsGroupEntityNode, getAllEntitiesInHierarchy } from './utils'
import { entitySets, entityTreeContextMenuItemsResolvers } from '../../lib/configuration'
import styles from './EntityTree.css'

const ContextMenu = React.forwardRef(function ContextMenu ({
  entity,
  node,
  getCoordinates,
  getContextMenuItems
}, ref) {
  const {
    selectable,
    clipboard,
    onNewEntity,
    onOpen,
    onRemove,
    onClone,
    onRename,
    onClearContextMenu,
    onSetClipboard,
    onReleaseClipboardTo
  } = useContext(EntityTreeContext)

  if (selectable && getContextMenuItems == null) {
    return null
  }

  const isRoot = entity == null
  const isGroup = isRoot ? false : checkIsGroupNode(node) && !checkIsGroupEntityNode(node)
  const isGroupEntity = isRoot ? false : checkIsGroupEntityNode(node)
  const containerStyle = {}

  let menuItems = []

  const resolverParam = {
    node,
    clipboard,
    entity,
    entitySets,
    isRoot,
    isGroup,
    isGroupEntity,
    disabledClassName: styles.disabled,
    getVisibleEntitySetsInTree,
    getAllEntitiesInHierarchy,
    setClipboard: onSetClipboard,
    releaseClipboardTo: onReleaseClipboardTo,
    onNewEntity,
    onOpen,
    onRename,
    onClone,
    onRemove
  }

  if (getContextMenuItems != null) {
    menuItems = getContextMenuItems(Object.assign({}, resolverParam, {
      isGroupEntity: isGroupEntity != null ? isGroupEntity : false
    }))
  } else {
    const contextMenuResults = entityTreeContextMenuItemsResolvers.map((resolver) => {
      return resolver(resolverParam)
    })

    const groupItems = []
    const singleItems = []

    contextMenuResults.forEach((r) => {
      if (r == null) {
        return
      }

      if (r.items == null || !Array.isArray(r.items)) {
        return
      }

      if (r.grouped === true && r.items.length > 0) {
        groupItems.push(r)
      } else if (r.items.length > 0) {
        singleItems.push(r)
      }
    })

    groupItems.forEach((group, idx) => {
      if (menuItems.length > 0) {
        menuItems.push({
          key: `separator-group${idx}`,
          separator: true
        })
      }

      group.items.forEach((item) => menuItems.push(item))
    })

    if (menuItems.length > 0 && singleItems.length > 0) {
      menuItems.push({
        key: 'separator-last-group',
        separator: true
      })
    }

    singleItems.forEach((info) => {
      info.items.forEach((item) => menuItems.push(item))
    })
  }

  if (menuItems == null || menuItems.length === 0) {
    return null
  }

  const pointCoordinates = getCoordinates()

  containerStyle.top = pointCoordinates.y + 2
  containerStyle.left = pointCoordinates.x

  return (
    <ContextMenuContainer key={isRoot ? '--ROOT--' : ` item-${node.name}`}>
      <div
        ref={ref}
        key='entity-contextmenu'
        className={styles.contextMenuContainer}
        style={containerStyle}
      >
        <div className={styles.contextMenu}>
          {menuItems.map(function processItem (item) {
            if (item.separator) {
              return (
                <hr key={item.key} />
              )
            }

            const itemClass = classNames(
              styles.contextButton,
              item.className,
              { [styles.hasNestedLevels]: item.items != null && item.items.length > 0 }
            )

            const itemContextMenuContainerClass = classNames(
              styles.contextMenuContainer,
              styles.nestedLevel
            )

            return (
              <div
                key={item.key}
                className={itemClass}
                onClick={(e) => {
                  e.stopPropagation()

                  if (item.onClick != null) {
                    const result = item.onClick()

                    if (result === false) {
                      return
                    }
                  }

                  onClearContextMenu()
                }}
              >
                <i className={`fa ${item.icon}`} />{item.title}
                {item.items != null && item.items.length > 0 && (
                  <div key='entity-contextmenu' className={itemContextMenuContainerClass}>
                    <div className={styles.contextMenu}>
                      {item.items.map(processItem)}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </ContextMenuContainer>
  )
})

const ContextMenuContainer = ({ children }) => {
  const [isMounted, setMounted] = useState(false)
  const nodeRef = useRef(null)

  useEffect(() => {
    nodeRef.current = document.createElement('div')
    nodeRef.current.dataset.contextMenuNode = true
    document.body.appendChild(nodeRef.current)
    setMounted(true)

    return () => {
      document.body.removeChild(nodeRef.current)
    }
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    ReactDOM.createPortal(
      children,
      nodeRef.current
    )
  )
}

export const RootContextMenu = React.forwardRef(function RootContextMenu ({ getContextMenuItems }, ref) {
  const { contextMenu } = useContext(EntityTreeContext)

  if (!contextMenu || contextMenu.id !== '__ROOT__') {
    return null
  }

  return (
    <ContextMenu
      ref={ref}
      getContextMenuItems={getContextMenuItems}
      getCoordinates={() => contextMenu.pointCoordinates}
    />
  )
})

export const NodeContextMenu = React.forwardRef(function NodeContextMenu ({ node, getContextMenuItems, getCoordinates }, ref) {
  const { contextMenu } = useContext(EntityTreeContext)
  const entity = node.data

  if (!contextMenu || contextMenu.id !== entity._id) {
    return null
  }

  return (
    <ContextMenu
      ref={ref}
      node={node}
      entity={entity}
      getContextMenuItems={getContextMenuItems}
      getCoordinates={getCoordinates}
    />
  )
})
