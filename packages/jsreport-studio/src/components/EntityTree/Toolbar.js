import React, { useState, useEffect, useRef } from 'react'
import EntityTreeButton from './EntityTreeButton'
import { entityTreeToolbarComponents } from '../../lib/configuration.js'
import styles from './EntityTree.css'

const Toolbar = (props) => {
  const { setFilter, onNewEntity } = props

  if (entityTreeToolbarComponents.single.length === 0 && entityTreeToolbarComponents.group.length === 0) {
    return null
  }

  const singleComponents = entityTreeToolbarComponents.single
  const groupComponents = entityTreeToolbarComponents.group

  const commonProps = {
    setFilter,
    onNewEntity
  }

  const toolbarElements = singleComponents.map((p, i) => {
    return React.createElement(p, {
      key: `EntityToolbar${i}`,
      ...commonProps
    })
  })

  if (groupComponents.length > 0) {
    toolbarElements.push(
      <ToolbarGroup
        key={`EntityToolbar${toolbarElements.length}`}
        {...commonProps}
        items={groupComponents}
      />
    )
  }

  return (
    <div className={styles.toolbar}>
      {toolbarElements}
    </div>
  )
}

const ToolbarGroup = ({ items, setFilter, onNewEntity }) => {
  const [isActive, setActive] = useState(false)
  const itemsContainerRef = useRef(null)

  const closeMenu = () => {
    setActive(false)
  }

  useEffect(() => {
    function handleGlobalClick (ev) {
      const LEFT_CLICK = 1
      const button = ev.which || ev.button

      if (!isActive || !itemsContainerRef.current) {
        return
      }

      if (ev.target.type === 'file') {
        return
      }

      ev.preventDefault()

      if (!itemsContainerRef.current.contains(ev.target)) {
        ev.stopPropagation()

        // handle quirk in firefox that fires and additional click event during
        // contextmenu event, this code prevents the context menu to
        // inmediatly be closed after being shown in firefox
        if (button === LEFT_CLICK) {
          closeMenu()
        }
      }
    }

    window.addEventListener('click', handleGlobalClick, true)

    return () => {
      window.removeEventListener('click', handleGlobalClick, true)
    }
  }, [isActive])

  return (
    <div
      title='more options...'
      className={styles.toolbarGroup}
    >
      <EntityTreeButton
        onClick={() => setActive((prev) => !prev)}
      >
        <span style={{ display: 'inline-block' }}>
          <i className='fa fa-bars' />
        </span>
      </EntityTreeButton>
      {isActive && (
        <div ref={itemsContainerRef} className={styles.contextMenuContainer}>
          <div className={styles.contextMenu}>
            {items.map((p, i) => (
              <div
                key={`EntityToolbarGroupItem${i}`}
                className={`${styles.contextButton}`}
              >
                {React.createElement(p, {
                  setFilter,
                  onNewEntity,
                  closeMenu
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Toolbar
