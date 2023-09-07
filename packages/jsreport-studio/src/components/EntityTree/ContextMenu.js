import React, { useState, useCallback, useContext, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useSelector } from 'react-redux'
import classNames from 'classnames'
import EntityTreeContext from './EntityTreeContext'
import getVisibleEntitySetsInTree from '../../helpers/getVisibleEntitySetsInTree'
import { getAllEntitiesInHierarchy } from './utils'
import { checkIsGroupNode, checkIsGroupEntityNode, checkIsNodeEditSelected } from '../../helpers/checkEntityTreeNodes'
import storeMethods from '../../redux/methods'
import { values as configuration } from '../../lib/configuration'
import styles from './EntityTree.css'

const ContextMenu = React.forwardRef(function ContextMenu ({
  entity,
  node,
  clipboard,
  getCoordinates,
  getContextMenuItems,
  onSetClipboard,
  onReleaseClipboardTo
}, ref) {
  const {
    selectable,
    onNewEntity,
    onOpen,
    onRemove,
    onClone,
    onRename,
    onClearContextMenu,
    onClearEditSelect,
    getEntityNodeById
  } = useContext(EntityTreeContext)

  if (selectable && getContextMenuItems == null) {
    return null
  }

  const editSelection = useSelector((state) => state.editor.editSelection)
  const isNodeEditSelected = checkIsNodeEditSelected(editSelection, node)

  const getNormalizedEditSelection = useCallback((editSelectionParam) => {
    if (editSelectionParam == null) {
      return null
    }

    const normalized = []
    const nodeCache = Object.create(null)
    const childrenCache = Object.create(null)

    const allEntitiesSelected = editSelectionParam.map((selectedId) => storeMethods.getEntityById(selectedId))
    const foldersSelected = allEntitiesSelected.filter((entitySelected) => entitySelected.__entitySet === 'folders')

    for (const folderSelected of foldersSelected) {
      const nodeOfSelected = getEntityNodeById(folderSelected._id)

      nodeCache[folderSelected._id] = nodeOfSelected

      const children = getAllEntitiesInHierarchy(nodeOfSelected)

      childrenCache[folderSelected._id] = children
    }

    for (const entitySelected of allEntitiesSelected) {
      const found = Object.keys(childrenCache).some((folderId) => {
        const children = childrenCache[folderId]
        return children.find((id) => id === entitySelected._id) != null
      })

      if (!found) {
        normalized.push(entitySelected._id)
      }
    }

    return normalized
  }, [getEntityNodeById])

  const isRoot = entity == null
  const isGroup = isRoot ? false : checkIsGroupNode(node) && !checkIsGroupEntityNode(node)
  const isGroupEntity = isRoot ? false : checkIsGroupEntityNode(node)
  const containerStyle = {}

  const menuItems = []

  const editSelectionContextMenu = node != null && isNodeEditSelected && editSelection.length > 1

  const resolverParam = {
    node,
    clipboard,
    entity,
    entitySets: configuration.entitySets,
    editSelection: editSelectionContextMenu ? editSelection : null,
    isRoot,
    isGroup,
    isGroupEntity,
    disabledClassName: styles.disabled,
    getVisibleEntitySetsInTree,
    getAllEntitiesInHierarchy,
    getEntityNodeById,
    getNormalizedEditSelection,
    setClipboard: onSetClipboard,
    releaseClipboardTo: onReleaseClipboardTo,
    onNewEntity,
    onOpen,
    onRename,
    onClone,
    onRemove
  }

  const getEditSelectionMenuItem = () => ({
    key: 'EditSelectionCount',
    title: `${editSelection.length} item(s) selected`,
    icon: 'fa-list',
    onClick: () => false
  })

  if (getContextMenuItems != null) {
    if (editSelectionContextMenu) {
      menuItems.push(getEditSelectionMenuItem())

      menuItems.push({
        key: 'separator-group-edit-selection',
        separator: true
      })
    }

    const customItems = getContextMenuItems(Object.assign({}, resolverParam, {
      isGroupEntity: isGroupEntity != null ? isGroupEntity : false
    }))

    if (customItems != null && customItems.length > 0) {
      menuItems.push(...customItems)
    }
  } else {
    const contextMenuResults = configuration.entityTreeContextMenuItemsResolvers.map((resolver) => {
      return resolver(resolverParam)
    })

    const groupItems = []
    const singleItems = []

    if (editSelectionContextMenu) {
      groupItems.push({
        grouped: true,
        items: [getEditSelectionMenuItem()]
      })
    }

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

            const hasNestedLevels = item.items != null && item.items.length > 0

            const itemClass = classNames(
              styles.contextButton,
              item.className,
              { [styles.hasNestedLevels]: hasNestedLevels }
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

                  // we want to clear also the edit selection when an action is handled
                  onClearEditSelect()
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
                {hasNestedLevels && (
                  <span className={styles.contextButtonNestedIcon} />
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

export default ContextMenu
