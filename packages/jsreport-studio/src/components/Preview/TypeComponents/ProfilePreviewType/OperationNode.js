import React, { Fragment, useState, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { Handle } from '@xyflow/react'
import fileSaver from 'filesaver.js-npm'
import TimeSpent from './TimeSpent'
import { actions as progressActions } from '../../../../redux/progress'
import styles from '../../Preview.css'
import { openModal } from '../../../../helpers/openModal'

const OperationNode = React.memo(function OperationNode (props) {
  const {
    id,
    data,
    isConnectable,
    targetPosition = 'top',
    sourcePosition = 'bottom'
  } = props

  const {
    startNode, time, timeCost, error, renderResult,
    mainEndNode, end, isFullRequestProfilingEnabled
  } = data

  const dispatch = useDispatch()

  const [downloading, setDownloading] = useState(false)

  const progressStart = useCallback(() => {
    return dispatch(progressActions.start())
  }, [dispatch])

  const progressStop = useCallback(() => {
    return dispatch(progressActions.stop())
  }, [dispatch])

  const handleDownloadRenderResultClick = useCallback(async () => {
    if (!isFullRequestProfilingEnabled) {
      return openModal('This request was performed in the standard mode. You can download the report outputs only when the full request profiling enabled.')
    }

    if (renderResult == null || renderResult.getContent == null || downloading) {
      return
    }

    setDownloading(true)

    progressStart()

    // delay the execution a bit to have a chance to show the animation,
    // this is useful when the downloaded file is a bit big
    setTimeout(() => {
      try {
        const { res } = renderResult.getContent()
        if (res.content.tooLarge === true) {
          openModal('The response is too large to store in the profile. The response size profile can handle can be increased in the config profiler.maxDiffSize=100mb')
        } else {
          fileSaver.saveAs(res.content, `${res.meta.reportName}.${res.meta.fileExtension}`)
        }
      } finally {
        progressStop()
        setDownloading(false)
      }
    }, 200)
  }, [downloading, renderResult, isFullRequestProfilingEnabled, progressStart, progressStop])

  const Download = (renderResult) => (
    <button
      className={`${styles.profileButtonAction} ${renderResult.getContent == null ? 'disabled' : ''}`}
      title={renderResult.getContent == null ? 'render result not available' : 'download render result'}
      disabled={renderResult.getContent == null}
      onClick={handleDownloadRenderResultClick}
    >
      <i className='fa fa-download' />
    </button>
  )

  let type = 'standard'

  if (renderResult != null) {
    type = 'download'
  } else if (error != null && end) {
    type = 'error'
  } else if (startNode) {
    type = 'start'
  }

  const renderNodeContent = () => {
    if (type === 'download') {
      return Download(renderResult)
    } else if (type === 'error') {
      return <span className={styles.profileEndNodeLabel} title='report ended with error'><i className='fa fa-times' /></span>
    } else if (type === 'start') {
      let icon = 'bars-staggered'

      if (startNode === 'profile') {
        icon = 'hourglass-start'
      } else if (startNode === 'render') {
        icon = 'play'
      }

      return <span><i className={`fa fa-${icon} ${styles.profileStartNodeLabel}`} /></span>
    }

    return <span>{data.label}</span>
  }

  const renderTimeSpent = () => {
    if (type === 'download' || type === 'error') {
      if (!mainEndNode) {
        return
      }

      const props = {
        time,
        timeCost: null,
        icon: <i className='fa fa-hourglass-end' />
      }

      return <TimeSpent {...props} />
    }

    return <TimeSpent time={time} timeCost={timeCost} />
  }

  return (
    // eslint-disable-next-line
    <Fragment>
      <Handle type='target' position={targetPosition} isConnectable={isConnectable} />
      <div id={id} className={type === 'standard' ? styles.profileStandardNodeContent : ''}>
        {renderNodeContent()}
      </div>
      <Handle type='source' position={sourcePosition} isConnectable={isConnectable} />
      {renderTimeSpent()}
    </Fragment>
  )
})

export default OperationNode
