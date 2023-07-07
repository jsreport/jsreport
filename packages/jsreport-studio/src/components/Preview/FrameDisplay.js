import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import composeRefs from '@seznam/compose-react-refs'
import styles from './FrameDisplay.css'
import { values as configuration } from '../../lib/configuration'

const FrameDisplay = React.forwardRef(function FrameDisplay (props, externalRef) {
  const { src, styles: frameStyles = {}, blobCleanup = true, onLoad } = props
  const containerRef = useRef(null)
  const overlayRef = useRef(null)
  const iframeRef = useRef(null)
  const blobCleanupRef = useRef(blobCleanup)

  const handleOnLoad = useCallback(() => {
    applyStylesToIframe(containerRef.current, iframeRef.current, frameStyles)

    if (onLoad) {
      onLoad(src)
    }
  }, [src, frameStyles, onLoad])

  useLayoutEffect(function handleRefUpdate () {
    blobCleanupRef.current = blobCleanup
  })

  useEffect(function handleSubscribeToSplitPaneEvents () {
    const showOverlay = () => {
      if (overlayRef.current) {
        overlayRef.current.style.display = 'block'
      }

      if (iframeRef.current) {
        iframeRef.current.style.display = 'none'
      }
    }

    const hideOverlay = () => {
      if (overlayRef.current) {
        overlayRef.current.style.display = 'none'
      }

      if (iframeRef.current) {
        iframeRef.current.style.display = 'block'
      }
    }

    const unsubscribe = configuration.subscribeToSplitPaneEvents(containerRef.current, {
      change: showOverlay,
      dragFinished: hideOverlay
    })

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(function handleStylesChange () {
    const reapplyStyles = () => {
      applyStylesToIframe(containerRef.current, iframeRef.current, {
        backgroundColor: frameStyles.backgroundColor,
        color: frameStyles.color
      })
    }

    reapplyStyles()

    let unsubscribeThemeChange

    if (!frameStyles.backgroundColor || !frameStyles.color) {
      const themeChangeListener = () => {
        // we call the apply styles some time later to give the browser
        // some time to paint the new styles, we need to reapply styles
        // when the container node was updated with the theme change,
        // otherwise it will read invalid colors
        setTimeout(reapplyStyles, 100)
      }

      unsubscribeThemeChange = configuration.subscribeToThemeChange(themeChangeListener)
    }

    return () => {
      if (unsubscribeThemeChange) {
        unsubscribeThemeChange()
      }
    }
  }, [frameStyles.backgroundColor, frameStyles.color])

  useEffect(function handleCleanBlobUrl () {
    return () => {
      const isBlobUrl = src != null && src.indexOf('blob:') === 0

      if (!isBlobUrl || !blobCleanupRef.current) {
        return
      }

      window.URL.revokeObjectURL(src)
    }
  }, [src])

  return (
    <div ref={containerRef} className={`block ${styles.container}`}>
      <div ref={overlayRef} style={{ display: 'none' }} />
      <iframe
        ref={composeRefs(iframeRef, externalRef)}
        frameBorder='0'
        onLoad={handleOnLoad}
        allowFullScreen
        width='100%'
        height='100%'
        src={src == null ? 'about:blank' : src}
        className='block-item'
      />
    </div>
  )
})

function applyStylesToIframe (containerNode, iframeNode, styles) {
  if (!containerNode || !iframeNode || !iframeNode.contentDocument || !iframeNode.contentDocument.head) {
    return
  }

  try {
    const style = document.createElement('style')
    const targetStyles = {}

    const previousStyle = iframeNode.contentDocument.head.querySelector('style[data-jsreport-theme-styles]')

    if (!styles || !styles.backgroundColor || !styles.color) {
      const containerStyles = window.getComputedStyle(containerNode, null)

      if (!styles || !styles.backgroundColor) {
        targetStyles.backgroundColor = containerStyles.getPropertyValue('background-color')
      }

      if (!styles || !styles.color) {
        targetStyles.color = containerStyles.getPropertyValue('color')
      }
    }

    if (!targetStyles.backgroundColor) {
      targetStyles.backgroundColor = styles.backgroundColor
    }

    if (!targetStyles.color) {
      targetStyles.color = styles.color
    }

    style.dataset.jsreportThemeStyles = true
    style.setAttribute('type', 'text/css')

    style.appendChild(document.createTextNode(`
      html, body {
        background-color: ${targetStyles.backgroundColor};
        color: ${targetStyles.color};
      }
    `))

    iframeNode.contentDocument.head.insertBefore(
      style,
      iframeNode.contentDocument.head.firstChild
    )

    if (previousStyle) {
      previousStyle.remove()
    }
  } catch (e) {
    // ignore error, because it was just cross-origin issues when
    // we are not able to access the DOM of iframe
    console.warn('Error wile trying to apply styles to iframe (FrameDisplay)', e)
  }
}

export default FrameDisplay
