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
  let currentClass = styles.standard

  for (let i = 0; i < logsLength; i++) {
    const log = logs[i]
    const relativeTime = `+${prevLog == null ? '0' : String(getRelativeTimestamp(prevLog.timestamp, log.timestamp))}`
    const logDate = new Date(log.timestamp)

    if (prevLog != null && prevLog.previousOperationId !== log.previousOperationId) {
      if (currentClass === styles.standard) {
        currentClass = styles.alternative
      } else {
        currentClass = styles.standard
      }
    }

    const logClassificationClass = currentClass

    logsElements.push(
      <div id={getLogNodeId(i)} className={`${styles.profileLogItem} ${logClassificationClass}`} key={i}>
        <span className={`${styles.profileLogItemLevel} ${styles[log.level]} ${log.meta != null && log.meta.userLevel ? styles.userLevel : ''}`}>{log.level}</span>
        <span
          className={styles.profileLogItemTime}
          title={new Intl.DateTimeFormat(navigator.language,
            {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric',
              fractionalSecondDigits: 3,
              hour12: false
            }
          )
            .format(logDate)}
        >
          {relativeTime}
        </span>
        <span
          className={`${styles.profileLogItemMessage} ${log.meta != null && log.meta.userLevel ? styles.userLevel : ''}`}
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
