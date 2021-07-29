import React, { Fragment, useState, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { Handle } from 'react-flow-renderer'
import fileSaver from 'filesaver.js-npm'
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

  const { time, timeCost, error, renderResult, end, isFullRequestProfilingEnabled } = data

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
        fileSaver.saveAs(res.content, `${res.meta.reportName}.${res.meta.fileExtension}`)
      } finally {
        progressStop()
        setDownloading(false)
      }
    }, 200)
  }, [downloading, renderResult, isFullRequestProfilingEnabled, progressStart, progressStop])

  return (
    // eslint-disable-next-line
    <Fragment>
      <Handle type='target' position={targetPosition} isConnectable={isConnectable} />
      <div id={id}>
        {renderResult != null
          ? (
            <button
              className={`${styles.profileButtonAction} ${renderResult.getContent == null ? 'disabled' : ''}`}
              title={renderResult.getContent == null ? 'render result not available' : 'download render result'}
              disabled={renderResult.getContent == null}
              onClick={handleDownloadRenderResultClick}
            >
              <i className='fa fa-download' />
            </button>
            )
          : (
              error != null && end ? <span className={styles.profileEndNodeLabel} title='report ended with error'><i className='fa fa-times' /></span> : <span>{data.label}</span>
            )}
      </div>
      <Handle type='source' position={sourcePosition} isConnectable={isConnectable} />
      <div
        className={`${styles.profileExecutionTimeCost} ${getTimeCostCategoryClass(timeCost * 100)}`}
        style={{ width: `${timeCost * 100}%` }}
      >
        &nbsp;
      </div>
      {/* eslint-disable-next-line */}
      <Fragment>
        <div className={styles.profileExecutionTime}>
          <span className={styles.profileExecutionTimeLabel}>{time}ms</span>
        </div>
        <div className={styles.profileExecutionTimeCover} title={`${time}ms`}>
          &nbsp;
        </div>
      </Fragment>
    </Fragment>
  )
})

function getTimeCostCategoryClass (percentageCost) {
  if (percentageCost < 20) {
    return styles.low
  } else if (percentageCost < 60) {
    return styles.medium
  } else {
    return styles.high
  }
}

export default OperationNode
