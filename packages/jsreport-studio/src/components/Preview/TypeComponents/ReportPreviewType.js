import React, { useEffect, useMemo, useRef } from 'react'
import FrameDisplay from '../FrameDisplay'
import { values as configuration } from '../../../lib/configuration'
import useOpenErrorLine from '../useOpenErrorLine'

const ReportPreviewType = React.memo(function ReportPreviewType (props) {
  const { data } = props
  const { reportSrc, reportFile, profileErrorEvent } = data
  const goToErrorLineContainerRef = useRef(null)
  const iframeRef = useRef(null)
  const openErrorLine = useOpenErrorLine()
  const displayGoToErrorLine = profileErrorEvent != null && errorHasLineInfo(profileErrorEvent)

  const frameStyles = useMemo(() => {
    if (reportFile == null) {
      return
    }

    let styles

    // eslint-disable-next-line
    for (const resolver of configuration.reportPreviewStyleResolvers) {
      const result = resolver(reportFile)

      if (result != null) {
        styles = result
        break
      }
    }

    return styles
  }, [reportFile])

  useEffect(function handleSubscribeToSplitPaneEvents () {
    if (!displayGoToErrorLine) {
      return
    }

    const showGoToErrorLine = () => {
      if (goToErrorLineContainerRef.current) {
        goToErrorLineContainerRef.current.style.display = 'block'
      }
    }

    const hideGoToErrorLine = () => {
      if (goToErrorLineContainerRef.current) {
        goToErrorLineContainerRef.current.style.display = 'none'
      }
    }

    const unsubscribe = configuration.subscribeToSplitPaneEvents(goToErrorLineContainerRef.current, {
      change: hideGoToErrorLine,
      dragFinished: showGoToErrorLine
    })

    return () => {
      unsubscribe()
    }
  }, [displayGoToErrorLine])

  return (
    <div className='block' style={{ position: 'relative', overflowX: 'auto' }}>
      {displayGoToErrorLine && (
        <div ref={goToErrorLineContainerRef} style={{ position: 'absolute', right: '30px', bottom: '50px', zIndex: 1000 }}>
          <div style={{ width: '80px' }}>
            <button
              className='button confirmation'
              onClick={() => openErrorLine(profileErrorEvent)}
            >
              Go to error line
            </button>
          </div>
        </div>
      )}
      <FrameDisplay
        ref={iframeRef}
        src={reportSrc}
        styles={frameStyles}
      />
    </div>
  )
})

function errorHasLineInfo (error) {
  if (
    error == null ||
    error.entity == null ||
    (error.property !== 'content' && error.property !== 'helpers') ||
    error.lineNumber == null
  ) {
    return false
  }

  return true
}

export default ReportPreviewType
