import React, { useState, useRef, useCallback } from 'react'
import classNames from 'classnames'
import Popup from '../common/Popup'
import styles from './Preview.css'

const Preview = (props) => {
  const { tabs = [], renderActions, activeTab, onActiveTabChange, children } = props
  const [actionsMenuActive, setActionsMenuActive] = useState(false)
  const actionsMenuTriggerRef = useRef(null)
  const actionsMenuContainerRef = useRef(null)

  const shouldRenderTabs = tabs.length > 0 || renderActions != null

  const tabElements = tabs.map((t) => {
    const isActive = activeTab === t.name

    const previewTabClass = classNames(styles.previewTitle, {
      [styles.active]: isActive
    })

    let titleIconEl = ''

    if (t.icon != null) {
      titleIconEl = (
        <span className={styles.previewTitleIcon}>
          <i className={`fa ${t.icon || ''}`} />&nbsp;
        </span>
      )
    }

    return (
      <div
        key={`${t.name}-title`}
        className={previewTabClass}
        onClick={() => onActiveTabChange && onActiveTabChange(t.name)}
      >
        <span>{titleIconEl}{t.title}</span>
      </div>
    )
  })

  const handleActionsMenuTrigger = useCallback((e) => {
    e.stopPropagation()

    if (
      actionsMenuTriggerRef.current == null ||
      actionsMenuContainerRef.current == null
    ) {
      return
    }

    if (
      actionsMenuTriggerRef.current.contains(e.target) &&
      !actionsMenuContainerRef.current.contains(e.target)
    ) {
      setActionsMenuActive((prevActionsMenuActive) => !prevActionsMenuActive)
    }
  }, [])

  return (
    <div className={styles.previewContainer}>
      {shouldRenderTabs && (
        <div className={styles.previewTitles}>
          {tabElements}
          {renderActions != null && (
            <div
              key='preview-actions'
              ref={actionsMenuTriggerRef}
              className={styles.previewTitle}
              onClick={handleActionsMenuTrigger}
            >
              <span title='Preview actions menu'>...</span>
              <Popup
                ref={actionsMenuContainerRef}
                open={actionsMenuActive}
                onRequestClose={() => setActionsMenuActive(false)}
              >
                {(itemProps) => {
                  if (!itemProps.open) {
                    return
                  }

                  return renderActions({ closeMenu: itemProps.closeMenu })
                }}
              </Popup>
            </div>
          )}
        </div>
      )}
      <div className={`block ${styles.previewContent}`}>
        {children}
      </div>
    </div>
  )
}

export default Preview
