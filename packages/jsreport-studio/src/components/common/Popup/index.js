import React, { useRef, useEffect } from 'react'
import composeRefs from '@seznam/compose-react-refs'
import styles from './Popup.css'

const Popup = React.forwardRef(function Popup (props, externalRef) {
  const { open, onRequestClose, position = {}, children } = props
  const containerRef = useRef(null)

  useEffect(() => {
    const tryHide = (ev) => {
      let shouldStop = false

      if (ev != null && containerRef.current != null) {
        shouldStop = containerRef.current.parentNode.contains(ev.target)
      }

      if (shouldStop) {
        return
      }

      if (open) {
        onRequestClose()
      }
    }

    const tryHideFromKey = (ev) => {
      // ESC key
      if (ev.which === 27) {
        tryHide()
      }
    }

    window.addEventListener('click', tryHide, true)
    window.addEventListener('keydown', tryHideFromKey)

    return () => {
      window.removeEventListener('click', tryHide, true)
      window.removeEventListener('keydown', tryHideFromKey)
    }
  }, [open, onRequestClose])

  return (
    <div
      ref={composeRefs(containerRef, externalRef)}
      className={styles.container}
      style={{
        display: open ? 'block' : 'none',
        top: Object.prototype.hasOwnProperty.call(position, 'top') ? position.top : '100%',
        left: Object.prototype.hasOwnProperty.call(position, 'left') ? position.left : undefined,
        right: Object.prototype.hasOwnProperty.call(position, 'right') ? position.right : '0',
        bottom: Object.prototype.hasOwnProperty.call(position, 'bottom') ? position.bottom : undefined
      }}
    >
      {typeof children === 'function' && children({ open, closeMenu: onRequestClose })}
    </div>
  )
})

export default Popup
