import React, { useCallback } from 'react'
import getLogNodeId from './getLogNodeId'
import styles from '../../Preview.css'

const LogsDisplay = React.memo(function LogsDisplay (props) {
  const { logs } = props

  const getRelativeTimestamp = useCallback((prevTimestamp, currentTimestamp) => {
    return currentTimestamp - prevTimestamp
  }, [])

  const logsLength = logs.length
  const logsElements = []
  let prevLog

  for (let i = 0; i < logsLength; i++) {
    const log = logs[i]
    const relativeTime = `+${prevLog == null ? '0' : String(getRelativeTimestamp(prevLog.timestamp, log.timestamp))}`

    logsElements.push(
      <div id={getLogNodeId(i)} className={styles.profileLogItem} key={i}>
        <span className={styles.profileLogItemLevel}>{log.level}</span>
        <span
          className={styles.profileLogItemTime}
          title={relativeTime}
        >
          {relativeTime}
        </span>
        <span
          className={styles.profileLogItemMessage}
          title={log.message}
        >
          {log.message}
        </span>
      </div>
    )

    prevLog = log
  }

  return (
    <div className={styles.profileLogs}>
      {logsElements}
    </div>
  )
})

export default LogsDisplay
